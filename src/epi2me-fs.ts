/* eslint no-console: ["error", { allow: ["log", "info", "debug", "warn", "error"] }] */
/*
 * Copyright (c) 2018 Metrichor Ltd.
 * Author: rpettett
 * When: A long time ago, in a galaxy far, far away
 *
 */

import {
  asOptString,
  asString,
  asNumber,
  asRecord,
  asOptIndex,
  asOptRecord,
  asIndex,
  asDefined,
  asOptFunction,
  asArrayRecursive,
  asOptNumber,
  asRecordRecursive,
  makeString,
  makeBoolean,
  makeNumber,
  isString,
  isUndefined,
  isArray,
  asOptRecordRecursive,
  UnknownFunction,
  JSONValue,
} from 'ts-runtime-typecheck';
import AWS from 'aws-sdk';
import fs from 'fs-extra'; /* MC-565 handle EMFILE & EXDIR gracefully; use Promises */
import { merge } from 'lodash';
import { EOL, homedir } from 'os';
import path from 'path';
import DB from './db';
import { EPI2ME } from './epi2me';
import { Factory } from './factory';
import filestats from './filestats';
import niceSize from './niceSize';
import { ProfileFS as Profile } from './profile-fs';
import PromisePipeline from './promise-pipeline';
import { REST_FS } from './rest-fs';
import { SampleReader } from './sample-reader';
import SessionManager from './session-manager';
import fastqSplitter from './splitters/fastq';
import fastqGzipSplitter from './splitters/fastq-gz';
import { utilsFS as utils } from './utils-fs';
import { gql } from '@apollo/client/core';
import { createInterval, createTimeout } from './timers';
import { Telemetry } from './telemetry';
import { resolve } from 'url';
import { first, map, mapTo, takeUntil } from 'rxjs/operators';
import { recordDelta } from './operators';
import { GraphQLFS } from './graphql-fs';
import { Subject } from 'rxjs';
import { createQueue } from './queue';

import type { MappedFileStats } from './filestats';
import type { DisposeTimer } from './timers';
import type { Readable, Writable } from 'stream';
import type { PromiseResult } from 'aws-sdk/lib/request';
import type { FetchResult } from '@apollo/client/core';
import type { Configuration } from './Configuration';
import type { JSONObject, Dictionary, Index, Optional } from 'ts-runtime-typecheck';
import type { FileStat } from './utils-fs';
import type { ResponseStartWorkflow } from './graphql-types';
import type { InstanceAttribute } from './factory.type';
import type { EPI2ME_OPTIONS } from './epi2me-options';

const networkStreamErrors: WeakSet<Writable> = new WeakSet();

type FileDescriptor = FileStat & { skip?: string; stats?: MappedFileStats };

const rootDir = (): string => {
  /* Windows: C:\Users\rmp\AppData\EPI2ME
   * MacOS:   /Users/rmp/Library/Application Support/EPI2ME
   * Linux:   /home/rmp/.epi2me
   * nb. EPI2ME_HOME environment variable always takes precedence
   */
  const appData =
    process.env.APPDATA ||
    (process.platform === 'darwin' ? path.join(homedir(), 'Library/Application Support') : homedir()); // linux strictly should use ~/.local/share/

  return process.env.EPI2ME_HOME ?? path.join(appData, process.platform === 'linux' ? '.epi2me' : 'EPI2ME');
};

export class EPI2ME_FS extends EPI2ME {
  static version = utils.version;
  static REST = REST_FS;
  static utils = utils;
  static SessionManager = SessionManager;
  static EPI2ME_HOME = rootDir();
  static Profile = Profile;
  static Factory = Factory;
  static GraphQL = GraphQLFS;

  SampleReader: SampleReader;
  uploadsInProgress: { abort(): void }[];
  sessionManager?: SessionManager;
  telemetryLogStream?: fs.WriteStream;
  db?: DB;
  checkForDownloadsRunning?: boolean;
  dirScanInProgress?: boolean;
  uploadMessageQueue?: unknown;
  downloadMessageQueue?: unknown;

  REST: REST_FS;

  private telemetry?: Telemetry;
  private telemetryDestroySignal$?: Subject<void>;

  constructor(optstring: Partial<EPI2ME_OPTIONS> | string) {
    super(optstring); // sets up this.config & this.log

    // overwrite non-fs REST and GQL object
    this.REST = new REST_FS(this.config.options);
    this.graphQL = new GraphQLFS(this.config.options);
    this.SampleReader = new SampleReader();
    this.uploadsInProgress = [];
  }

  async sessionedS3(): Promise<AWS.S3> {
    if (!this.sessionManager) {
      this.sessionManager = this.initSessionManager();
    }

    await this.sessionManager.session();
    return new AWS.S3({
      useAccelerateEndpoint: this.config.options.awsAcceleration === 'on',
    });
  }

  async sessionedSQS(): Promise<AWS.SQS> {
    if (!this.sessionManager) {
      this.sessionManager = this.initSessionManager();
    }

    await this.sessionManager.session();
    return new AWS.SQS();
  }

  async deleteMessage(message: { ReceiptHandle?: string }): Promise<unknown> {
    try {
      const queueURL = await this.discoverQueue(asOptString(this.config.instance.outputQueueName));
      const sqs = await this.sessionedSQS();
      return sqs
        .deleteMessage({
          QueueUrl: queueURL,
          ReceiptHandle: asString(message.ReceiptHandle),
        })
        .promise();
    } catch (error) {
      this.log.error(`deleteMessage exception: ${String(error)}`);
      if (!this.states.download.failure) {
        this.states.download.failure = {};
      }
      this.states.download.failure[error] = this.states.download.failure[error]
        ? asNumber(this.states.download.failure[error]) + 1
        : 1;
      throw error;
    }
  }

  async discoverQueue(queueName = ''): Promise<string> {
    if (this.config.instance.discoverQueueCache[queueName]) {
      return asString(this.config.instance.discoverQueueCache[queueName]);
    }

    this.log.debug(`discovering queue for ${queueName}`);

    let getQueue;
    try {
      const sqs = await this.sessionedSQS();
      getQueue = await sqs
        .getQueueUrl({
          QueueName: queueName,
        })
        .promise();
    } catch (err) {
      this.log.error(`Error: failed to find queue for ${queueName}: ${String(err)}`);
      throw err;
    }

    const queueURL = asString(getQueue.QueueUrl);
    this.log.debug(`found queue ${queueURL}`);
    this.config.instance.discoverQueueCache[queueName] = queueURL;

    return queueURL;
  }

  async queueLength(queueURL: string): Promise<unknown> {
    if (!queueURL) {
      throw new Error('no queueURL specified');
    }

    const queueName = queueURL.match(/([\w\-_]+)$/)?.[0];
    this.log.debug(`querying queue length of ${queueName}`);

    try {
      const sqs = await this.sessionedSQS();
      const attrs = await sqs
        .getQueueAttributes({
          QueueUrl: queueURL,
          AttributeNames: ['ApproximateNumberOfMessages'],
        })
        .promise();

      if (attrs?.Attributes && 'ApproximateNumberOfMessages' in attrs.Attributes) {
        const len = attrs.Attributes.ApproximateNumberOfMessages;
        return parseInt(len, 10);
      }
    } catch (err) {
      this.log.error(`error in getQueueAttributes ${String(err)}`);
      throw err;
    }
    throw new Error('unexpected response');
  }

  async autoStart(workflowConfig: Dictionary, cb?: (msg: string) => void): Promise<Dictionary> {
    const instance = await this.autoStartGeneric(workflowConfig, () => this.REST.startWorkflow(workflowConfig), cb);
    this.setClassConfigREST(instance);
    return this.autoConfigure(instance, cb);
  }

