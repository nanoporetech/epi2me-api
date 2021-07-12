/* eslint no-console: ["error", { allow: ["log", "info", "debug", "warn", "error"] }] */
/*
 * Copyright (c) 2018 Metrichor Ltd.
 * Author: rpettett
 * When: A long time ago, in a galaxy far, far away
 *
 */

import { BehaviorSubject, combineLatest } from 'rxjs';
import DEFAULTS from './default_options.json';
import { GraphQL } from './graphql';
import { niceSize } from './niceSize';
import { REST } from './rest';
import Socket from './socket';
import { utils } from './utils';
import { Logger } from './Logger';
import {
  asDictionary,
  asOptString,
  asOptBoolean,
  asString,
  asNumber,
  asArrayOf,
  asOptNumber,
  asIndexable,
  asIndex,
  asOptFunction,
  asOptDictionary,
  asOptIndex,
  Index,
  Dictionary,
  Optional,
  JSONObject,
  UnknownFunction,
  asJSONObject,
  isString,
} from 'ts-runtime-typecheck';
import {
  createUploadState,
  createDownloadState,
  States,
  UploadState,
  DownloadState,
  Warning,
  SuccessState,
  ProgressState,
} from './epi2me-state';

import { createInterval } from './timers';
import { parseCoreOpts } from './parseCoreOpts';

import type { EPI2ME_OPTIONS } from './epi2me-options';
import type { Configuration } from './Configuration';
import type { Timer } from './timer.type';

import { filter, mapTo, skipWhile, takeWhile } from 'rxjs/operators';
import { REST_FS } from './rest-fs';
export class EPI2ME {
  static version = utils.version;
  static utils = utils;

  readonly log: Logger;
  // TODO this is only used in FS, it should be moved
  stopped = true;

  uploadState$ = new BehaviorSubject(false);
  analyseState$ = new BehaviorSubject(false);
  reportState$ = new BehaviorSubject(false);
  runningStates$ = combineLatest([this.uploadState$, this.analyseState$, this.reportState$]);

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

  stateReportTime?: number;
  liveStates$ = new BehaviorSubject(this.states);
  downloadWorkerPool?: Dictionary;

  config: Configuration;
  REST: REST | REST_FS;
  graphQL: GraphQL;
  mySocket?: Socket;

  constructor(optstring: Partial<EPI2ME_OPTIONS> | string = {}) {
    let options: EPI2ME_OPTIONS;
    if (typeof optstring === 'string') {
      const json = asJSONObject(JSON.parse(optstring));
      // WARN maybe we should put a depreciation warning here
      // it's not particularly useful accepting a json string
      // and increases the required validation code
      options = EPI2ME.parseOptObject(json);
    } else {
      options = EPI2ME.parseOptObject(optstring);
    }

    this.config = {
      options: options,
      instance: {
        id_workflow_instance: options.id_workflow_instance,
        discoverQueueCache: {},
        awssettings: {
          region: options.region,
        },
      },
    };

    this.log = options.log;
    this.REST = new REST(options);
    this.graphQL = new GraphQL(options);
  }

  get id(): Index {
    return asIndex(this.config.instance.id_workflow_instance);
  }

  // apikey?: string;
  // apisecret?: string;

  // jwt?: string;

  static parseOptObject(opt: Dictionary | Partial<EPI2ME_OPTIONS>): EPI2ME_OPTIONS {
    const downloadMode = asString(opt.downloadMode, DEFAULTS.downloadMode);

    switch (downloadMode) {
      case 'data':
      case 'telemetry':
      case 'none':
      case 'data+telemetry':
        break;
      default:
        throw new Error(`Invalid downloadMode ${downloadMode}`);
    }

    const options = {
      ...parseCoreOpts(opt),
      region: asString(opt.region, DEFAULTS.region),
      sessionGrace: asNumber(opt.sessionGrace, DEFAULTS.sessionGrace),
      uploadTimeout: asNumber(opt.uploadTimeout, DEFAULTS.uploadTimeout),
      uploadRetries: asNumber(opt.uploadRetries, DEFAULTS.uploadRetries),
      downloadTimeout: asNumber(opt.downloadTimeout, DEFAULTS.downloadTimeout),
      fileCheckInterval: asNumber(opt.fileCheckInterval, DEFAULTS.fileCheckInterval),
      downloadCheckInterval: asNumber(opt.downloadCheckInterval, DEFAULTS.downloadCheckInterval),
      stateCheckInterval: asNumber(opt.stateCheckInterval, DEFAULTS.stateCheckInterval),
      inFlightDelay: asNumber(opt.inFlightDelay, DEFAULTS.inFlightDelay),
      waitTimeSeconds: asNumber(opt.waitTimeSeconds, DEFAULTS.waitTimeSeconds),
      waitTokenError: asNumber(opt.waitTokenError, DEFAULTS.waitTokenError),
      transferPoolSize: asNumber(opt.transferPoolSize, DEFAULTS.transferPoolSize),
      downloadMode,
      filetype: asArrayOf(isString)(opt.filetype, DEFAULTS.filetype),
      sampleDirectory: asString(opt.sampleDirectory, DEFAULTS.sampleDirectory),
      // optional values
      useGraphQL: asOptBoolean(opt.useGraphQL),
      id_workflow_instance: asOptIndex(opt.id_workflow_instance),
      debounceWindow: asOptNumber(opt.debounceWindow),
      proxy: asOptString(opt.proxy),
      // EPI2ME-FS options
      inputFolders: asArrayOf(isString)(opt.inputFolders, []),
      outputFolder: asOptString(opt.outputFolder),
      awsAcceleration: asOptString(opt.awsAcceleration),
      agent_address: asOptString(opt.agent_address),
      telemetryCb: asOptFunction(opt.telemetryCb),
      dataCb: asOptFunction(opt.dataCb),
      remoteShutdownCb: asOptFunction(opt.remoteShutdownCb),
    };

    if (opt.inputFolder) {
      options.inputFolders.push(asString(opt.inputFolder));
    }

    return options;
  }

