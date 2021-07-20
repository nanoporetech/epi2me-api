/* eslint no-console: ["error", { allow: ["log", "info", "debug", "warn", "error"] }] */
/*
 * Copyright (c) 2018 Metrichor Ltd.
 * Author: rpettett
 * When: A long time ago, in a galaxy far, far away
 *
 */
import type { Readable, Writable } from 'stream';
import type { PromiseResult } from 'aws-sdk/lib/request';
import type { FetchResult } from '@apollo/client/core';
import type { Configuration } from './Configuration.type';
import type { JSONObject, Dictionary, Index } from 'ts-runtime-typecheck';
import type { ResponseStartWorkflow } from './graphql.type';
import type { InstanceAttribute } from './factory.type';
import type { EPI2ME_OPTIONS } from './epi2me-options.type';
import type { InstanceTokenMutation } from './generated/graphql.type';
import type { JSONValue } from 'ts-runtime-typecheck';

import {
  asOptString,
  asString,
  asNumber,
  asDictionary,
  asOptIndex,
  asOptDictionary,
  asDefined,
  asOptFunction,
  asOptNumber,
  makeString,
  isString,
  isUndefined,
  asOptDictionaryOf,
  isDictionaryOf,
  isArrayOf,
  assertDefined,
} from 'ts-runtime-typecheck';
import AWS from 'aws-sdk';
import fs from 'fs-extra'; /* MC-565 handle EMFILE & EXDIR gracefully; use Promises */
import { EOL, homedir } from 'os';
import path from 'path';
import { DB } from './db';
import { EPI2ME } from './epi2me';
import { Factory } from './factory';
import { REST_FS } from './rest-fs';
import { SampleReader } from './sample-reader';
import { Epi2meCredentials } from './credentials';
import { utilsFS as utils } from './utils-fs';
import { gql } from '@apollo/client/core';
import { createInterval, createTimeout } from './timers';
import { Telemetry } from './telemetry';
import { resolve } from 'url';
import { filter, first, map, takeUntil, withLatestFrom } from 'rxjs/operators';
import { GraphQLFS } from './graphql-fs';
import { BehaviorSubject, Subject } from 'rxjs';
import { createQueue } from './queue';
import { filestats } from './filestats';
import { instantiateFileUpload } from './fileUploader';
import { Duration } from './Duration';