  async autoStartGQL(
    variables: {
      idWorkflow: Index;
      computeAccountId: Index;
      storageAccountId?: Index;
      isConsentedHuman?: boolean;
      idDataset?: Index;
      storeResults?: boolean;
      region?: string;
      userDefined?: Dictionary<Dictionary>;
      instanceAttributes?: InstanceAttribute[];
    },
    cb?: (msg: string) => void,
  ): Promise<Configuration['instance']> {
    /*
    variables: {
      idWorkflow: ID!
      computeAccountId: Int!
      storageAccountId: Int
      isConsentedHuman: Int = 0
      userDefined: GenericScalar
      instanceAttributes: [GenericScalar]
    }
    */
    const instance = await this.autoStartGeneric(
      variables,
      () =>
        this.graphQL.startWorkflow({
          variables,
        }),
      cb,
    );
    this.setClassConfigGQL(instance);
    // Pass this.config.instance because we need the old format
    // This can be improved
    return this.autoConfigure(this.config.instance, cb);
  }

  async autoStartGeneric<T>(
    workflowConfig: unknown,
    startFn: () => Promise<T>,
    cb?: (msg: string) => void,
  ): Promise<T> {
    this.stopped = false;
    let instance;
    try {
      instance = await startFn();
      this.analyseState$.next(true);
    } catch (startError) {
      const msg = `Failed to start workflow: ${String(startError)}`;
      this.log.warn(msg);
      if (cb) {
        cb(msg);
      }
      throw startError;
    }

    this.config.workflow = JSON.parse(JSON.stringify(workflowConfig)); // object copy
    this.log.info(`instance ${JSON.stringify(instance)}`);
    this.log.info(`workflow config ${JSON.stringify(this.config.workflow)}`);
    return instance;
  }

  async autoJoin(id: Index, cb?: (msg: string) => void): Promise<unknown> {
    this.stopped = false;
    this.config.instance.id_workflow_instance = id;
    let instance;
    try {
      // Theoretically this can work with GQL using the same setClassConfigGQL
      instance = await this.REST.workflowInstance(id);
    } catch (joinError) {
      const msg = `Failed to join workflow instance: ${String(joinError)}`;
      this.log.warn(msg);
      return cb ? cb(msg) : Promise.reject(joinError);
    }

    if (instance.state === 'stopped') {
      this.log.warn(`workflow ${id} is already stopped`);
      return cb ? cb('could not join workflow') : Promise.reject(new Error('could not join workflow'));
    }

    /* it could be useful to populate this as autoStart does */
    this.config.workflow = this.config.workflow || {};
    this.log.debug(`instance ${JSON.stringify(instance)}`);
    this.log.debug(`workflow config ${JSON.stringify(this.config.workflow)}`);

    this.setClassConfigREST(instance);
    return this.autoConfigure(instance, cb);
  }

  setClassConfigGQL(result: FetchResult<ResponseStartWorkflow>): void {
    const startData = result.data?.startData;
    const instance = startData?.instance;
    const workflowImage = instance?.workflowImage;
    const { bucket, idUser, remoteAddr } = startData ?? {};
    const { outputqueue, keyId, startDate, idWorkflowInstance, mappedTelemetry, telemetryNames } = instance ?? {};

    const chain = isString(instance?.chain) ? asString(instance?.chain) : asRecord(instance?.chain);
    const name = workflowImage?.region.name;
    const idWorkflow = asOptIndex(workflowImage?.workflow.idWorkflow);
    const inputqueue = workflowImage?.inputqueue;

    const map = {
      bucket: asOptString(bucket),
      id_user: asOptIndex(idUser),
      remote_addr: asOptString(remoteAddr),
      id_workflow_instance: asOptIndex(idWorkflowInstance),
      key_id: asOptString(keyId),
      start_date: asOptString(startDate),
      outputQueueName: asOptString(outputqueue),
      summaryTelemetry: asOptRecord(mappedTelemetry),
      telemetryNames: asOptRecordRecursive(asRecordRecursive(asString))(telemetryNames),
      inputQueueName: asOptString(inputqueue),
      id_workflow: idWorkflow,
      region: asString(name, this.config.options.region),
      bucketFolder: `${outputqueue}/${idUser}/${idWorkflowInstance}`,
      chain: utils.convertResponseToObject(chain),
    };

    this.config.instance = {
      ...this.config.instance,
      ...map,
    };
  }

  setClassConfigREST(instance: Dictionary): void {
    const conf = this.config.instance;

    conf.id_workflow_instance = asOptIndex(instance.id_workflow_instance);
    conf.id_workflow = asOptIndex(instance.id_workflow);
    conf.remote_addr = asOptString(instance.remote_addr);
    conf.key_id = asOptString(instance.key_id);
    conf.bucket = asOptString(instance.bucket);
    conf.start_date = asOptString(instance.start_date);
    conf.id_user = asOptIndex(instance.id_user);

    // copy tuples with different names / structures
    conf.inputQueueName = asOptString(instance.inputqueue);
    conf.outputQueueName = asOptString(instance.outputqueue);
    conf.region = asString(instance.region, this.config.options.region);
    conf.bucketFolder = `${instance.outputqueue}/${instance.id_user}/${instance.id_workflow_instance}`;
    conf.summaryTelemetry = asOptRecord(instance.telemetry); // MC-7056 for fetchTelemetry (summary) telemetry periodically

    // WARN this assumes chain is an object, but could it be a string?
    if (instance.chain) {
      conf.chain = utils.convertResponseToObject(asRecord(instance.chain));
    }
  }

  initSessionManager(
    opts?: Optional<Dictionary>,
    children: { config: { update: (option: Dictionary) => void } }[] = [],
  ): SessionManager {
    return new SessionManager(
      asIndex(this.config.instance.id_workflow_instance),
      this.REST,
      [AWS, ...children],
      {
        sessionGrace: this.config.options.sessionGrace,
        proxy: this.config.options.proxy,
        region: this.config.instance.region,
        log: this.log,
        useGraphQL: this.config.options.useGraphQL,
        ...(opts ?? {}),
      },
      this.graphQL,
    );
  }

