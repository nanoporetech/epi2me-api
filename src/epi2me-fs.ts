/* eslint no-console: ["error", { allow: ["log", "info", "debug", "warn", "error"] }] */
/*
 * Copyright (c) 2018 Metrichor Ltd.
 * Author: rpettett
 * When: A long time ago, in a galaxy far, far away
 *
 */
import type { Readable, Writable } from 'stream';
import type { PromiseResult } from 'aws-sdk/lib/request';
import type { Configuration } from './Configuration.type';
import { JSONObject, Dictionary, Index, isIndex } from 'ts-runtime-typecheck';
import type { InstanceAttribute } from './factory.type';
import type { EPI2ME_OPTIONS } from './epi2me-options.type';
import type { InstanceTokenMutation, WorkflowInstanceMutation } from './generated/graphql.type';
import type { JSONValue } from 'ts-runtime-typecheck';

import {
  asOptString,
  asString,
  asDictionary,
  asOptIndex,
  asOptDictionary,
  asDefined,
  asOptFunction,
  asOptNumber,
  isDefined,
  isDictionary,
  asOptStruct,
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
import { BehaviorSubject } from 'rxjs';
import { createQueue } from './queue';
import { filestats } from './filestats';
import { instantiateFileUpload } from './fileUploader';
import { Duration } from './Duration';
import { asNodeError, isNodeError, NestedError, wrapAndLogError } from './NodeError';

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

const asChain = asOptStruct({
  components: isDictionaryOf(isDictionary),
  targetComponentId: isIndex,
});

export class EPI2ME_FS extends EPI2ME {
  static REST = REST_FS;
  static utils = utils;
  static EPI2ME_HOME = rootDir();
  static Factory = Factory;
  static GraphQL = GraphQLFS;

  SampleReader = new SampleReader();
  telemetryLogStream?: fs.WriteStream;
  checkForDownloadsRunning?: boolean;
  dirScanInProgress?: boolean;
  uploadMessageQueue?: unknown;
  downloadMessageQueue?: unknown;

  REST: REST_FS;

  private telemetry?: Telemetry;
  private sqs?: AWS.SQS;
  private s3?: AWS.S3;

  constructor(opts: Partial<EPI2ME_OPTIONS>) {
    super(opts); // sets up this.config & this.log

    // overwrite non-fs REST and GQL object
    this.REST = new REST_FS(this.config.options);
    this.graphQL = new GraphQLFS(this.config.options);
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
      const opts = { id_dataset: this.config.options.idDataset };
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
      region: this.config.instance.region,
      credentials,
    });
  }

  sessionedSQS(options: AWS.SQS.ClientConfiguration = {}): AWS.SQS {
    const credentials = new Epi2meCredentials(this.fetchToken, this.config.options.sessionGrace);
    return new AWS.SQS({
      ...options,
      region: this.config.instance.region,
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
    } catch (err) {
      throw this.incrementDownloadFailure('deleteMessage error', err);
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
      throw wrapAndLogError(`failed to find queue for ${queueName}`, err, this.log);
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
      throw wrapAndLogError('error in getQueueAttributes', err, this.log);
    }
    throw new Error('unexpected response from getQueueAttributes');
  }

  async autoStart(workflowConfig: Dictionary): Promise<Dictionary> {
    this.stopped = false;

    let instance;
    try {
      instance = await this.REST.startWorkflow(workflowConfig);
    } catch (err) {
      throw wrapAndLogError('failed to start workflow', err, this.log);
    }

    await this.autoStartGeneric(workflowConfig, instance);
    this.setClassConfigREST(instance);
    return this.autoConfigure(instance);
  }

  async autoStartGQL(variables: {
    idWorkflow: Index;
    computeAccountId: Index;
    storageAccountId?: Index;
    isConsentedHuman?: boolean;
    idDataset?: Index;
    storeResults?: boolean;
    region?: string;
    userDefined?: Dictionary<Dictionary>;
    instanceAttributes?: InstanceAttribute[];
  }): Promise<Configuration['instance']> {
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

    this.stopped = false;

    let instance;
    try {
      const response = await this.graphQL.startWorkflow({ variables });
      instance = asDefined(response.data?.startData);
    } catch (err) {
      throw wrapAndLogError('failed to start workflow', err, this.log);
    }

    await this.autoStartGeneric(variables, instance);
    this.setClassConfigGQL(instance);
    // Pass this.config.instance because we need the old format
    // This can be improved
    return this.autoConfigure(this.config.instance);
  }

  // TODO improves the parameter types
  autoStartGeneric(workflowConfig: unknown, instance: unknown): void {
    this.analyseState$.next(true);
    this.config.workflow = JSON.parse(JSON.stringify(workflowConfig)); // object copy
    this.log.info(`instance ${JSON.stringify(instance)}`);
    this.log.info(`workflow config ${JSON.stringify(this.config.workflow)}`);
  }

  async autoJoin(id: Index): Promise<unknown> {
    this.stopped = false;
    this.config.instance.id_workflow_instance = id;
    let instance;
    try {
      // Theoretically this can work with GQL using the same setClassConfigGQL
      instance = await this.REST.workflowInstance(id);
    } catch (err) {
      throw wrapAndLogError('failed to join workflow instance', err, this.log);
    }

    if (instance.state === 'stopped') {
      throw new Error('could not join workflow');
    }

    this.autoStartGeneric(this.config.workflow ?? {}, instance);
    this.setClassConfigREST(instance);
    return this.autoConfigure(instance);
  }

  validateChain(chain: unknown): ReturnType<typeof asChain> {
    return asChain(isString(chain) ? JSON.parse(chain) : chain);
  }

  setClassConfigGQL(startData: WorkflowInstanceMutation): void {
    assertDefined(startData, 'Workflow Start Data');
    const { instance, bucket, idUser, remoteAddr } = startData;
    assertDefined(instance, 'Workflow Instance');

    const { workflowImage, outputqueue, keyId, startDate, idWorkflowInstance, mappedTelemetry, telemetryNames } =
      instance;

    const regionName = workflowImage.region.name;
    const idWorkflow = asOptIndex(workflowImage.workflow.idWorkflow);
    const inputqueue = workflowImage.inputqueue;

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
      region: regionName,
      bucketFolder: `${outputqueue}/${idUser}/${idWorkflowInstance}`,
      chain: this.validateChain(instance.chain),
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

    conf.chain = this.validateChain(instance.chain);
  }

  // WARN
  // the purpose of this function is somewhat confused
  // it is used after the instance is created, but validates
  // some of the input parameters!
  // we should replace it with a linear "validate, instantiate, run" flow
  // when we depreciate and remove REST
  async autoConfigure<T>(instance: T): Promise<T> {
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

    // NOTE these errors check the options

    const { inputFolders, idDataset } = this.config.options;
    const usingDataset = isDefined(idDataset);

    if (isDefined(inputFolders)) {
      if (usingDataset) {
        throw new Error('cannot use a dataset and folders as an input');
      }
      if (inputFolders.length === 0) {
        throw new Error('no input folders specified');
      }
    } else if (!usingDataset) {
      throw new Error('no input folders specified');
    }

    if (!this.config.options.outputFolder) {
      throw new Error('must set outputFolder');
    }

    // NOTE these errors check the instance

    if (!this.config.instance.bucketFolder) {
      throw new Error('bucketFolder must be set');
    }
    if (!this.config.instance.inputQueueName) {
      throw new Error('inputQueueName must be set');
    }
    if (!this.config.instance.outputQueueName) {
      throw new Error('outputQueueName must be set');
    }

    // NOTE now for actual setup

    try {
      await fs.mkdirp(this.config.options.outputFolder);
    } catch (err) {
      if (asNodeError(err).code !== 'EEXIST') {
        throw wrapAndLogError('failed to create output folder', err, this.log);
      }
    }

    // MC-7108 use common epi2me working folder
    const instancesDir = path.join(rootDir(), 'instances');
    const thisInstanceDir = path.join(instancesDir, makeString(this.config.instance.id_workflow_instance));
    try {
      await fs.mkdirp(thisInstanceDir);
    } catch (err) {
      if (asNodeError(err).code !== 'EEXIST') {
        throw wrapAndLogError('failed to create instance folder', err, this.log);
      }
    }

    // MC-1828 - include instance id in telemetry file name
    const fileName = this.config.instance.id_workflow_instance
      ? `telemetry-${this.config.instance.id_workflow_instance}.log`
      : 'telemetry.log';
    const telemetryLogFolder = path.join(this.config.options.outputFolder, 'epi2me-logs');
    const telemetryLogPath = path.join(telemetryLogFolder, fileName);

    try {
      await fs.mkdirp(telemetryLogFolder);
    } catch (err) {
      if (isNodeError(err) && err.code !== 'EEXIST') {
        throw wrapAndLogError(
          'error opening telemetry log stream, failed to create telemetry log folder',
          err,
          this.log,
        );
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
      throw wrapAndLogError('error opening telemetry log stream', asNodeError(err), this.log);
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

    // TODO this comment appears to clash with the implementation... figure out why
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
          } catch (err) {
            wrapAndLogError('Error whilst stopping', err, this.log);
          }
        }
      } catch (err) {
        this.log.warn(NestedError.formatMessage('failed to check instance state', err));
      }
    });

    this.reportProgress();

    // NOTE don't need the uploader if we are running from a dataset
    if (inputFolders) {
      this.uploadState$.next(true);

      const startUpload = instantiateFileUpload(this);

      // WARN this is async, but doesn't exit until the upload has been stopped
      startUpload();
    }

    return instance;
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
      this.incrementDownloadFailure('checkForDownloads error', err);
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
      throw this.incrementDownloadFailure('receiveMessage error', err);
    }

    return this.receiveMessages(receiveMessageSet);
  }

  incrementDownloadFailure(msg: string, err: unknown): NestedError {
    const downloadState = this.states.download;
    let failures = downloadState.failure;
    if (!failures) {
      failures = {};
      downloadState.failure = failures;
    }
    const wrappedError = new NestedError(msg, err);
    this.log.error(wrappedError.message);
    const existing = failures[wrappedError.message] ?? 0;
    failures[wrappedError.message] = existing + 1;
    return wrappedError;
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
          this.log.error(NestedError.formatMessage('processMessage', err));
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
    } catch (err) {
      this.log.error(NestedError.formatMessage('error parsing JSON message.Body from message', err));
      try {
        await this.deleteMessage(message);
      } catch (err) {
        this.log.error(NestedError.formatMessage('error deleting message', err));
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
              } catch (err) {
                this.log.error(NestedError.formatMessage('telemetry batch JSON parse error', err));
                return row;
              }
            });
        } catch (err) {
          this.log.error(NestedError.formatMessage('could not fetch telemetry JSON', err));
        }
      }

      try {
        if (!this.telemetryLogStream) {
          throw new Error('Telemetry log stream is not initialized');
        }
        this.telemetryLogStream.write(JSON.stringify(telemetry) + EOL);
      } catch (err) {
        this.log.error(NestedError.formatMessage('error writing telemtry', err));
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
      this.log.critical('FS_FAILURE', NestedError.formatMessage('failed to create instance output folder', err));
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
          } catch (err) {
            this.log.error(NestedError.formatMessage('exception fetching file batch', err));
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
    } catch (err) {
      this.log.error(NestedError.formatMessage('exception deleting message', err));
    }

    this.realtimeFeedback(`workflow_instance:state`, {
      type: 'stop',
      id_workflow_instance: this.config.instance.id_workflow_instance,
      id_workflow: this.config.instance.id_workflow,
      component_id: '0',
      message_id: message.MessageId,
      id_user: this.config.instance.id_user,
    });

    /* must signal completion */
  }

  initiateDownloadStream(
    s3Item: { bucket: string; path: string },
    message: AWS.SQS.Message,
    outputFile: string,
  ): Promise<void> {
    const s3 = this.getS3SessionedService();

    return new Promise<void>(async (resolve, reject) => {
      let file: fs.WriteStream;
      let rs: Readable;

      const onStreamError = async (err: unknown) => {
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

          try {
            await fs.remove(outputFile);
            this.log.warn(`removed failed download ${outputFile}`);
          } catch (err) {
            if (isNodeError(err) && err.code !== 'EEXIST') {
              throw new NestedError(`failed to delete ${outputFile}`, err);
            }
          }
        } catch (err) {
          this.log.error(NestedError.formatMessage('error while trying to recover from download stream error', err));
        }

        if (rs instanceof fs.ReadStream && rs.destroy) {
          // && !rs.destroyed) {
          this.log.error(`destroying read stream for ${outputFile}`);
          rs.destroy();
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
      } catch (err) {
        reject(wrapAndLogError('getObject/createReadStream error', err, this.log));
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
          this.log.warn(NestedError.formatMessage(`failed to stat ${outputFile}`, err));
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
          wrapAndLogError(`error setting visibility ID: ${message.MessageId} queue: ${queueUrl}`, err, this.log);
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

    const { add: writeQueue } = createQueue(
      { signal$: this.analysisStopped$ },
      async ([filePath, content]: [string, JSONValue]) => {
        try {
          await fs.writeJSON(filePath, content);
        } catch (err) {
          this.log.critical('FS_FAILURE', NestedError.formatMessage('failed to write report telemetry to disk', err));
        }
      },
    );

    // update the public reportState$ subject to indicate reports are ready on our first signal
    this.telemetry.anyReportsReady$
      .pipe(
        filter((isReady) => isReady),
        first(),
        takeUntil(this.analysisStopped$),
      )
      .subscribe(() => this.reportState$.next(true));

    // pass all telemetry fils to public instanceTelemetry$ subject
    this.telemetry.reports$
      .pipe(
        map((reports) => {
          return reports.map(({ report }) => report);
        }),
        takeUntil(this.analysisStopped$),
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
            body = await this.REST.fetchContent(url);
            if (body === null) {
              return null;
            }
            this.log.debug(`fetched telemetry summary ${fn}`);
            this.reportState$.next(true);
          } catch (err) {
            this.log.debug(NestedError.formatMessage('error fetching telemetry', err));
            return null;
          }

          try {
            // NOTE sadly this needs to be sync atm
            fs.writeJSONSync(fn, body);
          } catch (err) {
            this.log.critical('FS_FAILURE', NestedError.formatMessage('failed to write report telemetry to disk', err));
          }
          return body;
        })(),
      );
    });

    try {
      const allTelemetryPayloads = await Promise.all(toFetch);
      this.instanceTelemetry$.next(allTelemetryPayloads);
    } catch (err) {
      this.log.warn(NestedError.formatMessage('summary telemetry incomplete', err));
    }
  }
}
