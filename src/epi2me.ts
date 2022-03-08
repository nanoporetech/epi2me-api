/* eslint no-console: ["error", { allow: ["log", "info", "debug", "warn", "error"] }] */
/*
 * Copyright (c) 2018 Metrichor Ltd.
 * Author: rpettett
 * When: A long time ago, in a galaxy far, far away
 *
 */
import type { Logger } from './Logger.type';
import type { EPI2ME_OPTIONS } from './epi2me-options.type';
import type { Configuration } from './Configuration.type';
import type { Timer } from './timer.type';
import type { REST_FS } from './rest-fs';
import type { Index, Dictionary, Optional, JSONObject, UnknownFunction } from 'ts-runtime-typecheck';
import type { States, UploadState, DownloadState, Warning, SuccessState, ProgressState } from './epi2me-state.type';
import type { Duration } from './Duration';

import { BehaviorSubject, combineLatest } from 'rxjs';
import { GraphQL } from './graphql';
import { niceSize } from './niceSize';
import { REST } from './rest';
import { utils } from './utils';
import { asDictionary, asString, asNumber, asIndexable, asIndex, asDefined } from 'ts-runtime-typecheck';
import { createUploadState, createDownloadState } from './epi2me-state';
import { createInterval } from './timers';
import { parseOptions } from './parseOptions';
import { filter, mapTo, skipWhile, takeWhile } from 'rxjs/operators';
import { wrapAndLogError } from './NodeError';
import { DEFAULT_OPTIONS } from './default_options';
import type Socket from './socket';
export class EPI2ME {
  static version = DEFAULT_OPTIONS.agent_version;
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
  socket?: Socket;

  constructor(optstring: Partial<EPI2ME_OPTIONS> = {}) {
    const options = parseOptions(optstring);
    const { idWorkflowInstance, log } = options;
    this.config = {
      options: options,
      instance: {
        id_workflow_instance: idWorkflowInstance,
        discoverQueueCache: {},
      },
    };

    this.log = log;
    this.REST = new REST(options);
    this.graphQL = new GraphQL(options);
  }

  get id(): Index {
    return asIndex(this.config.instance.id_workflow_instance);
  }

  updateWorkerStatus = (newWorkerStatus: unknown): void => {
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

  setTimer(
    intervalName: 'downloadCheckInterval' | 'stateCheckInterval' | 'fileCheckInterval' | 'summaryTelemetryInterval',
    intervalDuration: Duration,
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

  async stopAnalysis(): Promise<void> {
    // If we stop the cloud, there's no point uploading anymore
    this.stopUpload();
    // This will stop all the intervals on their next call
    this.stopped = true;

    const { id_workflow_instance: id } = this.config.instance;

    if (!id) {
      return;
    }

    try {
      if (this.config.options.useGraphQL) {
        await this.graphQL.stopWorkflow({ instance: id.toString() });
      } else {
        await this.REST.stopWorkflow(id);
      }
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

  url(): string {
    return asDefined(this.config.options.url);
  }

  apikey(): string | undefined {
    return this.config.options.apikey;
  }

  stats(key: keyof States): UploadState | DownloadState | Warning[] {
    return this.states[key];
  }
}