  async autoConfigure<T>(instance: T, autoStartCb?: (msg: string) => void): Promise<T> {
    /*
    Ensure
    this.setClassConfigREST is called on REST responses to set fields as below:

     * region
     * id_workflow_instance
     * inputqueue
     * outputqueue
     * bucket
     * remote_addr
     * description (workflow)
     * chain
     */

    if (!this.config.options.inputFolders.length) {
      throw new Error('must set inputFolder');
    }
    if (!this.config.options.outputFolder) {
      throw new Error('must set outputFolder');
    }
    if (!this.config.instance.bucketFolder) {
      throw new Error('bucketFolder must be set');
    }
    if (!this.config.instance.inputQueueName) {
      throw new Error('inputQueueName must be set');
    }
    if (!this.config.instance.outputQueueName) {
      throw new Error('outputQueueName must be set');
    }

    fs.mkdirpSync(this.config.options.outputFolder);

    // MC-7108 use common epi2me working folder
    const instancesDir = path.join(rootDir(), 'instances');
    const thisInstanceDir = path.join(instancesDir, makeString(this.config.instance.id_workflow_instance));
    // set up new tracking database
    this.db = new DB(
      thisInstanceDir,
      {
        idWorkflowInstance: this.config.instance.id_workflow_instance,
        inputFolders: this.config.options.inputFolders,
      },
      this.log,
    );

    // MC-1828 - include instance id in telemetry file name
    const fileName = this.config.instance.id_workflow_instance
      ? `telemetry-${this.config.instance.id_workflow_instance}.log`
      : 'telemetry.log';
    const telemetryLogFolder = path.join(this.config.options.outputFolder, 'epi2me-logs');
    const telemetryLogPath = path.join(telemetryLogFolder, fileName);

    fs.mkdirp(telemetryLogFolder, (mkdirException) => {
      if (mkdirException && !String(mkdirException).match(/EEXIST/)) {
        this.log.error(`error opening telemetry log stream: mkdirpException:${String(mkdirException)}`);
      } else {
        try {
          this.telemetryLogStream = fs.createWriteStream(telemetryLogPath, {
            flags: 'a',
          });
          this.log.info(`logging telemetry to ${telemetryLogPath}`);
        } catch (telemetryLogStreamErr) {
          this.log.error(`error opening telemetry log stream: ${String(telemetryLogStreamErr)}`);
        }
      }
    });

    if (autoStartCb) {
      autoStartCb(''); // WARN this used to pass (null, instance) except the callback doesn't appear to accept this anywhere it is defined
    }

    if (this.config.options.useGraphQL) {
      this.observeTelemetry();
    } else {
      // MC-7056 periodically fetch summary telemetry for local reporting purposes
      this.timers.summaryTelemetryInterval = createInterval(this.config.options.downloadCheckInterval * 10000, () => {
        if (this.stopped) {
          const timer = this.timers.summaryTelemetryInterval;
          if (timer) {
            timer();
          }
          return;
        }
        this.fetchTelemetry();
      });
    }

    // MC-2068 - Don't use an interval.
    this.timers.downloadCheckInterval = createInterval(this.config.options.downloadCheckInterval * 1000, () => {
      if (this.stopped) {
        const timer = this.timers.downloadCheckInterval;
        if (timer) {
          timer();
        }
        return;
      }
      this.checkForDownloads();
    });

    // MC-1795 - stop workflow when instance has been stopped remotely
    this.timers.stateCheckInterval = createInterval(this.config.options.stateCheckInterval * 1000, async () => {
      if (this.stopped) {
        const timer = this.timers.stateCheckInterval;
        if (timer) {
          timer();
        }
        return;
      }

      try {
        let instanceObj: Dictionary;
        if (this.config.options.useGraphQL) {
          const query = this.graphQL.query<{ workflowInstance: { stop_date: unknown; state: string } }>(
            gql`
              query workflowInstance($idWorkflowInstance: ID!) {
                workflowInstance(idWorkflowInstance: $idWorkflowInstance) {
                  stop_date: stopDate
                  state
                }
              }
            `,
          );
          const response = await query({
            variables: {
              idWorkflowInstance: this.config.instance.id_workflow_instance,
            },
          });
          instanceObj = asDefined(response.data).workflowInstance;
        } else {
          instanceObj = await this.REST.workflowInstance(asDefined(this.config.instance.id_workflow_instance));
        }
        if (instanceObj.state === 'stopped') {
          this.log.warn(`instance was stopped remotely at ${instanceObj.stop_date}. shutting down the workflow.`);
          try {
            await this.stopEverything();

            const remoteShutdownCb = asOptFunction(this.config.options.remoteShutdownCb);
            if (remoteShutdownCb) {
              remoteShutdownCb(`instance was stopped remotely at ${instanceObj.stop_date}`);
            }
          } catch (stopError) {
            this.log.error(`Error whilst stopping: ${String(stopError)}`);
          }
        }
      } catch (instanceError) {
        this.log.warn(`failed to check instance state: ${instanceError?.error ? instanceError.error : instanceError}`);
      }
    });

    this.sessionManager = this.initSessionManager();

    /* Request session token */
    await this.sessionManager.session();

    this.reportProgress();
    this.uploadState$.next(true);
    // MC-5418: ensure that the session has been established before starting the upload
    this.loadUploadFiles(); // Trigger once at workflow instance start
    this.timers.fileCheckInterval = createInterval(
      this.config.options.fileCheckInterval * 1000,
      this.loadUploadFiles.bind(this),
    );
    return instance;
  }

  async stopUpload(): Promise<void> {
    for (const inProgressUpload of this.uploadsInProgress) {
      inProgressUpload.abort();
    }
    this.uploadsInProgress = [];

    super.stopUpload();

    this.log.debug('clearing split files');
    if (this.db) {
      await this.db.splitClean(); // remove any split files whose transfers were disrupted and which didn't self-clean
    }
  }

  async stopAnalysis(): Promise<void> {
    await super.stopAnalysis();
    this.telemetry?.disconnect();
    this.telemetryDestroySignal$?.next();
    this.telemetryDestroySignal$?.complete();
  }

  async stopEverything(): Promise<void> {
    delete this.sessionManager;
    await super.stopEverything();
  }

  async checkForDownloads(): Promise<void> {
    if (this.checkForDownloadsRunning) {
      return;
    }
    this.checkForDownloadsRunning = true;
    this.log.debug('checkForDownloads checking for downloads');

    try {
      const queueURL = await this.discoverQueue(asOptString(this.config.instance.outputQueueName));
      const len = await this.queueLength(queueURL);

      if (!len) {
        this.log.debug('no downloads available');
      } else {
        /* only process downloads if there are downloads to process */
        this.log.debug(`downloads available: ${len}`);
        await this.downloadAvailable();
      }
    } catch (err) {
      this.log.warn(`checkForDownloads error ${String(err)}`);
      if (!this.states.download.failure) {
        this.states.download.failure = {};
      }
      this.states.download.failure[err] = this.states.download.failure[err]
        ? asNumber(this.states.download.failure[err]) + 1
        : 1;
    }

    this.checkForDownloadsRunning = false;
  }

  async downloadAvailable(): Promise<unknown> {
    const downloadWorkerPoolRemaining = Object.keys(this.downloadWorkerPool || {}).length;

    if (downloadWorkerPoolRemaining >= this.config.options.transferPoolSize) {
      /* ensure downloadPool is limited but fully utilised */
      this.log.debug(`${downloadWorkerPoolRemaining} downloads already queued`);
      return;
    }

    let receiveMessageSet;
    try {
      const queueURL = await this.discoverQueue(asOptString(this.config.instance.outputQueueName));
      this.log.debug('fetching messages');

      const sqs = await this.sessionedSQS();
      receiveMessageSet = await sqs
        .receiveMessage({
          AttributeNames: ['All'], // to check if the same message is received multiple times
          QueueUrl: queueURL,
          VisibilityTimeout: this.config.options.inFlightDelay, // approximate time taken to pass/fail job before resubbing
          MaxNumberOfMessages: this.config.options.transferPoolSize - downloadWorkerPoolRemaining, // download enough messages to fill the pool up again
          WaitTimeSeconds: this.config.options.waitTimeSeconds, // long-poll
        })
        .promise();
    } catch (err) {
      const msg = err.toString();
      this.log.error(`receiveMessage exception: ${msg}`);
      const failures = this.states.download.failure;
      if (failures) {
        const existing = failures[msg];
        failures[msg] = asNumber(existing, 0) + 1;
      }
      throw err;
    }

    return this.receiveMessages(receiveMessageSet);
  }

