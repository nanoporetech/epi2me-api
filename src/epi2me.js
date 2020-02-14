/* eslint no-console: ["error", { allow: ["log", "info", "debug", "warn", "error"] }] */
/*
 * Copyright (c) 2018 Metrichor Ltd.
 * Author: rpettett
 * When: A long time ago, in a galaxy far, far away
 *
 */

import { defaults, every, isFunction, merge } from 'lodash';
import { BehaviorSubject, Subscription } from 'rxjs';
import { map, withLatestFrom } from 'rxjs/operators';
import DEFAULTS from './default_options.json';
import GraphQL from './graphql';
import niceSize from './niceSize';
import Profile from './profile';
import REST from './rest';
import Socket from './socket';
import utils from './utils';

export default class EPI2ME {
  constructor(OptString) {
    let opts;
    if (typeof OptString === 'string' || (typeof OptString === 'object' && OptString.constructor === String)) {
      opts = JSON.parse(OptString);
    } else {
      opts = OptString || {};
    }

    // keep data members in-common with profiles
    if (opts.endpoint) {
      opts.url = opts.endpoint;
      delete opts.endpoint;
    }

    if (opts.log) {
      if (every([opts.log.info, opts.log.warn, opts.log.error, opts.log.debug, opts.log.json], isFunction)) {
        this.log = opts.log;
      } else {
        throw new Error('expected log object to have error, debug, info, warn and json methods');
      }
    } else {
      this.log = {
        info: msg => {
          console.info(`[${new Date().toISOString()}] INFO: ${msg}`);
        },
        debug: msg => {
          // eslint-disable-next-line
          console.debug(`[${new Date().toISOString()}] DEBUG: ${msg}`);
        },
        warn: msg => {
          console.warn(`[${new Date().toISOString()}] WARN: ${msg}`);
        },
        error: msg => {
          console.error(`[${new Date().toISOString()}] ERROR: ${msg}`);
        },
        json: obj => {
          console.log(JSON.stringify(obj));
        },
      };
    }

    this.stopped = true;

    this.runningStatesStore = new BehaviorSubject({
      uploading: false,
      analysing: false,
      telemetry: false,
    });

    this.updateRunningState = new BehaviorSubject({});

    this.runningStates$ = this.updateRunningState.pipe(
      withLatestFrom(this.runningStatesStore),
      map(([update, store]) => ({ ...store, ...update })),
    );

    this.subscription = new Subscription();

    this.states = {
      upload: {
        filesCount: 0, // internal. do not use
        success: {
          files: 0,
          bytes: 0,
          reads: 0,
        }, // successfully uploaded file count, bytes, reads
        //        failure: {}, // failed upload counts by error message
        types: {}, // completely uploaded file counts by file type {".fastq": 1, ".vcf": 17}
        niceTypes: '', // "1 .fastq, 17.vcf"
        progress: {
          bytes: 0,
          total: 0,
        }, // uploads in-flight: bytes, total
      },
      download: {
        progress: {}, // downloads in-flight: bytes, total
        success: {
          files: 0,
          reads: 0,
          bytes: 0,
        },
        fail: 0,
        //        failure: {}, // failed download count by error message
        types: {}, // completely downloaded file counts by file type {".fastq": 17, ".vcf": 1}
        niceTypes: '', // "17 .fastq, 1.vcf"
      },
      warnings: [],
    };

    this.liveStates$ = new BehaviorSubject(this.states);

    this.config = {
      options: defaults(opts, DEFAULTS),
      instance: {
        id_workflow_instance: opts.id_workflow_instance,
        inputQueueName: null,
        outputQueueName: null,
        outputQueueURL: null,
        discoverQueueCache: {},
        bucket: null,
        bucketFolder: null,
        remote_addr: null,
        chain: null,
        key_id: null,
      },
    };

    this.config.instance.awssettings = {
      region: this.config.options.region,
    };

    this.REST = new REST(
      merge(
        {
          log: this.log,
        },
        this.config.options,
      ),
    );

    this.graphQL = new GraphQL(
      merge(
        {
          log: this.log,
        },
        this.config.options,
      ),
    );
    // placeholders for all the timers we might want to cancel if forcing a stop
    this.timers = {
      downloadCheckInterval: null,
      stateCheckInterval: null,
      fileCheckInterval: null,
      transferTimeouts: {},
      visibilityIntervals: {},
      summaryTelemetryInterval: null,
    };
  }

  async socket() {
    if (this.mySocket) {
      return this.mySocket;
    }

    this.mySocket = new Socket(
      this.REST,
      merge(
        {
          log: this.log,
        },
        this.config.options,
      ),
    );

    return this.mySocket;
  }

  async realtimeFeedback(channel, object) {
    const socket = await this.socket();
    socket.emit(channel, object);
  }

