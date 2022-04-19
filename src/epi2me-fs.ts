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
import {
  JSONObject,
  Dictionary,
  Index,
  asIndex,
  asDictionary,
  asIndexable,
  asOptString,
  asString,
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
  isIndex,
  Optional,
  asNumber,
} from 'ts-runtime-typecheck';
import type { EPI2ME_OPTIONS } from './epi2me-options.type';
import type { JSONValue } from 'ts-runtime-typecheck';
import type { Agent } from 'http';
import ProxyAgent from 'proxy-agent';

import * as AWS from 'aws-sdk';
import fs from 'fs'; /* MC-565 handle EMFILE & EXDIR gracefully; use Promises */
import { EOL, homedir } from 'os';
import path from 'path';
import { Factory } from './factory';
import { SampleReader } from './sample-reader';
import { Epi2meCredentials } from './credentials';
import { createInterval, createTimeout } from './timers';
import { Telemetry } from './telemetry';
import { filter, first, map, mapTo, skipWhile, takeUntil, takeWhile, withLatestFrom } from 'rxjs/operators';
import { GraphQLFS } from './graphql-fs';
import { BehaviorSubject, combineLatest } from 'rxjs';
import { createQueue } from './queue';
import { filestats } from './filestats';
import { instantiateFileUpload } from './fileUploader';
import { Duration } from './Duration';
import { asNodeError, isNodeError, NestedError, wrapAndLogError } from './NodeError';
import type { InstanceTokenMutation, StartWorkflowMutation, StartWorkflowMutationVariables } from './generated/graphql';
import { DEFAULT_OPTIONS } from './default_options';
import type { Logger } from './Logger.type';
import type { Timer } from './timer.type';
import type { DownloadState, ProgressState, States, SuccessState, UploadState } from './epi2me-state.type';
import { createDownloadState, createUploadState } from './epi2me-state';
import { parseOptions } from './parseOptions';
import { niceSize } from './niceSize';
import { Socket } from './socket';

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

export class EPI2ME_FS {
  static version = DEFAULT_OPTIONS.agent_version;
  static EPI2ME_HOME = rootDir();
  static Factory = Factory;
  static GraphQL = GraphQLFS;

  /**
   * @deprecated use `getExperiments` instead
   */
  SampleReader = new SampleReader();
  telemetryLogStream?: fs.WriteStream;
  checkForDownloadsRunning?: boolean;
  dirScanInProgress?: boolean;
  uploadMessageQueue?: unknown;
  downloadMessageQueue?: unknown;
  stateReportTime?: number;
  downloadWorkerPool?: Dictionary;
  stopped = true;
  config: Configuration;
  graphQL: GraphQLFS;
  states: States = {
    download: createDownloadState(),
    upload: createUploadState(),
    warnings: [],
  };

  // placeholders for all the timers we might want to cancel if forcing a stop
  timers: {
    downloadCheckInterval?: Timer;
    stateCheckInterval?: Timer;
    fileCheckInterval?: Timer;
    transferTimeouts: Dictionary<Timer>;
    visibilityIntervals: Dictionary<Timer>;
    summaryTelemetryInterval?: Timer;
  } = {
    transferTimeouts: {},
    visibilityIntervals: {},
  };

  uploadState$ = new BehaviorSubject(false);
  analyseState$ = new BehaviorSubject(false);
  reportState$ = new BehaviorSubject(false);
  runningStates$ = combineLatest([this.uploadState$, this.analyseState$, this.reportState$]);
  liveStates$ = new BehaviorSubject(this.states);

  // NOTE emits a signal exactly once, after uploadState changes from true, to false
  uploadStopped$ = this.uploadState$.pipe(
    skipWhile((state) => !state),
    takeWhile((state) => state, true),
    filter((state) => !state),
    mapTo(true),
  );

  // NOTE emits a signal exactly once, after analyseState changes from true, to false
  analysisStopped$ = this.analyseState$.pipe(
    skipWhile((state) => !state),
    takeWhile((state) => state, true),
    filter((state) => !state),
    mapTo(true),
  );

  instanceTelemetry$ = new BehaviorSubject<(JSONObject | null)[]>([]);
  experimentalWorkerStatus$ = new BehaviorSubject<
    {
      running: number;
      complete: number;
      error: number;
      step: number;
      name: string;
    }[]
  >([]);