  async loadUploadFiles(): Promise<unknown> {
    /**
     * Entry point for new files. Triggered on an interval
     *  - Scan the input folder files
     *      fs.readdir is resource-intensive if there are a large number of files
     *      It should only be triggered when needed
     *  - Push list of new files into uploadWorkerPool (that.enqueueFiles)
     */

    // dirScanInProgress is a semaphore used to bail out early if this routine is invoked by interval when it's already running
    if (this.dirScanInProgress) {
      return;
    }

    this.dirScanInProgress = true;
    this.log.debug('upload: started directory scan');

    try {
      const dbFilter = async (fileIn: string): Promise<boolean> => {
        if (isUndefined(this.db)) {
          throw new Error('Database has not been initialized');
        }
        return makeBoolean(await this.db.seenUpload(fileIn));
      };

      // find files waiting for upload
      const files = await utils.loadInputFiles(this.config.options, this.log, dbFilter);
      // trigger upload for all waiting files, blocking until all complete

      let running = 0;
      const chunkFunc = (): Promise<void> => {
        return new Promise((resolve) => {
          if (this.stopped || !this.uploadState$.getValue()) {
            files.length = 0;
            this.log.debug(`upload: skipping, stopped`);
            resolve();
            return;
          }

          if (running > this.config.options.transferPoolSize) {
            // run at most n at any one time
            setTimeout(resolve, 1000); // and check for more members of files[] after a second
            return;
          }

          // subtlety: if you upload a pre-existing run, this will generally always quantise/"sawtooth" n files at a time and wait for each set to complete
          // but if you trickle files in one at a time, you'll actually achieve faster throughput
          const filesChunk = files.splice(0, this.config.options.transferPoolSize - running); // fill up all available slots
          running += filesChunk.length;

          this.enqueueUploadFiles(filesChunk)
            .then()
            .catch((e) => {
              this.log.error(`upload: exception in enqueueUploadFiles: ${String(e)}`);
            })
            .finally(() => {
              running -= filesChunk.length; // clear the upload slot(s)
              resolve();
            });
        });
      };

      while (files.length) {
        await chunkFunc(); // eslint-disable-line no-await-in-loop
      }
    } catch (err) {
      this.log.error(`upload: exception in loadInputFiles: ${String(err)}`);
    }
    this.dirScanInProgress = false;
    this.log.debug('upload: finished directory scan');

    return;
  }

  async enqueueUploadFiles(files?: FileStat[]): Promise<unknown> {
    let maxFiles = 0;
    let maxFileSize = 0;
    let splitSize = 0;
    let splitReads = 0;
    let settings: {
      max_size?: number;
      max_files?: number;
      split_size?: number;
      split_reads?: number;
      requires_storage?: boolean;
    } = {};

    if (!isArray(files) || !files.length) {
      return;
    }

    this.log.info(`enqueueUploadFiles ${files.length} files: ${files.map((file) => file.path).join(' ')}.`);

    const workflow = asOptRecord(this.config.workflow);
    if (workflow) {
      const workflowAttributes = asOptRecord(workflow.workflow_attributes);
      const attributes = asOptRecord(workflow.attributes);
      if (workflowAttributes) {
        // started from GUI agent
        settings = workflowAttributes;
      } else if (attributes) {
        // started from CLI

        if ('epi2me:max_size' in attributes) {
          settings.max_size = makeNumber(attributes['epi2me:max_size']);
        }
        if ('epi2me:max_files' in attributes) {
          settings.max_files = makeNumber(attributes['epi2me:max_files']);
        }
        if ('epi2me:split_size' in attributes) {
          settings.split_size = makeNumber(attributes['epi2me:split_size']);
        }
        if ('epi2me:split_reads' in attributes) {
          settings.split_reads = makeNumber(attributes['epi2me:split_reads']);
        }

        if ('epi2me:category' in attributes) {
          // WARN this assumes that the value is a string, could actually be an array? both have the includes method
          const epi2meCategory = asString(attributes['epi2me:category']);
          if (epi2meCategory.includes('storage')) {
            settings.requires_storage = true;
          }
        }
      }
    }

    this.log.info(`enqueueUploadFiles settings ${JSON.stringify(settings)}`);

    if (settings.requires_storage) {
      if (!workflow) {
        throw new Error("Workflow isn't set");
      }
      if (!('storage_account' in workflow)) {
        const warning = {
          msg: 'ERROR: Workflow requires storage enabled. Please provide a valid storage account [ --storage ].',
          type: 'WARNING_STORAGE_ENABLED',
        };
        this.log.error(warning.msg);
        this.states.warnings.push(warning);
        return;
      }
    }

    if ('split_size' in settings) {
      splitSize = makeNumber(settings.split_size);
      this.log.info(`enqueueUploadFiles splitting supported files at ${splitSize} bytes`);
    }

    if ('split_reads' in settings) {
      splitReads = makeNumber(settings.split_reads);
      this.log.info(`enqueueUploadFiles splitting supported files at ${splitReads} reads`);
    }

    if ('max_size' in settings) {
      maxFileSize = makeNumber(settings.max_size);
      this.log.info(`enqueueUploadFiles restricting file size to ${maxFileSize}`);
    }

    if ('max_files' in settings) {
      maxFiles = makeNumber(settings.max_files);
      this.log.info(`enqueueUploadFiles restricting file count to ${maxFiles}`);

      if (files.length > maxFiles) {
        const warning = {
          msg: `ERROR: ${files.length} files found. Workflow can only accept ${maxFiles}. Please move the extra files away.`,
          type: 'WARNING_FILE_TOO_MANY',
        };
        this.log.error(warning.msg);
        this.states.warnings.push(warning);
        return;
      }
    }

    //    this.uploadState('filesCount', 'incr', { files: files.length });
    this.states.upload.filesCount += files.length; // total count of files for an instance

    const inputBatchQueue = files.map(async (file: FileDescriptor) => {
      if (maxFiles && this.states.upload.filesCount > maxFiles) {
        //
        // too many files processed
        //
        const msg = `Maximum ${maxFiles} file(s) already uploaded. Marking ${file.relative} as skipped.`;
        const warning = {
          msg,
          type: 'WARNING_FILE_TOO_MANY',
        };
        this.log.error(msg);
        this.states.warnings.push(warning);
        this.states.upload.filesCount -= 1;
        file.skip = 'SKIP_TOO_MANY';
      } else if (file.size === 0) {
        //
        // zero-sized file
        //
        const msg = `The file "${file.relative}" is empty. It will be skipped.`;
        const warning = {
          msg,
          type: 'WARNING_FILE_EMPTY',
        };
        file.skip = 'SKIP_EMPTY';
        this.states.upload.filesCount -= 1;
        this.log.error(msg);
        this.states.warnings.push(warning);
      } else if (file.path?.match(/\.(?:fastq|fq)(?:\.gz)?$/) && ((splitSize && file.size > splitSize) || splitReads)) {
        //
        // file too big to process but can be split
        //
        const msg = `${file.relative}${file.size > splitSize ? ' is too big and' : ''} is going to be split`;
        this.log.warn(msg);
        const warning = {
          msg,
          type: 'WARNING_FILE_SPLIT',
        };
        this.states.warnings.push(warning);

        const splitStyle = splitSize
          ? {
              maxChunkBytes: splitSize,
            }
          : {
              maxChunkReads: splitReads,
            };
        const splitter = file.path.match(/\.gz$/) ? fastqGzipSplitter : fastqSplitter;

        const fileId = utils.getFileID();
        const queue = new PromisePipeline({
          bandwidth: this.config.options.transferPoolSize,
        });
        let chunkId = 0;
        const chunkHandler = async (chunkFile: string): Promise<void> => {
          this.log.debug(`chunkHandler for ${chunkFile}`);
          // mark start of chunk transfer. do it before the stop check so it's cleaned up correctly if stopped early
          if (!this.db) {
            throw new Error('Database is required but not initialized');
          }
          await this.db.splitFile(chunkFile, file.path);

          if (this.stopped) {
            queue.stop();
            this.log.info(`stopped, so skipping ${chunkFile}`);
            return Promise.reject(new Error(`stopped`));
          }

          chunkId += 1;

          let relativePath: string | null = null;
          for (const folder of this.config.options.inputFolders) {
            if (chunkFile.includes(folder)) {
              relativePath = chunkFile.replace(folder, '');
              break;
            }
          }

          const stats = await filestats(chunkFile);
          const chunkStruct = {
            name: path.basename(chunkFile), // "my.fastq"
            path: chunkFile, // "/Users/rpettett/test_sets/zymo/demo/INPUT_PREFIX/my.fastq"
            relative: asString(relativePath), // "INPUT_PREFIX/my.fastq"
            id: `${fileId}_${chunkId}`,
            stats,
            size: stats.bytes,
          };
          const p = new Promise((chunkResolve: UnknownFunction): void => {
            queue.enqueue(
              async (): Promise<void> => {
                this.log.info(`chunk upload starting ${chunkStruct.id} ${chunkStruct.path}`);
                // this function may have been sat in a queue for a while, so check 'stopped' state again
                if (this.stopped) {
                  this.log.info(`chunk upload skipped (stopped) ${chunkStruct.id} ${chunkStruct.path}`);
                  queue.stop();
                  //                    queue.clear();
                  chunkResolve();
                  return; // .reject(new Error('stopped'));
                }

                try {
                  await this.uploadJob(chunkStruct);
                  if (!this.db) {
                    throw new Error('Database is required but not initialized');
                  }
                  await this.db.splitDone(chunkStruct.path);
                } catch (e) {
                  this.log.error(`chunk upload failed ${chunkStruct.id} ${chunkStruct.path}: ${String(e)}`);
                }
                chunkResolve();
              },
            );
          });
          await p; // need to wait for p to resolve before resolving the filestats outer
        };

        try {
          await splitter(file.path, splitStyle, chunkHandler, this.log);
          queue.stop();
        } catch (splitterError) {
          queue.stop();
          if (String(splitterError) === 'Error: stopped') {
            return;
          }
          throw splitterError;
        }

        if (!this.db) {
          throw new Error('Database is required but not initialized');
        }
        // mark the original file as done
        return this.db.uploadFile(file.path);
      } else if (maxFileSize && file.size > maxFileSize) {
        //
        // file too big to process and unable to split
        //
        const msg = `The file "${file.relative}" is bigger than the maximum size limit (${niceSize(
          maxFileSize,
        )}B). It will be skipped.`;
        const warning = {
          msg,
          type: 'WARNING_FILE_TOO_BIG',
        };
        file.skip = 'SKIP_TOO_BIG';
        this.states.upload.filesCount -= 1;
        this.log.error(msg);
        this.states.warnings.push(warning);
      } else {
        try {
          // normal handling for all file types
          file.stats = await filestats(file.path);
        } catch (e) {
          this.log.error(`failed to stat ${file.path}: ${String(e)}`);
        }
      }

      return this.uploadJob(file);
    });

    try {
      // inputBatchQueue contains an array of promises corresponding to local files waiting for upload and which are only resolved on successful transfer to S3
      await Promise.all(inputBatchQueue);
      this.log.info(`upload: inputBatchQueue (${inputBatchQueue.length} jobs) complete`);
      // try and load more files straight away. returns a promise which resolves after awaiting the new work
      return this.loadUploadFiles();
    } catch (err) {
      this.log.error(`upload: enqueueUploadFiles exception ${String(err)}`);
      throw err;
    }
  }