  async socket(): Promise<Socket> {
    if (this.mySocket) {
      return this.mySocket;
    }

    this.mySocket = new Socket(this.REST, this.config.options);
    const { id_workflow_instance: idWorkflowInstance } = this.config.instance;
    if (idWorkflowInstance) {
      this.mySocket.watch(`workflow_instance:state:${idWorkflowInstance}`, (newWorkerStatus) => {
        const { instance: instanceConfig } = this.config;
        const components = asOptDictionary(instanceConfig.chain?.components);
        if (components) {
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
        }
      });
    }
    return this.mySocket;
  }

  async realtimeFeedback(channel: string, object: unknown): Promise<void> {
    const socket = await this.socket();
    socket.emit(channel, object);
  }

  setTimer(
    intervalName: 'downloadCheckInterval' | 'stateCheckInterval' | 'fileCheckInterval' | 'summaryTelemetryInterval',
    intervalDuration: number,
    cb: UnknownFunction,
  ): void {
    if (this.timers[intervalName]) {
      throw new Error(`An interval with the name ${intervalName} has already been created`);
    }
    this.timers[intervalName] = createInterval(intervalDuration, cb);
  }

  stopTimer(
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

  stopTimeout(timerGroupName: 'transferTimeouts', timerName: string): void {
    const timeout = this.timers[timerGroupName][timerName];
    if (timeout) {
      timeout.cancel();
      delete this.timers[timerGroupName][timerName];
    }
  }

  async stopAnalysis(): Promise<void> {
    // If we stop the cloud, there's no point uploading anymore
    this.stopUpload();
    // This will stop all the intervals on their next call
    this.stopped = true;

    const { id_workflow_instance: idWorkflowInstance } = this.config.instance;
    if (idWorkflowInstance) {
      try {
        // TODO: Convert to GQL and switch on class-wide flag
        if (this.config.options.useGraphQL) {
          await this.graphQL.stopWorkflow({ variables: { idWorkflowInstance } });
        } else {
          await this.REST.stopWorkflow(idWorkflowInstance);
        }
        this.analyseState$.next(false);
      } catch (stopException) {
        this.log.error(`Error stopping instance: ${String(stopException)}`);
        throw stopException;
      }

      this.log.info(`workflow instance ${idWorkflowInstance} stopped`);
    }
  }

  stopUpload(): void {
    this.log.debug('stopping watchers');

    this.stopTimer('stateCheckInterval');
    this.stopTimer('fileCheckInterval');

    this.uploadState$.next(false);
  }

  async stopEverything(): Promise<void> {
    this.stopAnalysis();
    // Moved this out of the main stopUpload because we don't want to stop it when we stop uploading
    // This is really 'stop fetching reports'

    for (const key in this.timers.transferTimeouts) {
      this.log.debug(`clearing transferTimeout for ${key}`);
      const timer = this.timers.transferTimeouts[key];
      // NOTE id should always be defined here, this is purely for type checking
      if (timer) {
        timer.cancel();
      }
      delete this.timers.transferTimeouts[key];
    }

    for (const key in this.timers.visibilityIntervals) {
      this.log.debug(`clearing visibilityInterval for ${key}`);
      const timer = this.timers.visibilityIntervals[key];
      if (timer) {
        timer.cancel();
      }
      delete this.timers.visibilityIntervals[key];
    }

    if (this.downloadWorkerPool) {
      this.log.debug('clearing downloadWorkerPool');
      await Promise.all(Object.values(this.downloadWorkerPool));
      delete this.downloadWorkerPool;
    }

    this.stopTimer('summaryTelemetryInterval');
    this.stopTimer('downloadCheckInterval');
  }

  reportProgress(): void {
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
    } catch (ignore) {
      state.success.niceReads = 0;
    }

    try {
      // complete plus in-transit
      state.progress.niceSize = niceSize(state.success.bytes + state.progress.bytes ?? 0);
    } catch (ignore) {
      state.progress.niceSize = 0;
    }

    try {
      // complete
      state.success.niceSize = niceSize(this.states[direction].success.bytes);
    } catch (ignore) {
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

  downloadState(table: 'success' | 'types' | 'progress', op: string, newData: Dictionary<Optional<number>>): void {
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
    } catch (ignore) {
      state.success.niceReads = 0;
    }

    try {
      // complete plus in-transit
      state.progress.niceSize = niceSize(state.success.bytes + state.progress.bytes ?? 0);
    } catch (ignore) {
      state.progress.niceSize = 0;
    }

    try {
      // complete
      state.success.niceSize = niceSize(this.states[direction].success.bytes);
    } catch (ignore) {
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

  updateSuccessState(state: SuccessState, op: string, newData: Dictionary<Optional<number>>): void {
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

  updateTypesState(state: Dictionary, op: string, newData: Dictionary<Optional<number>>): void {
    for (const key of Object.keys(newData)) {
      // Increment or decrement
      const sign = op === 'incr' ? 1 : -1;
      const delta = sign * (newData[key] ?? 0);
      state[key] = asNumber(state[key], 0) + delta;
    }
  }

  updateProgressState(state: ProgressState, op: string, newData: Dictionary<Optional<number>>): void {
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

  url(): string | undefined {
    return this.config.options.url;
  }

  apikey(): string | undefined {
    return this.config.options.apikey;
  }

  stats(key: keyof States): UploadState | DownloadState | Warning[] {
    return this.states[key];
  }
}