  private telemetry?: Telemetry;
  private sqs?: AWS.SQS;
  private s3?: AWS.S3;
  private socket?: Socket;
  readonly proxyAgent?: Agent;
  readonly log: Logger;

  constructor(opts: Partial<EPI2ME_OPTIONS>) {
    const options = parseOptions(opts);
    const { idWorkflowInstance, log, proxy } = options;

    this.config = {
      options: options,
      instance: {
        id_workflow_instance: idWorkflowInstance,
        discoverQueueCache: {},
      },
    };

    this.log = log;

    const hasProxy = isDefined(proxy);
    const proxyAgent = hasProxy ? ProxyAgent(proxy) : undefined;

    this.proxyAgent = proxyAgent;
    this.graphQL = new GraphQLFS(this.config.options, proxyAgent);
  }

  get id(): Index {
    return asIndex(this.config.instance.id_workflow_instance);
  }

  get url(): string {
    return asDefined(this.config.options.url);
  }

  async stopEverything(): Promise<void> {
    await this.stopAnalysis();

    this.stopTransferTimers();
    this.stopVisibilityTimers();
    this.stopDownloadWorkers();

    if (this.socket) {
      this.socket.destroy();
    }

    this.stopTimer('summaryTelemetryInterval');
    this.stopTimer('downloadCheckInterval');
  }

  private stopTimer(
    intervalGroupName:
      | 'downloadCheckInterval'
      | 'stateCheckInterval'
      | 'fileCheckInterval'
      | 'summaryTelemetryInterval',
  ): void {
    const timer = this.timers[intervalGroupName];
    if (timer) {
      this.log.debug(`clearing ${intervalGroupName} interval`);
      timer.cancel();
      delete this.timers[intervalGroupName];
    }
  }

  private stopTimeout(timerGroupName: 'transferTimeouts', timerName: string): void {
    const timeout = this.timers[timerGroupName][timerName];
    if (timeout) {
      timeout.cancel();
      delete this.timers[timerGroupName][timerName];
    }
  }

  private stopTransferTimers(): void {
    for (const key in this.timers.transferTimeouts) {
      this.log.debug(`clearing transferTimeout for ${key}`);
      const timer = this.timers.transferTimeouts[key];
      // NOTE id should always be defined here, this is purely for type checking
      if (timer) {
        timer.cancel();
      }
      delete this.timers.transferTimeouts[key];
    }
  }

  private stopVisibilityTimers(): void {
    for (const key in this.timers.visibilityIntervals) {
      this.log.debug(`clearing visibilityInterval for ${key}`);
      const timer = this.timers.visibilityIntervals[key];
      if (timer) {
        timer.cancel();
      }
      delete this.timers.visibilityIntervals[key];
    }
  }

  private async stopDownloadWorkers(): Promise<void> {
    if (this.downloadWorkerPool) {
      this.log.debug('clearing downloadWorkerPool');
      await Promise.all(Object.values(this.downloadWorkerPool));
      delete this.downloadWorkerPool;
    }
  }

  async stopAnalysis(): Promise<void> {
    // If we stop the cloud, there's no point uploading any more
    this.stopUpload();
    // This will stop all the intervals on their next call
    this.stopped = true;

    const { id_workflow_instance: id } = this.config.instance;

    if (!id) {
      return;
    }

    try {
      await this.graphQL.stopWorkflow({ instance: id.toString() });

      this.analyseState$.next(false);
      this.analyseState$.complete();
    } catch (err) {
      throw wrapAndLogError('error stopping instance', err, this.log);
    }

    this.log.info(`workflow instance ${id} stopped`);
  }

  stopUpload(): void {
    this.log.debug('stopping watchers');

    this.stopTimer('stateCheckInterval');
    this.stopTimer('fileCheckInterval');

    this.uploadState$.next(false);
    this.uploadState$.complete();
  }

  private fetchToken = async (): Promise<InstanceTokenMutation> => {
    const result = await this.graphQL.instanceToken({ instance: this.id.toString() });
    return asDefined(result.token);
  };