  async uploadJob(file: FileDescriptor): Promise<void> {
    // Initiate file upload to S3

    if ('skip' in file) {
      if (!this.db) {
        throw new Error('Database is required but not initialized');
      }
      await this.db.skipFile(file.path);
      return;
    }

    let file2: FileDescriptor | null = null;
    let errorMsg;
    try {
      this.log.info(`upload: ${file.id} starting`);
      file2 = await this.uploadHandler(file);
      this.log.info(`upload: ${file2.id} uploaded and notified`);
    } catch (err) {
      errorMsg = err;
      this.log.error(`upload: ${file.id} done, but failed: ${String(errorMsg)}`);
    }

    if (errorMsg) {
      this.log.error(`uploadJob ${errorMsg}`);

      if (!this.states.upload.failure) {
        this.states.upload.failure = {};
      }
      this.states.upload.failure[errorMsg] = this.states.upload.failure[errorMsg]
        ? asNumber(this.states.upload.failure[errorMsg]) + 1
        : 1;

      if (String(errorMsg).match(/AWS.SimpleQueueService.NonExistentQueue/)) {
        // FATALITY! thrown during sqs.sendMessage
        this.log.error(`instance stopped because of a fatal error`);
        return this.stopEverything();
      }
    } else {
      const { bytes = 0, reads = 0, sequences = 0 } = file2?.stats ?? {};

      // this.uploadState('queueLength', 'decr', file2.stats); // this.states.upload.queueLength = this.states.upload.queueLength ? this.states.upload.queueLength - readCount : 0;
      this.uploadState('success', 'incr', { files: 1, bytes, reads, sequences });
      // this.states.upload.success = this.states.upload.success ? this.states.upload.success + readCount : readCount;

      if (file2?.name) {
        // nb. we only count types for successful uploads
        const ext = path.extname(file2.name);
        this.uploadState('types', 'incr', {
          [ext]: 1,
        });
      }
    }
    // file-by-file?
  }

  async receiveMessages(receiveMessages?: PromiseResult<AWS.SQS.ReceiveMessageResult, AWS.AWSError>): Promise<void> {
    if (!receiveMessages || !receiveMessages.Messages || !receiveMessages.Messages.length) {
      /* no work to do */
      this.log.info('complete (empty)');
      return;
    }

    if (!this.downloadWorkerPool) {
      this.downloadWorkerPool = {};
    }

    const workerPool = this.downloadWorkerPool;

    for (const message of receiveMessages.Messages) {
      const id = makeString(message.MessageId);
      workerPool[id] = 1;

      const timeoutHandle = createTimeout((60 + this.config.options.downloadTimeout) * 1000, () => {
        this.log.error(`this.downloadWorkerPool timeoutHandle. Clearing queue slot for message: ${message.MessageId}`);
        throw new Error('download timed out');
      });

      this.processMessage(message)
        .catch((err) => {
          this.log.error(`processMessage ${String(err)}`);
        })
        .finally(() => {
          timeoutHandle();
          if (message) {
            // message is null if split file & stopping
            delete workerPool[id];
          }
        });
    }

    this.log.info(`downloader queued ${receiveMessages.Messages.length} messages for processing`);
    // return Promise.all(this.downloadWorkerPool); // does awaiting here control parallelism better?
  }

