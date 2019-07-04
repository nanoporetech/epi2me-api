/* eslint no-console: ["error", { allow: ["log", "info", "debug", "warn", "error"] }] */
/*
 * Copyright (c) 2018 Metrichor Ltd.
 * Author: rpettett
 * When: A long time ago, in a galaxy far, far away
 *
 */

import { every, isFunction, defaults, merge } from 'lodash';
import AWS from 'aws-sdk';
import proxy from 'proxy-agent';
import Promise from 'core-js/features/promise'; // shim Promise.finally() for nw 0.29.4 nodejs
import utils from './utils';
import _REST from './rest';
import DEFAULTS from './default_options.json';

export default class EPI2ME {
  constructor(OptString) {
    let opts;
    if (typeof OptString === 'string' || (typeof OptString === 'object' && OptString.constructor === String)) {
      opts = JSON.parse(OptString);
    } else {
      opts = OptString || {};
    }

    if (opts.log) {
      if (every([opts.log.info, opts.log.warn, opts.log.error, opts.log.debug], isFunction)) {
        this.log = opts.log;
      } else {
        throw new Error('expected log object to have "error", "debug", "info" and "warn" methods');
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
      };
    }

    this.stopped = true;
    this.states = {
      upload: {
        filesCount: 0, // internal. do not use
        success: { files: 0, bytes: 0, reads: 0 }, // successfully uploaded file count, bytes, reads
        //        failure: {}, // failed upload counts by error message
        types: {}, // completely uploaded file counts by file type {".fastq": 1, ".vcf": 17}
        niceTypes: '', // "1 .fastq, 17.vcf"
        progress: { bytes: 0, total: 0 }, // uploads in-flight: bytes, total
      },
      download: {
        progress: {}, // downloads in-flight: bytes, total
        success: { files: 0, reads: 0, bytes: 0 },
        fail: 0,
        //        failure: {}, // failed download count by error message
        types: {}, // completely downloaded file counts by file type {".fastq": 17, ".vcf": 1}
        niceTypes: '', // "17 .fastq, 1.vcf"
      },
      warnings: [],
    };

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

    this.REST = new _REST(merge({}, { log: this.log }, this.config.options));

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

  async stopEverything() {
    this.stopped = true;

    this.log.debug('stopping watchers');

    ['downloadCheckInterval', 'stateCheckInterval', 'fileCheckInterval', 'summaryTelemetryInterval'].forEach(
      intervalName => {
        if (this.timers[intervalName]) {
          this.log.debug(`clearing ${intervalName} interval`);
          clearInterval(this.timers[intervalName]);
          this.timers[intervalName] = null;
        }
      },
    );

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

    const { id_workflow_instance: idWorkflowInstance } = this.config.instance;
    if (idWorkflowInstance) {
      try {
        await this.REST.stopWorkflow(idWorkflowInstance);
      } catch (stopException) {
        this.log.error(`Error stopping instance: ${String(stopException)}`);
        return Promise.reject(stopException);
      }

      this.log.info(`workflow instance ${idWorkflowInstance} stopped`);
    }

    return Promise.resolve(); // api changed
  }

  async session(children, opts) {
    /* MC-1848 all session requests are serialised through that.sessionQueue to avoid multiple overlapping requests */
    if (this.sessioning) {
      return Promise.resolve(); // resolve or reject? Throttle to n=1: bail out if there's already a job queued
    }

    if (!this.states.sts_expiration || (this.states.sts_expiration && this.states.sts_expiration <= Date.now())) {
      /* Ignore if session is still valid */

      /* queue a request for a new session token and hope it comes back in under this.config.options.sessionGrace time */
      this.sessioning = true;

      try {
        await this.fetchInstanceToken(children, opts);
        this.sessioning = false;
      } catch (err) {
        this.sessioning = false;
        this.log.error(`session error ${String(err)}`);
        return Promise.reject(err);
      }
    }

    return Promise.resolve();
  }

  /* NOTE: requesting a token with additional opts WILL POLLUTE THE GLOBAL STATE AND BE CACHED. USE WITH CAUTION */
  async fetchInstanceToken(children, opts) {
    if (!this.config.instance.id_workflow_instance) {
      return Promise.reject(new Error('must specify id_workflow_instance'));
    }

    if (this.states.sts_expiration && this.states.sts_expiration > Date.now()) {
      /* escape if session is still valid */
      return Promise.resolve();
    }

    this.log.debug('new instance token needed');

    try {
      const token = await this.REST.instanceToken(this.config.instance.id_workflow_instance, opts);
      this.log.debug(`allocated new instance token expiring at ${token.expiration}`);
      this.states.sts_expiration = new Date(token.expiration).getTime() - 60 * this.config.options.sessionGrace; // refresh token x mins before it expires
      // "classic" token mode no longer supported

      if (this.config.options.proxy) {
        AWS.config.update({
          httpOptions: { agent: proxy(this.config.options.proxy, true) },
        });
      }

      // MC-5418 - This needs to be done before the process starts uploading messages!
      AWS.config.update(this.config.instance.awssettings);
      AWS.config.update(token);
      if (children) {
        children.forEach(child => {
          try {
            child.config.update(token);
          } catch (e) {
            this.log.warn(`failed to update config on`, child, ':', String(e));
          }
        });
      }
    } catch (err) {
      this.log.warn(`failed to fetch instance token: ${String(err)}`);

      /* todo: delay promise resolution so we don't hammer the website */
    }

    return Promise.resolve();
  }

  async sessionedS3(opts) {
    await this.session(null, opts);
    return new AWS.S3({
      useAccelerateEndpoint: this.config.options.awsAcceleration === 'on',
    });
  }

  async sessionedSQS(opts) {
    await this.session(null, opts);
    return new AWS.SQS();
  }

  reportProgress() {
    const { upload, download } = this.states;
    this.log.info(`Progress: ${JSON.stringify({ progress: { download, upload } })}`);
  }

  storeState(direction, table, op, newDataIn) {
    const newData = newDataIn || {};
    if (!this.states[direction]) {
      this.states[direction] = {};
    }

    if (!this.states[direction][table]) {
      this.states[direction][table] = {};
    }

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

    try {
      this.states[direction].success.niceReads = utils.niceSize(this.states[direction].success.reads);
    } catch (ignore) {
      this.states[direction].success.niceReads = 0;
    }

    try {
      // complete plus in-transit
      this.states[direction].progress.niceSize = utils.niceSize(
        this.states[direction].success.bytes + this.states[direction].progress.bytes || 0,
      );
    } catch (ignore) {
      this.states[direction].progress.niceSize = 0;
    }

    try {
      // complete
      this.states[direction].success.niceSize = utils.niceSize(this.states[direction].success.bytes);
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
  }

  uploadState(table, op, newData) {
    return this.storeState('upload', table, op, newData);
  }

  downloadState(table, op, newData) {
    return this.storeState('download', table, op, newData);
  }

  async deleteMessage(message) {
    try {
      const queueURL = await this.discoverQueue(this.config.instance.outputQueueName);
      const sqs = await this.sessionedSQS();
      return sqs
        .deleteMessage({
          QueueUrl: queueURL,
          ReceiptHandle: message.ReceiptHandle,
        })
        .promise();
    } catch (error) {
      this.log.error(`deleteMessage exception: ${String(error)}`);
      if (!this.states.download.failure) this.states.download.failure = {};
      this.states.download.failure[error] = this.states.download.failure[error]
        ? this.states.download.failure[error] + 1
        : 1;
      return Promise.reject(error);
    }
  }

  async discoverQueue(queueName) {
    if (this.config.instance.discoverQueueCache[queueName]) {
      return Promise.resolve(this.config.instance.discoverQueueCache[queueName]);
    }

    this.log.debug(`discovering queue for ${queueName}`);

    let getQueue;
    try {
      const sqs = await this.sessionedSQS();
      getQueue = await sqs.getQueueUrl({ QueueName: queueName }).promise();
    } catch (err) {
      this.log.error(`Error: failed to find queue for ${queueName}: ${String(err)}`);
      return Promise.reject(err);
    }

    this.log.debug(`found queue ${getQueue.QueueUrl}`);
    this.config.instance.discoverQueueCache[queueName] = getQueue.QueueUrl;

    return Promise.resolve(getQueue.QueueUrl);
  }

  async queueLength(queueURL) {
    if (!queueURL) return Promise.reject(new Error('no queueURL specified'));

    const queueName = queueURL.match(/([\w\-_]+)$/)[0];
    this.log.debug(`querying queue length of ${queueName}`);

    try {
      const sqs = await this.sessionedSQS();
      const attrs = await sqs
        .getQueueAttributes({
          QueueUrl: queueURL,
          AttributeNames: ['ApproximateNumberOfMessages'],
        })
        .promise();

      if (attrs && attrs.Attributes && 'ApproximateNumberOfMessages' in attrs.Attributes) {
        let len = attrs.Attributes.ApproximateNumberOfMessages;
        len = parseInt(len, 10) || 0;
        return Promise.resolve(len);
      }

      return Promise.reject(new Error('unexpected response'));
    } catch (err) {
      this.log.error(`error in getQueueAttributes ${String(err)}`);
      return Promise.reject(err);
    }
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
}

EPI2ME.version = utils.version;
EPI2ME.REST = _REST;
EPI2ME.utils = utils;