  sessionedS3(options: AWS.S3.ClientConfiguration = {}): AWS.S3 {
    const credentials = new Epi2meCredentials(this.fetchToken, this.config.options.sessionGrace);
    // Will need to prefetch a token to access region before creating the S3 service
    return new AWS.S3({
      useAccelerateEndpoint: this.config.options.awsAcceleration === 'on',
      ...options,
      region: this.config.instance.region,
      credentials,
      httpOptions: {
        agent: this.proxyAgent,
      },
    });
  }

  sessionedSQS(options: AWS.SQS.ClientConfiguration = {}): AWS.SQS {
    const credentials = new Epi2meCredentials(this.fetchToken, this.config.options.sessionGrace);
    return new AWS.SQS({
      ...options,
      region: this.config.instance.region,
      credentials,
      httpOptions: {
        agent: this.proxyAgent,
      },
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

  async deleteMessage(message: Pick<AWS.SQS.Message, 'ReceiptHandle'>): Promise<unknown> {
    try {
      assertDefined(this.config.instance.outputQueueName, 'Output Queue Name');

      const queueURL = await this.discoverQueue(this.config.instance.outputQueueName);
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

  async discoverQueue(queueName: string): Promise<string> {
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
      throw new Error('unexpected response from getQueueAttributes');
    } catch (err) {
      throw wrapAndLogError('error in getQueueAttributes', err, this.log);
    }
  }

  async autoStart(variables: StartWorkflowMutationVariables): Promise<Configuration['instance']> {
    this.stopped = false;

    let instance;
    try {
      const response = await this.graphQL.startWorkflow(variables);
      instance = asDefined(response?.startData);
    } catch (err) {
      throw wrapAndLogError('failed to start workflow', err, this.log);
    }

    this.analyseState$.next(true);
    this.config.workflow = JSON.parse(JSON.stringify(variables)); // object copy
    this.log.info(`instance ${JSON.stringify(instance)}`);
    this.log.info(`workflow config ${JSON.stringify(this.config.workflow)}`);

    this.setClassConfig(instance);
    // Pass this.config.instance because we need the old format
    // This can be improved
    return this.autoConfigure(this.config.instance);
  }

  private validateChain(chain: unknown): ReturnType<typeof asChain> {
    return asChain(isString(chain) ? JSON.parse(chain) : chain);
  }

  private setClassConfig(startData: StartWorkflowMutation['startData']): void {
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
      await fs.promises.mkdir(this.config.options.outputFolder, { recursive: true });
    } catch (err) {
      if (asNodeError(err).code !== 'EEXIST') {
        throw wrapAndLogError('failed to create output folder', err, this.log);
      }
    }

    // MC-7108 use common epi2me working folder
    const instancesDir = path.join(rootDir(), 'instances');
    const thisInstanceDir = path.join(instancesDir, makeString(this.config.instance.id_workflow_instance));
    try {
      await fs.promises.mkdir(thisInstanceDir, { recursive: true });
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
      await fs.promises.mkdir(telemetryLogFolder, { recursive: true });
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

    this.observeTelemetry();

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
        const response = await this.graphQL.workflowInstance({ instance: this.id.toString() });
        // state should always be defined, but stop date won't exist until it's been stopped
        const state = response.workflowInstance?.state;
        const stopDate = response.workflowInstance?.stopDate;

        if (state === 'stopped') {
          this.log.warn(`instance was stopped remotely at ${stopDate}. shutting down the workflow.`);
          try {
            await this.stopEverything();

            const remoteShutdownCb = asOptFunction(this.config.options.remoteShutdownCb);
            if (remoteShutdownCb) {
              remoteShutdownCb(`instance was stopped remotely at ${stopDate}`);
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
      assertDefined(this.config.instance.outputQueueName, 'Output Queue Name');

      const queueURL = await this.discoverQueue(this.config.instance.outputQueueName);
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
      assertDefined(this.config.instance.outputQueueName, 'Output Queue Name');

      const queueURL = await this.discoverQueue(this.config.instance.outputQueueName);
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

  private incrementDownloadFailure(msg: string, err: unknown): NestedError {
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

  async receiveMessages(
    receiveMessages?: Pick<PromiseResult<AWS.SQS.ReceiveMessageResult, AWS.AWSError>, 'Messages'>,
  ): Promise<void> {
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

  async processMessage(
    message?: Pick<AWS.SQS.Message, 'Attributes' | 'MessageId' | 'Body' | 'ReceiptHandle'>,
  ): Promise<void> {
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
        this.log.error(NestedError.formatMessage('error writing telemetry', err));
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
    let folder = path.join(asString(this.config.options.outputFolder), `${idWorkflowInstance ?? ''}`);

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
      folder = path.join(...[folder, ...codes]);
    }

    try {
      await fs.promises.mkdir(folder, { recursive: true });
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

    return new Promise<void>((resolve, reject) => {
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
            await fs.promises.unlink(outputFile);
            this.log.warn(`removed failed download ${outputFile}`);
          } catch (err) {
            if (isNodeError(err) && err.code !== 'ENOENT') {
              throw new NestedError(`failed to delete ${outputFile}`, err);
            }
          }
        } catch (err) {
          this.log.error(NestedError.formatMessage('error while trying to recover from download stream error', err));
        }

        // well this doesn't work!
        if (rs instanceof fs.ReadStream && rs.destroy) {
          // && !rs.destroyed) {
          this.log.error(`destroying read stream for ${outputFile}`);
          rs.destroy();
        }

        reject(err);
      };

      try {
        const params = {
          Bucket: s3Item.bucket,
          Key: s3Item.path,
        };

        // MC-6270 : disable append to avoid appending the same data
        // file = fs.createWriteStream(outputFile, { "flags": "a" });
        file = fs.createWriteStream(outputFile);

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

        assertDefined(this.config.instance.outputQueueName, 'Output Queue Name');

        const queueUrl = await this.discoverQueue(this.config.instance.outputQueueName);
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
              QueueUrl: queueUrl,
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

  private downloadState(
    table: 'success' | 'types' | 'progress',
    op: string,
    newData: Dictionary<Optional<number>>,
  ): void {
    const direction = 'upload';
    const state: DownloadState = this.states.download ?? createDownloadState();

    if (table === 'success') {
      this.updateSuccessState(state.success, op, newData);
    } else if (table === 'types') {
      this.updateTypesState(state.types, op, newData);
    } else {
      this.updateProgressState(state.progress, op, newData);
    }

    // Prettify new totals
    try {
      state.success.niceReads = niceSize(this.states[direction].success.reads);
    } catch {
      state.success.niceReads = 0;
    }

    try {
      // complete plus in-transit
      state.progress.niceSize = niceSize(state.success.bytes + state.progress.bytes ?? 0);
    } catch {
      state.progress.niceSize = 0;
    }

    try {
      // complete
      state.success.niceSize = niceSize(this.states[direction].success.bytes);
    } catch {
      state.success.niceSize = 0;
    }

    state.niceTypes = Object.keys(this.states[direction].types || {})
      .sort()
      .map((fileType) => {
        return `${this.states[direction].types[fileType]} ${fileType}`;
      })
      .join(', ');

    const now = Date.now();
    if (!this.stateReportTime || now - this.stateReportTime > 2000) {
      // report at most every 2 seconds
      this.stateReportTime = now;
      this.reportProgress();
    }
    this.liveStates$.next({ ...this.states });
  }

  uploadState(table: 'success' | 'types' | 'progress', op: string, newData: Dictionary<number>): void {
    const direction = 'upload';
    const state: UploadState = this.states.upload ?? createUploadState();

    if (table === 'success') {
      this.updateSuccessState(state.success, op, newData);
    } else if (table === 'types') {
      this.updateTypesState(state.types, op, newData);
    } else {
      this.updateProgressState(state.progress, op, newData);
    }

    // Prettify new totals
    try {
      state.success.niceReads = niceSize(this.states[direction].success.reads);
    } catch {
      state.success.niceReads = 0;
    }

    try {
      // complete plus in-transit
      state.progress.niceSize = niceSize(state.success.bytes + state.progress.bytes ?? 0);
    } catch {
      state.progress.niceSize = 0;
    }

    try {
      // complete
      state.success.niceSize = niceSize(this.states[direction].success.bytes);
    } catch {
      state.success.niceSize = 0;
    }

    state.niceTypes = Object.keys(this.states[direction].types || {})
      .sort()
      .map((fileType) => {
        return `${this.states[direction].types[fileType]} ${fileType}`;
      })
      .join(', ');

    const now = Date.now();
    if (!this.stateReportTime || now - this.stateReportTime > 2000) {
      // report at most every 2 seconds
      this.stateReportTime = now;
      this.reportProgress();
    }
    this.liveStates$.next({ ...this.states });
  }

  private reportProgress(): void {
    const { upload, download } = this.states;
    this.log.debug(
      JSON.stringify({
        progress: {
          download,
          upload,
        },
      }),
    );
  }

  private updateSuccessState(state: SuccessState, op: string, newData: Dictionary<Optional<number>>): void {
    const safeKeys = new Set(['files', 'bytes', 'reads']);
    for (const key of Object.keys(newData)) {
      // Increment or decrement
      const sign = op === 'incr' ? 1 : -1;
      const delta = sign * (newData[key] ?? 0);
      if (safeKeys.has(key)) {
        const typedKey = key as 'files' | 'bytes' | 'reads';
        state[typedKey] = state[typedKey] + delta;
      }
    }
  }

  private updateTypesState(state: Dictionary, op: string, newData: Dictionary<Optional<number>>): void {
    for (const key of Object.keys(newData)) {
      // Increment or decrement
      const sign = op === 'incr' ? 1 : -1;
      const delta = sign * (newData[key] ?? 0);
      state[key] = asNumber(state[key], 0) + delta;
    }
  }

  private updateProgressState(state: ProgressState, op: string, newData: Dictionary<Optional<number>>): void {
    const safeKeys = new Set(['bytes', 'total']);
    for (const key of Object.keys(newData)) {
      // Increment or decrement
      const sign = op === 'incr' ? 1 : -1;
      const delta = sign * (newData[key] ?? 0);
      if (safeKeys.has(key)) {
        const typedKey = key as 'bytes' | 'total';
        state[typedKey] = state[typedKey] + delta;
      }
    }
  }

  private observeTelemetry(): void {
    if (this.telemetry) {
      throw new Error('telemetry is already instantiated');
    }

    const instanceDir = path.join(rootDir(), 'instances', makeString(this.config.instance.id_workflow_instance));
    const telemetryNames = this.config?.instance?.telemetryNames;
    const idWorkflowInstance = makeString(this.config.instance.id_workflow_instance);

    this.telemetry = Telemetry.connect(idWorkflowInstance, this.graphQL, asDefined(telemetryNames), this.proxyAgent);

    // const reports$ = this.telemetry.telemetryReports$().pipe(filter(isDefined));

    const { add: writeQueue } = createQueue(
      { signal$: this.analysisStopped$ },
      async ([filePath, content]: [string, JSONValue]) => {
        try {
          await fs.promises.writeFile(filePath, JSON.stringify(content));
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

  realtimeFeedback(channel: string, object: unknown): void {
    this.getSocket().emit(channel, object);
  }

  getSocket(): Socket {
    if (this.socket) {
      return this.socket;
    }

    const socket = new Socket(this.config.options, this.graphQL, this.proxyAgent);
    const { id_workflow_instance: id } = this.config.instance;

    if (id) {
      socket.watch(`workflow_instance:state:${id}`, this.updateWorkerStatus);
    }

    this.socket = socket;
    return socket;
  }

  private updateWorkerStatus = (newWorkerStatus: unknown): void => {
    const { instance: instanceConfig } = this.config;
    const components = instanceConfig.chain?.components;

    if (!components) {
      return;
    }

    const summaryTelemetry = asDictionary(instanceConfig.summaryTelemetry);
    const workerStatus = Object.entries(components).sort((a, b) => parseInt(a[0], 10) - parseInt(b[0], 10));
    const indexableNewWorkerStatus = asIndexable(newWorkerStatus);
    const results = [];

    for (const [key, value] of workerStatus) {
      if (key in indexableNewWorkerStatus) {
        const step = +key;
        let name = 'ROOT';
        if (step !== 0) {
          const wid = asIndex(asDictionary(value).wid);
          name = Object.keys(asDictionary(summaryTelemetry[wid]))[0] ?? 'ROOT';
        }
        const [running, complete, error] = asString(indexableNewWorkerStatus[key])
          .split(',')
          .map((componentID) => Math.max(0, +componentID)); // It's dodgy but assuming the componentID is a number happens all over the place

        results.push({
          running,
          complete,
          error,
          step,
          name,
        });
      }
    }

    this.experimentalWorkerStatus$.next(results);
  };
}