  async processMessage(message?: AWS.SQS.Message): Promise<void> {
    let messageBody: Dictionary;
    let folder;

    if (!message) {
      this.log.debug('download.processMessage: empty message');
      return;
    }

    if (message.Attributes) {
      if ('ApproximateReceiveCount' in message.Attributes) {
        this.log.debug(`download.processMessage: ${message.MessageId} / ${message.Attributes.ApproximateReceiveCount}`);
      }
    }

    try {
      messageBody = JSON.parse(asString(message.Body));
    } catch (jsonError) {
      this.log.error(`error parsing JSON message.Body from message: ${JSON.stringify(message)} ${String(jsonError)}`);
      try {
        await this.deleteMessage(message);
      } catch (e) {
        this.log.error(`Exception deleting message: ${String(e)}`);
      }
      return;
    }

    const telemetry = asOptRecord(messageBody.telemetry);

    /* MC-405 telemetry log to file */
    if (telemetry) {
      if (telemetry.tm_path) {
        try {
          this.log.debug(`download.processMessage: ${message.MessageId} fetching telemetry`);
          const s3 = await this.sessionedS3();
          const data = await s3
            .getObject({
              Bucket: asString(messageBody.bucket),
              Key: asString(telemetry.tm_path),
            })
            .promise();
          this.log.info(`download.processMessage: ${message.MessageId} fetched telemetry`);

          const body = data.Body;

          if (isUndefined(body)) {
            throw new Error('Telemetry body is undefined');
          }

          telemetry.batch = body
            .toString('utf-8')
            .split('\n')
            .filter((d) => d?.length > 0)
            .map((row) => {
              try {
                return JSON.parse(row);
              } catch (e) {
                this.log.error(`Telemetry Batch JSON Parse error: ${String(e)}`);
                return row;
              }
            });
        } catch (err) {
          this.log.error(`Could not fetch telemetry JSON: ${String(err)}`);
        }
      }

      try {
        if (!this.telemetryLogStream) {
          throw new Error('Telemetry log stream is not initialized');
        }
        this.telemetryLogStream.write(JSON.stringify(telemetry) + EOL);
      } catch (telemetryWriteErr) {
        this.log.error(`error writing telemetry: ${telemetryWriteErr}`);
      }
      if (this.config.options.telemetryCb) {
        this.config.options.telemetryCb(telemetry);
      }
    }

    if (!messageBody.path) {
      this.log.warn(`nothing to download`);
      return;
    }

    const match = asString(messageBody.path).match(/[\w\W]*\/([\w\W]*?)$/);
    const fn = match ? match[1] : '';
    // MC-7519: Multiple instances running means multiple outputs need to be namespaced by id_workflow_instance
    const idWorkflowInstance = this.config.instance.id_workflow_instance;
    folder = path.join(
      asString(this.config.options.outputFolder),
      isUndefined(idWorkflowInstance) ? '' : makeString(idWorkflowInstance),
    );

    const telemetryHintsFolder = asOptString(asOptRecord(telemetry?.hints)?.folder);
    /* MC-940: use folder hinting if present */
    if (telemetryHintsFolder) {
      this.log.debug(`using folder hint ${telemetryHintsFolder}`);
      // MC-4987 - folder hints may now be nested.
      // eg: HIGH_QUALITY/CLASSIFIED/ALIGNED
      // or: LOW_QUALITY
      const codes = telemetryHintsFolder
        .split('/') // hints are always unix-style
        .map((o: string) => o.toUpperCase()); // MC-5612 cross-platform uppercase "pass" folder
      folder = path.join.apply(null, [folder, ...codes]);
    }

    fs.mkdirpSync(folder);
    const outputFile = path.join(folder, fn);

    if (this.config.options.downloadMode === 'data+telemetry') {
      /* download file[s] from S3 */

      // MC-6190 extra file extensions generated by workflow
      const fetchSuffixes = ['']; // default message object
      const settings = asOptRecord(this.config.workflow?.settings);
      let extra = asArrayRecursive(asString)(settings?.output_format, []);
      if (typeof extra === 'string' || extra instanceof String) {
        extra = extra.trim().split(/[\s,]+/); // do not use commas in file extensions. Ha.ha.
      }
      // extra.push('.bai'); // fake it 'til you make it

      try {
        fetchSuffixes.push(...extra); // any extra extensions generated by the workflow
      } catch (e) {
        this.log.error(`Failed to work out workflow file suffixes: ${String(e)}`);
      }

      try {
        const fetchPromises = fetchSuffixes.map((suffix) => {
          const fetchObject = messageBody.path + suffix;
          const fetchFile = outputFile + suffix;
          this.log.debug(`download.processMessage: ${message.MessageId} downloading ${fetchObject} to ${fetchFile}`);

          // we ignore failures to fetch anything with extra suffixes by wrapping
          // initiateDownloadStream with another Promise which permits fetch-with-suffix failures
          return new Promise<void>((resolve, reject) => {
            this.initiateDownloadStream(
              {
                bucket: asString(messageBody.bucket),
                path: fetchObject,
              },
              message,
              fetchFile,
            ).then(
              () => resolve(),
              (e) => {
                this.log.error(`Caught exception waiting for initiateDownloadStream: ${String(e)}`);
                if (suffix) {
                  reject(e);
                  return;
                }
                resolve();
              },
            );
          });
        });

        await Promise.all(fetchPromises);
      } catch (e) {
        this.log.error(`Exception fetching file batch: ${String(e)}`);
      }

      // after all files in a set have been downloaded, fire any custom callback
      try {
        // MC-2540 : if there is some postprocessing to do( e.g fastq extraction) - call the dataCallback
        // dataCallback might depend on the exit_status ( e.g. fastq can only be extracted from successful reads )
        const exitStatus = telemetry?.json ?? false;
        if (exitStatus && this.config.options.dataCb) {
          this.config.options.dataCb(outputFile, exitStatus);
        }
      } catch (err) {
        this.log.warn(`failed to fire data callback: ${err}`);
      }
    } else {
      const batchSummary = asOptRecord(telemetry?.batch_summary);
      // telemetry-only mode uses readcount from message
      const readCount = asOptNumber(batchSummary?.reads_num) ?? 1;

      this.downloadState('success', 'incr', {
        files: 1,
        reads: readCount,
      });
    }

    // this.config.options.downloadMode === 'telemetry'
    /* skip download - only interested in telemetry */
    try {
      await this.deleteMessage(message);
    } catch (e) {
      this.log.error(`Exception deleting message: ${String(e)}`);
    }

    this.realtimeFeedback(`workflow_instance:state`, {
      type: 'stop',
      id_workflow_instance: this.config.instance.id_workflow_instance,
      id_workflow: this.config.instance.id_workflow,
      component_id: '0',
      message_id: merge(message).MessageId,
      id_user: this.config.instance.id_user,
    }).catch((e) => {
      this.log.warn(`realtimeFeedback failed: ${String(e)}`);
    });

    /* must signal completion */
  }