  stopTimer(intervalName) {
    if (this.timers[intervalName]) {
      this.log.debug(`clearing ${intervalName} interval`);
      clearInterval(this.timers[intervalName]);
      this.timers[intervalName] = null;
    }
  }

  async stopAnalysis() {
    // If we stop the cloud, there's no point uploading anymore
    this.stopUpload();

    const { id_workflow_instance: idWorkflowInstance } = this.config.instance;
    if (idWorkflowInstance) {
      try {
        await this.REST.stopWorkflow(idWorkflowInstance);
        this.runningStates$.next({ analysing: false });
      } catch (stopException) {
        this.log.error(`Error stopping instance: ${String(stopException)}`);
        return Promise.reject(stopException);
      }

      this.log.info(`workflow instance ${idWorkflowInstance} stopped`);
    }
    return Promise.resolve();
  }

  async stopUpload() {
    this.stopped = true;

    this.log.debug('stopping watchers');

    ['downloadCheckInterval', 'stateCheckInterval', 'fileCheckInterval'].forEach(i => this.stopTimer(i));

    this.runningStates$.next({ uploading: false });

    Object.keys(this.timers.transferTimeouts).forEach(key => {
      this.log.debug(`clearing transferTimeout for ${key}`);
      clearTimeout(this.timers.transferTimeouts[key]);
      delete this.timers.transferTimeouts[key];
    });

    Object.keys(this.timers.visibilityIntervals).forEach(key => {
      this.log.debug(`clearing visibilityInterval for ${key}`);
      clearInterval(this.timers.visibilityIntervals[key]);
      delete this.timers.visibilityIntervals[key];
    });

    if (this.downloadWorkerPool) {
      this.log.debug('clearing downloadWorkerPool');
      await Promise.all(Object.values(this.downloadWorkerPool));
      this.downloadWorkerPool = null;
    }
    return Promise.resolve();
  }

  async stopEverything() {
    this.stopAnalysis();
    // Moved this out of the main stopUpload because we don't want to stop it when we stop uploading
    // This is really 'stop fetching reports'
    this.stopTimer('summaryTelemetryInterval');
  }

  reportProgress() {
    const { upload, download } = this.states;
    this.log.json({
      progress: {
        download,
        upload,
      },
    });
  }

  storeState(direction, table, op, newDataIn) {
    // Set up defaults if required
    const newData = newDataIn || {};
    if (!this.states[direction]) {
      this.states[direction] = {};
    }

    if (!this.states[direction][table]) {
      this.states[direction][table] = {};
    }

    // Increment or decrement
    if (op === 'incr') {
      Object.keys(newData).forEach(o => {
        this.states[direction][table][o] = this.states[direction][table][o]
          ? this.states[direction][table][o] + parseInt(newData[o], 10)
          : parseInt(newData[o], 10);
      });
    } else {
      Object.keys(newData).forEach(o => {
        this.states[direction][table][o] = this.states[direction][table][o]
          ? this.states[direction][table][o] - parseInt(newData[o], 10)
          : -parseInt(newData[o], 10);
      });
    }

    // Prettify new totals
    try {
      this.states[direction].success.niceReads = niceSize(this.states[direction].success.reads);
    } catch (ignore) {
      this.states[direction].success.niceReads = 0;
    }

    try {
      // complete plus in-transit
      this.states[direction].progress.niceSize = niceSize(
        this.states[direction].success.bytes + this.states[direction].progress.bytes || 0,
      );
    } catch (ignore) {
      this.states[direction].progress.niceSize = 0;
    }

    try {
      // complete
      this.states[direction].success.niceSize = niceSize(this.states[direction].success.bytes);
    } catch (ignore) {
      this.states[direction].success.niceSize = 0;
    }

    this.states[direction].niceTypes = Object.keys(this.states[direction].types || {})
      .sort()
      .map(fileType => {
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

  uploadState(table, op, newData) {
    return this.storeState('upload', table, op, newData);
  }

  downloadState(table, op, newData) {
    return this.storeState('download', table, op, newData);
  }

  url() {
    return this.config.options.url;
  }

  apikey() {
    return this.config.options.apikey;
  }

  attr(key, value) {
    if (key in this.config.options) {
      if (value) {
        this.config.options[key] = value;
      } else {
        return this.config.options[key];
      }
    } else {
      throw new Error(`config object does not contain property ${key}`);
    }
    return this;
  }

  stats(key) {
    return this.states[key];
  }

  startSubscription() {
    this.subscription.add(this.runningStates$.subscribe(state => this.runningStatesStore.next(state)));
  }

  stopSubscription() {
    this.subscription.unsubscribe();
  }
}

EPI2ME.version = utils.version;
EPI2ME.Profile = Profile;
EPI2ME.REST = REST; // to allow import { REST } from '@metrichor/epi2me-api'
EPI2ME.utils = utils;