const networkStreamErrors: WeakSet<Writable> = new WeakSet();

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
  static EPI2ME_HOME = rootDir();
  static Factory = Factory;
  static GraphQL = GraphQLFS;

  SampleReader: SampleReader;
  telemetryLogStream?: fs.WriteStream;
  db?: DB;
  checkForDownloadsRunning?: boolean;
  dirScanInProgress?: boolean;
  uploadMessageQueue?: unknown;
  downloadMessageQueue?: unknown;

  REST: REST_FS;

  private telemetry?: Telemetry;
  private telemetryDestroySignal$?: Subject<void>;
  private sqs?: AWS.SQS;
  private s3?: AWS.S3;

  constructor(optstring: Partial<EPI2ME_OPTIONS> | string) {
    super(optstring); // sets up this.config & this.log

    // overwrite non-fs REST and GQL object
    this.REST = new REST_FS(this.config.options);
    this.graphQL = new GraphQLFS(this.config.options);
    this.SampleReader = new SampleReader();
  }

  private fetchToken = async (): Promise<InstanceTokenMutation> => {
    let token: InstanceTokenMutation;
    assertDefined(this.config.instance.id_workflow_instance);
    if (this.config.options.useGraphQL) {
      const instanceTokenOptions = {
        variables: { idWorkflowInstance: this.config.instance.id_workflow_instance },
      };
      const result = await this.graphQL.instanceToken(instanceTokenOptions);
      token = asDefined(result.data?.token);
    } else {
      const opts = { id_dataset: this.config.options.id_dataset };
      token = await this.REST.instanceToken(this.config.instance.id_workflow_instance, opts);
    }
    return token;
  };

  sessionedS3(options: AWS.S3.ClientConfiguration = {}): AWS.S3 {
    const credentials = new Epi2meCredentials(this.fetchToken, this.config.options.sessionGrace);
    // Will need to prefetch a token to acccess region before creating the S3 service
    return new AWS.S3({
      useAccelerateEndpoint: this.config.options.awsAcceleration === 'on',
      ...options,
      region: this.config.options.region,
      credentials,
    });
  }

  sessionedSQS(options: AWS.SQS.ClientConfiguration = {}): AWS.SQS {
    const credentials = new Epi2meCredentials(this.fetchToken, this.config.options.sessionGrace);
    return new AWS.SQS({
      ...options,
      region: this.config.options.region,
      credentials,
    });
  }

  getSQSSessionedService(): AWS.SQS {
    if (!this.sqs) {
      this.sqs = this.sessionedSQS();
    }
    return this.sqs;
  }

  getS3SessionedService(): AWS.S3 {
    if (!this.s3) {
      this.s3 = this.sessionedS3();
    }
    return this.s3;
  }

  async deleteMessage(message: { ReceiptHandle?: string }): Promise<unknown> {
    try {
      const queueURL = await this.discoverQueue(asOptString(this.config.instance.outputQueueName));
      const sqs = this.getSQSSessionedService();
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
      const sqs = this.getSQSSessionedService();
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

    // const queueName = queueURL.match(/([\w\-_]+)$/)?.[0];
    // this.log.debug(`querying queue length of ${queueName}`);

    try {
      const sqs = this.getSQSSessionedService();
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
    // cb doesn't appear to be used by CLI, and isn't used by agent
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

    const chain = isString(instance?.chain) ? asString(instance?.chain) : asDictionary(instance?.chain);
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
      summaryTelemetry: asOptDictionary(mappedTelemetry),
      telemetryNames: asOptDictionaryOf(isDictionaryOf(isString))(telemetryNames),
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
    conf.summaryTelemetry = asOptDictionary(instance.telemetry); // MC-7056 for fetchTelemetry (summary) telemetry periodically

    // WARN this assumes chain is an object, but could it be a string?
    if (instance.chain) {
      conf.chain = utils.convertResponseToObject(asDictionary(instance.chain));
    }
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

    try {
      await fs.mkdirp(this.config.options.outputFolder);
    } catch (err) {
      if (err.code !== 'EEXIST') {
        this.log.error('Failed to create output folder');
        throw err;
      }
    }

    // MC-7108 use common epi2me working folder
    const instancesDir = path.join(rootDir(), 'instances');
    const thisInstanceDir = path.join(instancesDir, makeString(this.config.instance.id_workflow_instance));
    // set up new tracking database
    this.db = new DB(
      thisInstanceDir,
      {
        idWorkflowInstance: makeString(this.config.instance.id_workflow_instance),
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

    try {
      await fs.mkdirp(telemetryLogFolder);
    } catch (err) {
      if (err.code !== 'EEXIST') {
        this.log.error(`error opening telemetry log stream: mkdirpException:${String(err)}`);
        throw err;
      }
    }

    try {
      this.telemetryLogStream = fs.createWriteStream(telemetryLogPath, {
        flags: 'a',
      });
      this.telemetryLogStream.on('error', (err) => {
        this.log.critical('FS_FAILURE', `Error writing telemetry to log file :${err.message}`);
      });
      this.log.info(`logging telemetry to ${telemetryLogPath}`);
    } catch (err) {
      this.log.error(`error opening telemetry log stream: ${String(err)}`);
      throw err;
    }

    if (autoStartCb) {
      autoStartCb(''); // WARN this used to pass (null, instance) except the callback doesn't appear to accept this anywhere it is defined
    }

    if (this.config.options.useGraphQL) {
      this.observeTelemetry();
    } else {
      // MC-7056 periodically fetch summary telemetry for local reporting purposes
      this.timers.summaryTelemetryInterval = createInterval(
        this.config.options.downloadCheckInterval.multiply(10),
        () => {
          if (this.stopped) {
            this.timers.summaryTelemetryInterval?.cancel();
            return;
          }
          this.fetchTelemetry();
        },
      );
    }

    // MC-2068 - Don't use an interval.
    this.timers.downloadCheckInterval = createInterval(this.config.options.downloadCheckInterval, () => {
      if (this.stopped) {
        this.timers.downloadCheckInterval?.cancel();
        return;
      }
      this.checkForDownloads();
    });

    // MC-1795 - stop workflow when instance has been stopped remotely
    this.timers.stateCheckInterval = createInterval(this.config.options.stateCheckInterval, async () => {
      if (this.stopped) {
        this.timers.stateCheckInterval?.cancel();
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

    this.reportProgress();
    this.uploadState$.next(true);

    const startUpload = instantiateFileUpload(this);

    // WARN this is async, but doesn't exit until the upload has been stopped
    startUpload();

    return instance;
  }

  async stopUpload(): Promise<void> {
    super.stopUpload();

    this.log.debug('clearing split files');
    if (this.db) {
      await this.db.splitClean(); // remove any split files whose transfers were disrupted and which didn't self-clean
    }
  }

  async stopAnalysis(): Promise<void> {
    await super.stopAnalysis();
    this.telemetryDestroySignal$?.next();
    this.telemetryDestroySignal$?.complete();
  }

  async stopEverything(): Promise<void> {
    await super.stopEverything();
  }

  async checkForDownloads(): Promise<void> {
    if (this.checkForDownloadsRunning) {
      return;
    }
    this.checkForDownloadsRunning = true;
    // this.log.debug('checkForDownloads checking for downloads');

    try {
      const queueURL = await this.discoverQueue(asOptString(this.config.instance.outputQueueName));
      const len = await this.queueLength(queueURL);

      if (len) {
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

      const sqs = this.getSQSSessionedService();
      receiveMessageSet = await sqs
        .receiveMessage({
          AttributeNames: ['All'], // to check if the same message is received multiple times
          QueueUrl: queueURL,
          VisibilityTimeout: this.config.options.inFlightDelay.seconds, // approximate time taken to pass/fail job before resubbing
          MaxNumberOfMessages: this.config.options.transferPoolSize - downloadWorkerPoolRemaining, // download enough messages to fill the pool up again
          WaitTimeSeconds: this.config.options.waitTimeSeconds.seconds, // long-poll
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

      // WARN this behaviour does not appear to be correct, where does the error go???
      const { cancel: timeoutHandle } = createTimeout(
        this.config.options.downloadTimeout.add(Duration.Minutes(1)),
        () => {
          this.log.error(
            `this.downloadWorkerPool timeoutHandle. Clearing queue slot for message: ${message.MessageId}`,
          );
          throw new Error('download timed out');
        },
      );

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

    const { downloadMode } = this.config.options;
    const telemetry = asOptDictionary(messageBody.telemetry);

    /* MC-405 telemetry log to file */
    if (telemetry && downloadMode.includes('telemetry')) {
      if (telemetry.tm_path) {
        try {
          this.log.debug(`download.processMessage: ${message.MessageId} fetching telemetry`);
          const s3 = this.getS3SessionedService();
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

    if (!messageBody.downloads && !messageBody.path) {
      this.log.warn(`nothing to download`);
      return;
    }

    // MC-7519: Multiple instances running means multiple outputs need to be namespaced by id_workflow_instance
    const idWorkflowInstance = this.config.instance.id_workflow_instance;
    let folder = path.join(
      asString(this.config.options.outputFolder),
      isUndefined(idWorkflowInstance) ? '' : makeString(idWorkflowInstance),
    );

    const telemetryHintsFolder = asOptString(asOptDictionary(telemetry?.hints)?.folder);
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

    try {
      await fs.mkdirp(folder);
    } catch (err) {
      this.log.critical('FS_FAILURE', `Failed to create instance output folder :${err.message}`);
    }

    if (downloadMode.includes('data')) {
      /* download file[s] from S3 */

      const downloads = isArrayOf(isString)(messageBody.downloads)
        ? messageBody.downloads
        : [asString(messageBody.path)];

      await Promise.all(
        downloads.map(async (filepath) => {
          const destination = path.join(folder, path.basename(filepath));
          this.log.debug(`download.processMessage: ${message.MessageId} downloading ${filepath} to ${destination}`);

          try {
            await this.initiateDownloadStream(
              {
                bucket: asString(messageBody.bucket),
                path: filepath,
              },
              message,
              destination,
            );
          } catch (e) {
            this.log.error(`Exception fetching file batch: ${String(e)}`);
          }
        }),
      );
    } else {
      const batchSummary = asOptDictionary(telemetry?.batch_summary);
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
      message_id: message.MessageId,
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
        s3 = this.getS3SessionedService();
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
          clearVisibilityInterval.cancel();
          delete this.timers.visibilityIntervals[outputFile];
        }
        const clearTransferTimeout = this.timers.transferTimeouts[outputFile];
        if (clearTransferTimeout) {
          clearTransferTimeout.cancel();
          delete this.timers.transferTimeouts[outputFile];
        }

        // MC-2143 - check for more jobs
        setTimeout(this.checkForDownloads.bind(this));
        this.log.info(
          `download.initiateDownloadStream: ${message.MessageId} downloaded ${s3Item.path} to ${outputFile}`,
        );
        resolve();
      });

      file.on('error', (err) => {
        this.log.critical('FS_FAILURE', `Failed to write ${path.basename(outputFile)} to output :${err.message}`);
        onStreamError(err);
      });

      const transferTimeout = createTimeout(this.config.options.downloadTimeout, () => {
        onStreamError(new Error('transfer timed out'));
      });
      this.timers.transferTimeouts[outputFile] = transferTimeout;

      const updateVisibilityFunc = async (): Promise<void> => {
        if (this.stopped) {
          const interval = this.timers.visibilityIntervals[outputFile];
          if (interval) {
            interval.cancel();
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
          const sqs = this.getSQSSessionedService();
          await sqs
            .changeMessageVisibility({
              QueueUrl: asString(queueUrl),
              ReceiptHandle: asString(receiptHandle),
              VisibilityTimeout: this.config.options.inFlightDelay.seconds,
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
            interval.cancel();
            delete this.timers.visibilityIntervals[outputFile];
          }
          // reject here?
        }
      };

      this.timers.visibilityIntervals[outputFile] = createInterval(
        this.config.options.inFlightDelay.multiply(0.9),
        updateVisibilityFunc,
      ); /* message in flight timeout in ms, less 10% */

      rs.on('data', (chunk) => {
        // reset timeout
        transferTimeout.reset();

        this.downloadState('progress', 'incr', {
          bytes: chunk.length,
        });
      }).pipe(file); // initiate download stream
    });
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

    // const reports$ = this.telemetry.telemetryReports$().pipe(filter(isDefined));

    const destroySignal$ = new Subject<void>();
    const { add: writeQueue } = createQueue(
      { signal$: destroySignal$ },
      async ([filePath, content]: [string, JSONValue]) => {
        try {
          await fs.writeJSON(filePath, content);
        } catch (err) {
          this.log.critical('FS_FAILURE', `Failed to write report telemetry to disk :${err.message}`);
        }
      },
    );

    // update the public reportState$ subject to indicate reports are ready on our first signal
    this.telemetry.anyReportsReady$
      .pipe(
        filter((isReady) => isReady),
        first(),
        takeUntil(destroySignal$),
      )
      .subscribe(() => this.reportState$.next(true));

    // pass all telemetry fils to public instanceTelemetry$ subject
    this.telemetry.reports$
      .pipe(
        map((reports) => {
          return reports.map(({ report }) => report);
        }),
        takeUntil(destroySignal$),
      )
      .subscribe((reports) => this.instanceTelemetry$.next(reports));

    const previousReports$ = new BehaviorSubject<(JSONObject | null)[]>([]);

    // write any changed telemetry files to disk
    this.telemetry.reports$
      .pipe(
        withLatestFrom(previousReports$),
        map(([reports, previous]) => {
          const updated = reports.map(({ report }) => report);

          previousReports$.next(updated);

          const changeList: { report: JSONObject; id: string }[] = [];
          for (let i = 0; i < reports.length; i++) {
            const old = previous[i];
            const { report, id } = reports[i];
            if (report && report !== old) {
              changeList.push({
                report,
                id,
              });
            }
          }

          return changeList;
        }),
      )
      .subscribe((changeReports) => {
        for (const { id, report } of changeReports) {
          // queue file writes to prevent a race condition where we could attempt
          // to write a report file while it's already being written
          writeQueue([path.join(instanceDir, `${id}.json`), report]);
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

    const summaryTelemetry = asDictionary(this.config.instance.summaryTelemetry);
    Object.keys(summaryTelemetry).forEach((componentId) => {
      const component = asDictionary(summaryTelemetry[componentId]) ?? {};
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
          let body;
          try {
            body = (await this.REST.fetchContent(url)) as JSONObject;
            this.log.debug(`fetched telemetry summary ${fn}`);
            this.reportState$.next(true);
          } catch (err) {
            this.log.debug(`Error fetching telemetry`, err);
            return null;
          }

          try {
            // NOTE sadly this needs to be sync atm
            fs.writeJSONSync(fn, body);
          } catch (err) {
            this.log.critical('FS_FAILURE', `Failed to write report telemetry to disk :${err.message}`);
          }
          return body;
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