  initiateDownloadStream(
    s3Item: { bucket: string; path: string },
    message: AWS.SQS.Message,
    outputFile: string,
  ): Promise<void> {
    return new Promise<void>(async (resolve, reject) => {
      let s3;
      try {
        s3 = await this.sessionedS3();
      } catch (e) {
        reject(e);
      }

      let file: fs.WriteStream;
      let rs: Readable;

      const onStreamError = (err: unknown): void => {
        this.log.error(
          `Error during stream of bucket=${s3Item.bucket} path=${s3Item.path} to file=${outputFile} ${String(err)}`,
        );

        this.stopTimeout('transferTimeouts', outputFile);

        if (networkStreamErrors.has(file)) {
          // already dealing with it
          return;
        }

        try {
          networkStreamErrors.add(
            file,
          ); /* MC-1953 - signal the file end of the pipe this the network end of the pipe failed */
          file.close();

          fs.remove(outputFile)
            .then(() => {
              this.log.warn(`removed failed download ${outputFile}`);
            })
            .catch((unlinkException) => {
              this.log.warn(`failed to remove ${outputFile}. unlinkException: ${String(unlinkException)}`);
            });

          if (rs instanceof fs.ReadStream && rs.destroy) {
            // && !rs.destroyed) {
            this.log.error(`destroying read stream for ${outputFile}`);
            rs.destroy();
          }
        } catch (e) {
          this.log.error(`error handling stream error: ${String(e)}`);
        }
      };

      try {
        const params = {
          Bucket: s3Item.bucket,
          Key: s3Item.path,
        };

        // MC-6270 : disable append to avoid appending the same data
        // file = fs.createWriteStream(outputFile, { "flags": "a" });
        file = fs.createWriteStream(outputFile);
        if (!s3) {
          throw new Error('S3 is required but not initialized');
        }
        const req = s3.getObject(params);

        // track request/response bytes expected
        req.on('httpHeaders', (_status, headers) => {
          // status, headers, response
          this.downloadState('progress', 'incr', {
            total: parseInt(headers['content-length'], 10),
          });
        });

        rs = req.createReadStream();
      } catch (getObjectException) {
        this.log.error(`getObject/createReadStream exception: ${String(getObjectException)}`);

        reject(getObjectException);
        return;
      }

      rs.on('error', onStreamError);

      file.on('finish', async () => {
        if (networkStreamErrors.has(file)) {
          return;
        }

        // SUCCESS
        this.log.debug(`downloaded ${outputFile}`);

        // MC-1993 - store total size of downloaded files
        try {
          const ext = path.extname(outputFile);
          const { bytes, reads, sequences } = await filestats(outputFile);

          this.downloadState('success', 'incr', {
            files: 1,
            bytes,
            reads,
            sequences,
          });
          this.downloadState('types', 'incr', {
            [ext]: 1,
          });
          this.downloadState('progress', 'decr', {
            total: bytes,
            bytes,
          }); // reset in-flight counters
        } catch (err) {
          this.log.warn(`failed to stat ${outputFile}: ${String(err)}`);
        }
        this.reportProgress();
      });

      file.on('close', (writeStreamError: unknown) => {
        this.log.debug(`closing writeStream ${outputFile}`);
        if (writeStreamError) {
          this.log.error(`error closing write stream ${writeStreamError}`);
          /* should we bail and return completeCb() here? */
        }

        /* must signal completion */
        const clearVisibilityInterval = this.timers.visibilityIntervals[outputFile];
        if (clearVisibilityInterval) {
          clearVisibilityInterval();
          delete this.timers.visibilityIntervals[outputFile];
        }
        const clearTransferTimeout = this.timers.transferTimeouts[outputFile];
        if (clearTransferTimeout) {
          clearTransferTimeout();
          delete this.timers.transferTimeouts[outputFile];
        }

        // MC-2143 - check for more jobs
        setTimeout(this.checkForDownloads.bind(this));
        this.log.info(
          `download.initiateDownloadStream: ${message.MessageId} downloaded ${s3Item.path} to ${outputFile}`,
        );
        resolve();
      });

      file.on('error', onStreamError);

      const transferTimeoutFunc = (): void => {
        onStreamError(new Error('transfer timed out'));
      };

      this.timers.transferTimeouts[outputFile] = createTimeout(
        1000 * this.config.options.downloadTimeout,
        transferTimeoutFunc,
      ); /* download stream timeout in ms */

      const updateVisibilityFunc = async (): Promise<void> => {
        if (this.stopped) {
          const interval = this.timers.visibilityIntervals[outputFile];
          if (interval) {
            interval();
            delete this.timers.visibilityIntervals[outputFile];
          }
        }

        const queueUrl = this.config.instance.outputQueueURL;
        const receiptHandle = message.ReceiptHandle;

        this.log.debug(
          {
            message_id: message.MessageId,
          },
          'updateVisibility',
        );

        try {
          const sqs = await this.sessionedSQS();
          await sqs
            .changeMessageVisibility({
              QueueUrl: asString(queueUrl),
              ReceiptHandle: asString(receiptHandle),
              VisibilityTimeout: this.config.options.inFlightDelay,
            })
            .promise();
        } catch (err) {
          this.log.error(
            {
              message_id: message.MessageId,
              queue: queueUrl,
              error: err,
            },
            'Error setting visibility',
          );
          const interval = this.timers.visibilityIntervals[outputFile];
          if (interval) {
            interval();
            delete this.timers.visibilityIntervals[outputFile];
          }
          // reject here?
        }
      };

      this.timers.visibilityIntervals[outputFile] = createInterval(
        900 * this.config.options.inFlightDelay,
        updateVisibilityFunc,
      ); /* message in flight timeout in ms, less 10% */

      rs.on('data', (chunk) => {
        // reset timeout
        const timeout = this.timers.transferTimeouts[outputFile];
        if (timeout) {
          timeout();
        }
        this.timers.transferTimeouts[outputFile] = createTimeout(
          1000 * this.config.options.downloadTimeout,
          transferTimeoutFunc,
        ); /* download stream timeout in ms */

        this.downloadState('progress', 'incr', {
          bytes: chunk.length,
        });
      }).pipe(file); // initiate download stream
    });
  }

  async uploadHandler(file: FileDescriptor): Promise<FileDescriptor> {
    /** open readStream and pipe to S3.upload */
    const s3 = await this.sessionedS3();

    let rs: fs.ReadStream;
    let closed = false;

    const mangledRelative = file.relative
      .replace(/^[\\/]+/, '')
      .replace(/\\/g, '/')
      .replace(/\//g, '_'); // MC-7204, MC-7206 - this needs to be unpicked in future

    const objectId = [
      this.config.instance.bucketFolder,
      'component-0',
      mangledRelative, // prefix
      mangledRelative, // objectname //      encodeURIComponent(file.relative.replace(/^[\\/]+/, '').replace(/\\/g, '/')), // MC-7204 - escaped slashes not handled by cgd 3.0.7
    ]
      .join('/')
      .replace(/\/+/g, '/');

    let timeoutHandle: DisposeTimer;

    const p = new Promise((resolve: (file: FileDescriptor) => void, reject) => {
      const timeoutFunc = (): void => {
        if (rs && !closed) {
          rs.close();
        }
        reject(new Error(`${file.name} timed out`));
      };
      // timeout to ensure this completeCb *always* gets called
      timeoutHandle = createTimeout((this.config.options.uploadTimeout + 5) * 1000, timeoutFunc);

      try {
        rs = fs.createReadStream(file.path);
        rs.on('close', () => {
          closed = true;
        });
      } catch (createReadStreamException) {
        timeoutHandle();

        reject(createReadStreamException);
        return;
      }

      rs.on('error', (readStreamError) => {
        rs.close();
        let errstr = 'error in upload readstream';
        if (readStreamError?.message) {
          errstr += `: ${readStreamError.message}`;
        }
        timeoutHandle();
        reject(new Error(errstr));
      });

      rs.on('open', async () => {
        const params: {
          Bucket: string;
          Key: string;
          Body: fs.ReadStream;
          SSEKMSKeyId?: string;
          ServerSideEncryption?: string;
          'Content-Length'?: number;
        } = {
          Bucket: asString(this.config.instance.bucket), // bucket is required by sq.upload, so assert on it's existence
          Key: objectId,
          Body: rs,
        };

        const service = new AWS.S3();

        const options = {
          partSize: 10 * 1024 * 1024,
          queueSize: 1,
          service,
        };

        if (this.config.instance.key_id) {
          // MC-4996 support (optional, for now) encryption
          params.SSEKMSKeyId = this.config.instance.key_id;
          params.ServerSideEncryption = 'aws:kms';
        }

        if (file.size) {
          params['Content-Length'] = file.size;
        }

        this.uploadState('progress', 'incr', {
          total: file.size,
        });
        let myProgress = 0;

        const managedUpload = s3.upload(params, options);
        this.uploadsInProgress.push(managedUpload);
        const sessionManager = this.initSessionManager(null, [service]);
        sessionManager.sts_expiration = this.sessionManager?.sts_expiration; // No special options here, so use the main session and don't refetch until it's expired

        managedUpload.on('httpUploadProgress', async (progress) => {
          // Breaking out here causes this.states.progress.bytes to get out of sync.
          // if (this.stopped) {
          //   reject(new Error('stopped'));
          //   return;
          // }

          //          this.log.debug(`upload progress ${progress.key} ${progress.loaded} / ${progress.total}`);
          this.uploadState('progress', 'incr', {
            bytes: progress.loaded - myProgress,
          }); // delta since last time
          myProgress = progress.loaded; // store for calculating delta next iteration
          timeoutHandle(); // MC-6789 - reset upload timeout
          timeoutHandle = createTimeout((this.config.options.uploadTimeout + 5) * 1000, timeoutFunc);
          try {
            await sessionManager.session(); // MC-7129 force refresh token on the MANAGED UPLOAD instance of the s3 service
          } catch (e) {
            this.log.warn(`Error refreshing token: ${String(e)}`);
          }
        });

        try {
          await managedUpload.promise();
          this.log.info(`${file.id} S3 upload complete`);
          rs.close();
          timeoutHandle();
          await this.uploadComplete(objectId, file); // send message
          resolve(file);
        } catch (uploadStreamErr) {
          this.log.warn(`${file.id} uploadStreamError ${uploadStreamErr}`);
          reject(uploadStreamErr);
        } finally {
          this.uploadState('progress', 'decr', {
            total: file.size,
            bytes: file.size,
          }); // zero in-flight upload counters
          this.uploadsInProgress = this.uploadsInProgress.filter((upload) => upload !== managedUpload);
        }
      });

      //      rs.on('end', rs.close);
      //      rs.on('close', () => this.log.debug('closing readstream'));
    });

    return p;
  }

  async uploadComplete(objectId: string, file: { id: string; path: string }): Promise<unknown> {
    this.log.info(`${file.id} uploaded to S3: ${objectId}`);

    const message: {
      components?: unknown;
      targetComponentId?: unknown;
      key_id?: unknown;
      bucket?: string;
      outputQueue?: string;
      remote_addr?: string;
      apikey?: string;
      id_workflow_instance?: Index;
      id_master?: Index;
      utc: string;
      path: string;
      prefix: string;
      agent_address?: Dictionary;
    } = {
      bucket: this.config.instance.bucket,
      outputQueue: this.config.instance.outputQueueName,
      remote_addr: this.config.instance.remote_addr,
      apikey: this.config.options.apikey,
      id_workflow_instance: this.config.instance.id_workflow_instance,
      id_master: this.config.instance.id_workflow,
      utc: new Date().toISOString(),
      path: objectId,
      prefix: objectId.substring(0, objectId.lastIndexOf('/')),
    };

    if (this.config.instance.chain) {
      try {
        message.components = JSON.parse(JSON.stringify(this.config.instance.chain.components)); // low-frills object clone
        message.targetComponentId = this.config.instance.chain.targetComponentId; // first component to run
      } catch (jsonException) {
        this.log.error(`${file.id} exception parsing components JSON ${String(jsonException)}`);
        return Promise.reject(jsonException); // close the queue job
      }
    }

    // MC-5943 support (optional, for now) #SSE #crypto!
    if (this.config.instance.key_id) {
      message.key_id = this.config.instance.key_id;
    }

    // MC-1304 - attach geo location and ip
    if (this.config.options.agent_address) {
      try {
        message.agent_address = JSON.parse(this.config.options.agent_address);
      } catch (exception) {
        this.log.error(`${file.id} Could not parse agent_address ${String(exception)}`);
      }
    }

    if (message.components) {
      const components = asRecordRecursive(asRecord)(message.components);
      // optionally populate input + output queues
      for (const component of Object.values(components)) {
        switch (component?.inputQueueName) {
          case 'uploadMessageQueue':
            component.inputQueueName = this.uploadMessageQueue;
            break;
          case 'downloadMessageQueue':
            component.inputQueueName = this.downloadMessageQueue;
            break;
          default:
            // NOTE should this be a NOOP or an error
            break;
        }
      }
    }

    let sentMessage = {};
    try {
      const inputQueueURL = await this.discoverQueue(asOptString(this.config.instance.inputQueueName));
      const sqs = await this.sessionedSQS();

      this.log.info(`${file.id} sending SQS message to input queue`);
      sentMessage = await sqs
        .sendMessage({
          QueueUrl: inputQueueURL,
          MessageBody: JSON.stringify(message),
        })
        .promise();
    } catch (sendMessageException) {
      this.log.error(`${file.id} exception sending SQS message: ${String(sendMessageException)}`);
      return Promise.reject(sendMessageException);
    }

    this.realtimeFeedback(`workflow_instance:state`, {
      type: 'start',
      id_workflow_instance: this.config.instance.id_workflow_instance,
      id_workflow: this.config.instance.id_workflow,
      component_id: '0',
      message_id: merge(sentMessage).MessageId,
      id_user: this.config.instance.id_user,
    }).catch((e) => {
      this.log.warn(`realtimeFeedback failed: ${String(e)}`);
    });

    this.log.info(`${file.id} SQS message sent. Mark as uploaded`);
    if (!this.db) {
      throw new Error('Database has not been instantiated');
    }
    return this.db.uploadFile(file.path);
  }

  observeTelemetry(): void {
    if (!this.config.options.useGraphQL) {
      // uses fetchTelemetry instead
      throw new Error('observeTelemetry is only supported with GraphQL enabled');
    }
    if (this.telemetry) {
      throw new Error('telemetry is already instantiated');
    }

    const instanceDir = path.join(rootDir(), 'instances', makeString(this.config.instance.id_workflow_instance));
    const telemetryNames = this.config?.instance?.telemetryNames;
    const idWorkflowInstance = makeString(this.config.instance.id_workflow_instance);

    this.telemetry = Telemetry.connect(idWorkflowInstance, this.graphQL, asDefined(telemetryNames));

    const reports$ = this.telemetry.telemetryReports$();
    const destroySignal$ = new Subject<void>();
    const writeQueue = createQueue<[string, JSONValue]>(1, destroySignal$, ([filePath, content]) =>
      fs.writeJSON(filePath, content),
    );
    // update the public reportState$ subject to indicate reports are ready on our first signal
    reports$.pipe(first(), mapTo(true), takeUntil(destroySignal$)).subscribe(this.reportState$);

    // pass all telemetry fils to public instanceTelemetry$ subject
    reports$.pipe(map(Object.values), takeUntil(destroySignal$)).subscribe(this.instanceTelemetry$);

    // write any changed telemetry files to disk
    reports$.pipe(recordDelta(), takeUntil(destroySignal$)).subscribe((reports: Dictionary<JSONObject>) => {
      // download and save report
      for (const [componentId, body] of Object.entries(reports)) {
        // queue file writes to prevent a race condition where we could attempt
        // to write a report file while it's already being written
        writeQueue([path.join(instanceDir, `${componentId}.json`), body]);
      }
    });

    this.telemetryDestroySignal$ = destroySignal$;
  }

  async fetchTelemetry(): Promise<void> {
    const instanceDir = path.join(rootDir(), 'instances', makeString(this.config.instance.id_workflow_instance));

    if (this.config.options.useGraphQL) {
      // uses observeTelemetry instead
      throw new Error('fetchTelemetry is not supported with GraphQL enabled');
    }
    if (!this.config?.instance?.summaryTelemetry) {
      return;
    }

    const toFetch: Promise<JSONObject | null>[] = [];

    const summaryTelemetry = asRecord(this.config.instance.summaryTelemetry);
    Object.keys(summaryTelemetry).forEach((componentId) => {
      const component = asRecord(summaryTelemetry[componentId]) ?? {};
      const firstReport = Object.keys(component)[0]; // poor show
      let url = asOptString(component[firstReport]);

      if (!url) {
        return;
      }

      if (!url.startsWith('http')) {
        url = resolve(this.config.options.url, url);
      }

      const fn = path.join(instanceDir, `${componentId}.json`);

      toFetch.push(
        (async (): Promise<JSONObject | null> => {
          try {
            const body = (await this.REST.fetchContent(url)) as JSONObject;
            fs.writeJSONSync(fn, body);
            this.reportState$.next(true);
            this.log.debug(`fetched telemetry summary ${fn}`);
            return body;
          } catch (err) {
            this.log.debug(`Error fetching telemetry`, err);
            return null;
          }
        })(),
      );
    });

    try {
      const allTelemetryPayloads = await Promise.all(toFetch);
      this.instanceTelemetry$.next(allTelemetryPayloads);
    } catch (err) {
      this.log.warn('summary telemetry incomplete', err);
    }
  }
}
