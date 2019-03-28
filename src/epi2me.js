/* eslint no-console: ["error", { allow: ["log", "info", "debug", "warn", "error"] }] */
/*
 * Copyright (c) 2018 Metrichor Ltd.
 * Author: rpettett
 * When: A long time ago, in a galaxy far, far away
 *
 */

import { every, isFunction, defaults, merge, isArray } from 'lodash';
import AWS from 'aws-sdk';
import fs from 'fs-extra'; /* MC-565 handle EMFILE & EXDIR gracefully; use Promises */
import { EOL } from 'os';
import path from 'path';
import proxy from 'proxy-agent';
import utils from './utils-fs';
import _REST from './rest-fs';
import filestats from './filestats';
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

    this.states = {
      upload: {
        filesCount: 0, // this one seems duplicate
        success: { files: 0 },
        failure: {},
        queueLength: { files: 0 },
        enqueued: {
          files: 0,
        },
        total: { files: 0, bytes: 0 },
        types: {},
      },
      download: {
        success: { files: 0, reads: 0, bytes: 0 },
        fail: 0,
        failure: {},
        types: {},
      },
      warnings: [],
    };

    // if (opts.filter === 'on') defaults.downloadPoolSize = 5;

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

    if (this.config.options.inputFolder) {
      if (this.config.options.uploadedFolder && this.config.options.uploadedFolder !== '+uploaded') {
        this.uploadTo = this.config.options.uploadedFolder;
      } else {
        this.uploadTo = path.join(this.config.options.inputFolder, 'uploaded');
      }
      this.skipTo = path.join(this.config.options.inputFolder, 'skip');
    }

    this.REST = new _REST(merge({}, { log: this.log }, this.config.options));
  }

  async stopEverything() {
    this.log.debug('stopping watchers');

    if (this.downloadCheckInterval) {
      this.log.debug('clearing downloadCheckInterval interval');
      clearInterval(this.downloadCheckInterval);
      this.downloadCheckInterval = null;
    }

    if (this.stateCheckInterval) {
      this.log.debug('clearing stateCheckInterval interval');
      clearInterval(this.stateCheckInterval);
      this.stateCheckInterval = null;
    }

    if (this.fileCheckInterval) {
      this.log.debug('clearing fileCheckInterval interval');
      clearInterval(this.fileCheckInterval);
      this.fileCheckInterval = null;
    }

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

  async session() {
    /* MC-1848 all session requests are serialised through that.sessionQueue to avoid multiple overlapping requests */
    if (this.sessioning) {
      return Promise.resolve(); // resolve or reject? Throttle to n=1: bail out if there's already a job queued
    }

    if (!this.states.sts_expiration || (this.states.sts_expiration && this.states.sts_expiration <= Date.now())) {
      /* Ignore if session is still valid */

      /* queue a request for a new session token and hope it comes back in under this.config.options.sessionGrace time */
      this.sessioning = true;

      try {
        await this.fetchInstanceToken();
        this.sessioning = false;
      } catch (err) {
        this.sessioning = false;
        this.log.error(`session error ${String(err)}`);
        return Promise.reject(err);
      }
    }

    return Promise.resolve();
  }

  async fetchInstanceToken() {
    if (!this.config.instance.id_workflow_instance) {
      return Promise.reject(new Error('must specify id_workflow_instance'));
    }

    if (this.states.sts_expiration && this.states.sts_expiration > Date.now()) {
      /* escape if session is still valid */
      return Promise.resolve();
    }

    this.log.debug('new instance token needed');

    try {
      const token = await this.REST.instanceToken(this.config.instance.id_workflow_instance);
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
    } catch (err) {
      this.log.warn(`failed to fetch instance token: ${String(err)}`);

      /* todo: delay promise resolution so we don't hammer the website */
    }

    return Promise.resolve();
  }

  async sessionedS3() {
    await this.session();
    return new AWS.S3({
      useAccelerateEndpoint: this.config.options.awsAcceleration === 'on',
    });
  }

  async sessionedSQS() {
    await this.session();
    return new AWS.SQS();
  }

  async autoStart(workflowConfig, cb) {
    let instance;
    try {
      instance = await this.REST.startWorkflow(workflowConfig);
    } catch (startError) {
      const msg = `Failed to start workflow: ${String(startError)}`;
      this.log.warn(msg);

      return cb ? cb(msg) : Promise.reject(startError);
    }

    this.config.workflow = JSON.parse(JSON.stringify(workflowConfig)); // object copy
    this.log.debug('instance', JSON.stringify(instance));
    this.log.debug('workflow config', JSON.stringify(this.config.workflow));
    return this.autoConfigure(instance, cb);
  }

  async autoJoin(id, cb) {
    this.config.instance.id_workflow_instance = id;
    let instance;
    try {
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
    this.log.debug('instance', JSON.stringify(instance));
    this.log.debug('workflow config', JSON.stringify(this.config.workflow));

    return this.autoConfigure(instance, cb);
  }

  async autoConfigure(instance, autoStartCb) {
    /* region
     * id_workflow_instance
     * inputqueue
     * outputqueue
     * bucket
     * remote_addr
     * description (workflow)
     * chain
     */

    // copy tuples with the same names
    ['id_workflow_instance', 'id_workflow', 'remote_addr', 'key_id', 'bucket', 'user_defined'].forEach(f => {
      this.config.instance[f] = instance[f];
    });

    // copy tuples with different names / structures
    this.config.instance.inputQueueName = instance.inputqueue;
    this.config.instance.outputQueueName = instance.outputqueue;
    this.config.instance.awssettings.region = instance.region || this.config.options.region;
    this.config.instance.bucketFolder = `${instance.outputqueue}/${instance.id_user}/${instance.id_workflow_instance}`;

    if (instance.chain) {
      if (typeof instance.chain === 'object') {
        // already parsed
        this.config.instance.chain = instance.chain;
      } else {
        try {
          this.config.instance.chain = JSON.parse(instance.chain);
        } catch (jsonException) {
          throw new Error(`exception parsing chain JSON ${String(jsonException)}`);
        }
      }
    }

    if (!this.config.options.inputFolder) throw new Error('must set inputFolder');
    if (!this.config.options.outputFolder) throw new Error('must set outputFolder');
    if (!this.config.instance.bucketFolder) throw new Error('bucketFolder must be set');
    if (!this.config.instance.inputQueueName) throw new Error('inputQueueName must be set');
    if (!this.config.instance.outputQueueName) throw new Error('outputQueueName must be set');

    fs.mkdirpSync(this.config.options.outputFolder);

    // MC-1828 - include instance id in telemetry file name
    const fileName = this.config.instance.id_workflow_instance
      ? `telemetry-${this.config.instance.id_workflow_instance}.log`
      : 'telemetry.log';
    const telemetryLogFolder = path.join(this.config.options.outputFolder, 'epi2me-logs');
    const telemetryLogPath = path.join(telemetryLogFolder, fileName);

    fs.mkdirp(telemetryLogFolder, mkdirException => {
      if (mkdirException && !String(mkdirException).match(/EEXIST/)) {
        this.log.error(`error opening telemetry log stream: mkdirpException:${String(mkdirException)}`);
      } else {
        try {
          this.telemetryLogStream = fs.createWriteStream(telemetryLogPath, { flags: 'a' });
          this.log.info(`logging telemetry to ${telemetryLogPath}`);
        } catch (telemetryLogStreamErr) {
          this.log.error(`error opening telemetry log stream: ${String(telemetryLogStreamErr)}`);
        }
      }
    });

    //    this.uploadedFiles = []; // container for files that have been successfully uploaded, but failed to move
    if (autoStartCb) autoStartCb(null, this.config.instance);

    // MC-2068 - Don't use an interval.
    this.downloadCheckInterval = setInterval(() => {
      this.checkForDownloads();
    }, this.config.options.downloadCheckInterval * 1000);

    // MC-1795 - stop workflow when instance has been stopped remotely
    this.stateCheckInterval = setInterval(async () => {
      try {
        const instanceObj = await this.REST.workflowInstance(this.config.instance.id_workflow_instance);
        if (instanceObj.state === 'stopped') {
          this.log.warn(`instance was stopped remotely at ${instanceObj.stop_date}. shutting down the workflow.`);
          try {
            const stopResult = await this.stopEverything();

            if (typeof stopResult.config.options.remoteShutdownCb === 'function') {
              stopResult.config.options.remoteShutdownCb(`instance was stopped remotely at ${instanceObj.stop_date}`);
            }
          } catch (stopError) {
            this.log.error(`Error whilst stopping: ${String(stopError)}`);
          }
        }
      } catch (instanceError) {
        this.log.warn(
          `failed to check instance state: ${
          instanceError && instanceError.error ? instanceError.error : instanceError
          }`,
        );
      }
    }, this.config.options.stateCheckInterval * 1000);

    /* Request session token */
    await this.session();

    // MC-5418: ensure that the session has been established before starting the upload
    this.loadUploadFiles(); // Trigger once at workflow instance start
    this.fileCheckInterval = setInterval(this.loadUploadFiles.bind(this), this.config.options.fileCheckInterval * 1000);
    return Promise.resolve(instance);
  }

  async checkForDownloads() {
    if (this.checkForDownloadsRunning) {
      this.log.debug('checkForDownloads already running');
      return Promise.resolve();
    }
    this.checkForDownloadsRunning = true;

    try {
      const queueURL = await this.discoverQueue(this.config.instance.outputQueueName);
      const len = await this.queueLength(queueURL);

      if (len) {
        /* only process downloads if there are downloads to process */
        this.log.debug(`downloads available: ${len}`);
        await this.downloadAvailable();
        this.checkForDownloadsRunning = false;
        return Promise.resolve();
      }

      this.log.debug('no downloads available');
    } catch (err) {
      this.log.warn(`checkForDownloads error ${String(err)}`);
      if (!this.states.download.failure) this.states.download.failure = {};
      this.states.download.failure[err] = this.states.download.failure[err] ? this.states.download.failure[err] + 1 : 1;
    }

    this.checkForDownloadsRunning = false;
    return Promise.resolve();
  }

  async downloadAvailable() {
    const downloadWorkerPoolRemaining = Object.keys(this.downloadWorkerPool || {}).length;

    if (downloadWorkerPoolRemaining >= this.config.options.downloadPoolSize) {
      /* ensure downloadPool is limited but fully utilised */
      this.log.debug(`${downloadWorkerPoolRemaining} downloads already queued`);
      return Promise.resolve();
    }

    let receiveMessageSet;
    try {
      const queueURL = await this.discoverQueue(this.config.instance.outputQueueName);
      this.log.debug('fetching messages');

      const sqs = await this.sessionedSQS();
      receiveMessageSet = await sqs
        .receiveMessage({
          AttributeNames: ['All'], // to check if the same message is received multiple times
          QueueUrl: queueURL,
          VisibilityTimeout: this.config.options.inFlightDelay, // approximate time taken to pass/fail job before resubbing
          MaxNumberOfMessages: this.config.options.downloadPoolSize - downloadWorkerPoolRemaining, // download enough messages to fill the pool up again
          WaitTimeSeconds: this.config.options.waitTimeSeconds, // long-poll
        })
        .promise();
    } catch (receiveMessageException) {
      this.log.error(`receiveMessage exception: ${String(receiveMessageException)}`);
      this.states.download.failure[receiveMessageException] = this.states.download.failure[receiveMessageException]
        ? this.states.download.failure[receiveMessageException] + 1
        : 1;
      return Promise.reject(receiveMessageException);
    }

    return this.receiveMessages(receiveMessageSet);
  }

  storeState(direction, table, op, newDataIn) {
    const newData = newDataIn || {};
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

    this.states[direction].success.niceSize = utils.niceSize(this.states[direction].success.bytes);
    this.states[direction].niceTypes = Object.keys(this.states[direction].types || {})
      .sort()
      .map(fileType => {
        return `${this.states[direction].types[fileType]} ${fileType}`;
      })
      .join(', ');
  }

  uploadState(table, op, newData) {
    return this.storeState('upload', table, op, newData);
  }

  downloadState(table, op, newData) {
    return this.storeState('download', table, op, newData);
  }

  async loadUploadFiles() {
    /**
     * Entry point for new files. Triggered on an interval
     *  - Scan the input folder files
     *      fs.readdir is resource-intensive if there are a large number of files
     *      It should only be triggered when needed
     *  - Push list of new files into uploadWorkerPool (that.enqueueFiles)
     */

    // dirScanInProgress is a semaphore used to bail out early if this routine is invoked by interval when it's already running
    if (this.dirScanInProgress) {
      this.log.debug('upload: directory scan already in progress');
      return Promise.resolve();
    }

    this.dirScanInProgress = true;
    this.log.debug('upload: scanning input folder for new files');

    try {
      // find files waiting for upload
      const files = await utils.loadInputFiles(this.config.options, this.log);
      // trigger upload for all waiting files, blocking until all complete
      await this.enqueueUploadFiles(files);
    } catch (err) {
      this.log.error(`upload: exception in enqueueUploadFiles: ${String(err)}`);
    }
    this.dirScanInProgress = false;

    return Promise.resolve();
  }

  async enqueueUploadFiles(files) {
    let maxFiles = 0;
    let maxFileSize = 0;
    let settings = {};
    let msg;

    if (!isArray(files) || !files.length) return Promise.resolve();

    if ('workflow' in this.config) {
      if ('workflow_attributes' in this.config.workflow) {
        // started from GUI agent
        settings = this.config.workflow.workflow_attributes;
      } else if ('attributes' in this.config.workflow) {
        // started from CLI
        let { attributes: attrs } = this.config.workflow.attributes;
        if (!attrs) {
          attrs = {};
        }

        if ('epi2me:max_size' in attrs) {
          settings.max_size = parseInt(attrs['epi2me:max_size'], 10);
        }

        if ('epi2me:max_files' in attrs) {
          settings.max_files = parseInt(attrs['epi2me:max_files'], 10);
        }

        if ('epi2me:category' in attrs) {
          const epi2meCategory = attrs['epi2me:category'];
          if (epi2meCategory.includes('storage')) {
            settings.requires_storage = true;
          }
        }
      }
    }

    if ('requires_storage' in settings) {
      if (settings.requires_storage) {
        if (!('storage_account' in this.config.workflow)) {
          msg = 'ERROR: Workflow requires storage enabled. Please provide a valid storage account [ --storage ].';
          this.log.error(msg);
          this.states.warnings.push(msg);
          return Promise.resolve();
        }
      }
    }

    if ('max_size' in settings) {
      maxFileSize = parseInt(settings.max_size, 10);
    }

    if ('max_files' in settings) {
      maxFiles = parseInt(settings.max_files, 10);
      if (files.length > maxFiles) {
        msg = `ERROR: ${
          files.length
          } files found. Workflow can only accept ${maxFiles}. Please move the extra files away.`;
        this.log.error(msg);
        this.states.warnings.push(msg);
        return Promise.resolve();
      }
    }

    this.log.info(`upload: enqueueUploadFiles: ${files.length} new files`);

    //    this.uploadState('filesCount', 'incr', { files: files.length });
    this.states.upload.filesCount += files.length; // total count of files for an instance

    const inputBatchQueue = files.map(async fileIn => {
      const file = fileIn;

      if (maxFiles && this.states.upload.filesCount > maxFiles) {
        // too many files processed
        msg = `Maximum ${maxFiles} file(s) already uploaded. Moving ${file.name} into skip folder`;
        this.log.error(msg);
        this.states.warnings.push(msg);
        this.states.upload.filesCount -= 1;
        file.skip = 'SKIP_TOO_MANY';
      } else if (maxFileSize && file.size > maxFileSize) {
        // file too big to process
        msg = `${file.name} is over ${maxFileSize
          .toString()
          .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}. Moving into skip folder`;
        file.skip = 'SKIP_TOO_BIG';
        this.states.upload.filesCount -= 1;

        this.log.error(msg);
        this.states.warnings.push(msg);
      } else {
        // normal handling for all file types
        file.stats = await filestats(file.path);
        this.uploadState('enqueued', 'incr', merge({ files: 1 }, file.stats));
      }

      return this.uploadJob(file);
    });

    try {
      // inputBatchQueue contains an array of promises corresponding to local files waiting for upload and which are only resolved on successful transfer to S3
      await Promise.all(inputBatchQueue);
      this.log.info(`upload: inputBatchQueue (${inputBatchQueue.length} jobs) complete`);
      // try and load more files straight away. returns a promise which resolves after awaiting the new work
      return this.loadUploadFiles();
      // return Promise.resolve();
    } catch (err) {
      this.log.error(`upload: enqueueUploadFiles exception ${String(err)}`);
      return Promise.reject(err);
    }
  }

  async uploadJob(file) {
    // Initiate file upload to S3

    if ('skip' in file) {
      this.uploadState('enqueued', 'decr', merge({ files: 1 }, file.stats)); // this.states.upload.enqueued = this.states.upload.enqueued - readCount;
      this.uploadState('queueLength', 'decr', file.stats); // this.states.upload.queueLength = this.states.upload.queueLength ? this.states.upload.queueLength - readCount : 0;
      try {
        await this.moveFile(file, 'skip');
      } catch (e) {
        return Promise.reject(e);
      }
      return Promise.resolve();
    }

    let file2;
    let errorMsg;
    try {
      this.log.info(`upload: ${file.id} starting`);
      file2 = await this.uploadHandler(file);
      this.log.info(`upload: ${file2.id} uploaded and notified`);
    } catch (err) {
      errorMsg = err;
      this.log.error(`upload: ${file.id} done, but failed: ${String(errorMsg)}`);
    }

    if (!file2) {
      file2 = {};
    }

    this.uploadState('enqueued', 'decr', merge({ files: 1 }, file2.stats)); // this.states.upload.enqueued = this.states.upload.enqueued - readCount;

    if (errorMsg) {
      this.log.error(`uploadJob ${errorMsg}`);
      if (!this.states.upload.failure) {
        this.states.upload.failure = {};
      }

      this.states.upload.failure[errorMsg] = this.states.upload.failure[errorMsg]
        ? this.states.upload.failure[errorMsg] + 1
        : 1;
    } else {
      this.uploadState('queueLength', 'decr', file2.stats); // this.states.upload.queueLength = this.states.upload.queueLength ? this.states.upload.queueLength - readCount : 0;
      this.uploadState('success', 'incr', merge({ files: 1 }, file2.stats)); // this.states.upload.success = this.states.upload.success ? this.states.upload.success + readCount : readCount;

      if (file2.name) {
        // nb. we only count types for successful uploads
        const ext = path.extname(file2.name);
        this.uploadState('types', 'incr', { [ext]: 1 });
      }
    }

    return Promise.resolve(); // file-by-file?
  }

  async receiveMessages(receiveMessages) {
    if (!receiveMessages || !receiveMessages.Messages || !receiveMessages.Messages.length) {
      /* no work to do */
      this.log.info('complete (empty)');

      return Promise.resolve();
    }

    if (!this.downloadWorkerPool) {
      this.downloadWorkerPool = {};
    }

    receiveMessages.Messages.forEach(message => {
      const p = new Promise((resolve, reject) => {
        // timeout to ensure this queueCb *always* gets called

        const timeoutHandle = setTimeout(() => {
          clearTimeout(timeoutHandle);
          this.log.error(`this.downloadWorkerPool timeoutHandle. Clearing queue slot for message: ${message.Body}`);
          delete this.downloadWorkerPool[message.MessageId];
          reject(new Error('download timed out'));
        }, (60 + this.config.options.downloadTimeout) * 1000);

        this.processMessage(message)
          .then(() => {
            delete this.downloadWorkerPool[message.MessageId];
            clearTimeout(timeoutHandle);
            resolve();
          })
          .catch(err => {
            this.log.error(`processMessage ${String(err)}`);
            delete this.downloadWorkerPool[message.MessageId];
            clearTimeout(timeoutHandle);
            resolve();
          });
      });

      this.downloadWorkerPool[message.MessageId] = p; // is the promise the most useful thing to keep here? it's really just something truthy
    });

    this.log.info(`downloader queued ${receiveMessages.Messages.length} messages for processing`);
    // return Promise.all(this.downloadWorkerPool); // does awaiting here control parallelism better?
    return Promise.resolve();
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
      this.states.download.failure[error] = this.states.download.failure[error]
        ? this.states.download.failure[error] + 1
        : 1;
      return Promise.reject(error);
    }
  }

  async processMessage(message) {
    let messageBody;
    let folder;

    if (!message) {
      this.log.debug('download.processMessage: empty message');
      return Promise.resolve();
    }

    if ('Attributes' in message) {
      if ('ApproximateReceiveCount' in message.Attributes) {
        this.log.debug(`download.processMessage: ${message.MessageId} / ${message.Attributes.ApproximateReceiveCount}`);
      } else {
        this.log.debug(`download.processMessage: ${message.MessageId} / NA `);
      }
    }

    try {
      messageBody = JSON.parse(message.Body);
    } catch (jsonError) {
      this.log.error(`error parsing JSON message.Body from message: ${JSON.stringify(message)} ${String(jsonError)}`);
      try {
        await this.deleteMessage(message);
      } catch (e) {
        this.log.error(`Exception deleting message: ${String(e)}`);
      }
      return Promise.resolve();
    }

    /* MC-405 telemetry log to file */
    if (messageBody.telemetry) {
      const { telemetry } = messageBody;

      if (telemetry.tm_path) {
        try {
          this.log.debug(`download.processMessage: ${message.MessageId} fetching telemetry`);
          const s3 = await this.sessionedS3();
          const data = await s3
            .getObject({
              Bucket: messageBody.bucket,
              Key: telemetry.tm_path,
            })
            .promise();
          this.log.info(`download.processMessage: ${message.MessageId} fetched telemetry`);

          telemetry.batch = data.Body.toString('utf-8')
            .split('\n')
            .filter(d => d && d.length > 0)
            .map(row => {
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
      return Promise.resolve();
    }

    const match = messageBody.path.match(/[\w\W]*\/([\w\W]*?)$/);
    const fn = match ? match[1] : '';
    folder = this.config.options.outputFolder;

    /* MC-940: use folder hinting if present */
    if (messageBody.telemetry && messageBody.telemetry.hints && messageBody.telemetry.hints.folder) {
      this.log.debug(`using folder hint ${messageBody.telemetry.hints.folder}`);
      // MC-4987 - folder hints may now be nested.
      // eg: HIGH_QUALITY/CLASSIFIED/ALIGNED
      // or: LOW_QUALITY
      const codes = messageBody.telemetry.hints.folder
        .split('/') // hints are always unix-style
        .map(o => o.toUpperCase()); // MC-5612 cross-platform uppercase "pass" folder
      folder = path.join.apply(null, [folder, ...codes]);
    }

    if (this.config.options.filetype === '.fast5') {
      // MC-5240: .fast5 files always need to be batched
      // eg: HIGH_QUALITY/CLASSIFIED/ALIGNED/BATCH-1
      folder = utils.findSuitableBatchIn(folder);
    }

    fs.mkdirpSync(folder);
    const outputFile = path.join(folder, fn);

    if (this.config.options.downloadMode === 'data+telemetry') {
      /* download file from S3 */
      this.log.debug(`download.processMessage: ${message.MessageId} downloading ${messageBody.path} to ${outputFile}`);

      const s3 = await this.sessionedS3();
      const p = new Promise(async resolve => {
        this.initiateDownloadStream(s3, messageBody, message, outputFile, resolve);
      });
      await p;
      this.log.info(`download.processMessage: ${message.MessageId} downloaded ${messageBody.path} to ${outputFile}`);
      return Promise.resolve();
    }
    // this.config.options.downloadMode === 'telemetry'
    /* skip download - only interested in telemetry */
    try {
      await this.deleteMessage(message);
    } catch (e) {
      this.log.error(`Exception deleting message: ${String(e)}`);
    }

    const readCount =
      messageBody.telemetry.batch_summary && messageBody.telemetry.batch_summary.reads_num
        ? messageBody.telemetry.batch_summary.reads_num
        : 1;

    this.downloadState('success', 'incr', { files: 1, reads: readCount }); // this.states.download.success = this.states.download.success ? this.states.download.success + readCount : readCount; // hmm. not exactly "download", these

    /* must signal completion */
    return Promise.resolve();
  }

  initiateDownloadStream(s3, messageBody, message, outputFile, completeCb) {
    let file;
    let transferTimeout;
    let visibilityInterval;
    let rs;

    const deleteFile = () => {
      // cleanup on exception
      if (this.config.options.filter !== 'on') {
        return;
      }

      // don't delete the file if the stream is in append mode
      // ideally the file should be restored to it's original state
      // if the write stream has already written data to disk, the downloaded dataset would be inaccurate
      //
      try {
        // if (file && file.bytesWritten > 0)
        fs.remove(outputFile, err => {
          if (err) {
            this.log.warn(`failed to remove file: ${outputFile}`);
          } else {
            this.log.warn(`removed failed download file: ${outputFile} ${err}`);
          }
        });
      } catch (unlinkException) {
        this.log.warn(`failed to remove file. unlinkException: ${outputFile} ${String(unlinkException)}`);
      }
    };

    const onStreamError = () => {
      if (!file.networkStreamError) {
        try {
          file.networkStreamError = 1; /* MC-1953 - signal the file end of the pipe this the network end of the pipe failed */
          file.close();
          deleteFile();
          if (rs.destroy) {
            // && !rs.destroyed) {
            this.log.error(`destroying readstream for ${outputFile}`);
            rs.destroy();
          }
        } catch (err) {
          this.log.error(`error handling sream error: ${err.message}`);
        }
      }
    };

    try {
      const params = {
        Bucket: messageBody.bucket,
        Key: messageBody.path,
      };

      // MC-6270 : disable append to avoid appending the same data
      // file = fs.createWriteStream(outputFile, { "flags": "a" });
      file = fs.createWriteStream(outputFile);
      const req = s3.getObject(params);

      /* track request/response bytes expected
            req.on('httpHeaders', (status, headers, response) => {
                this.states.download.totalBytes += parseInt(headers['content-length']);
            });
            */

      rs = req.createReadStream();
    } catch (getObjectException) {
      this.log.error(`getObject/createReadStream exception: ${String(getObjectException)}`);
      if (completeCb) completeCb();
      return;
    }

    rs.on('error', readStreamError => {
      this.log.error(`error in download readstream ${readStreamError}`); /* e.g. socket hangup */
      try {
        onStreamError();
      } catch (e) {
        this.log.error(`error handling readStreamError: ${e}`);
      }
    });

    file.on('finish', async () => {
      if (!file.networkStreamError) {
        // SUCCESS
        this.log.debug(`downloaded ${outputFile}`);

        const readCount =
          messageBody.telemetry && messageBody.telemetry.batch_summary && messageBody.telemetry.batch_summary.reads_num
            ? messageBody.telemetry.batch_summary.reads_num
            : 1;

        const ext = path.extname(outputFile);

        this.downloadState('success', 'incr', { files: 1, reads: readCount });
        this.downloadState('types', 'incr', { [ext]: 1 });

        // MC-1993 - store total size of downloaded files
        try {
          const stats = await filestats(outputFile);
          this.downloadState('success', 'incr', { bytes: stats.bytes });
        } catch (err) {
          this.log.warn(`failed to stat file: ${String(err)}`);
        }

        try {
          this.log.info(`Uploads: ${JSON.stringify(this.states.upload)}`);
          this.log.info(`Downloads: ${JSON.stringify(this.states.download)}`);

          // MC-2540 : if there is some postprocessing to do( e.g fastq extraction) - call the dataCallback
          // dataCallback might depend on the exit_status ( e.g. fastq can only be extracted from successful reads )
          const exitStatus =
            messageBody.telemetry && messageBody.telemetry.json ? messageBody.telemetry.json.exit_status : false;
          if (exitStatus && this.config.options.dataCb) {
            this.config.options.dataCb(outputFile, exitStatus);
          }
        } catch (err) {
          this.log.warn(`failed to fs.stat file: ${err}`);
        }

        try {
          await this.deleteMessage(message);
        } catch (e) {
          this.log.error(`Exception deleting message: ${String(e)}`);
        }
      }
    });

    file.on('close', writeStreamError => {
      this.log.debug(`closing writeStream ${outputFile}`);
      if (writeStreamError) {
        this.log.error(`error closing writestream ${writeStreamError}`);
        /* should we bail and return completeCb() here? */
      }

      /* must signal completion */
      clearTimeout(transferTimeout);
      clearInterval(visibilityInterval);
      // MC-2143 - check for more jobs
      setTimeout(this.checkForDownloads.bind(this));
      completeCb();
    });

    file.on('error', writeStreamError => {
      this.log.error(`error in download write stream ${writeStreamError}`);
      onStreamError();
    });

    const transferTimeoutFunc = () => {
      this.log.warn('transfer timed out');
      onStreamError();
    };

    transferTimeout = setTimeout(
      transferTimeoutFunc,
      1000 * this.config.options.downloadTimeout,
    ); /* download stream timeout in ms */
    //    console.log('downloadTimeout', 1000 * this.config.options.downloadTimeout);
    const updateVisibilityFunc = async () => {
      const queueUrl = this.config.instance.outputQueueURL;
      const receiptHandle = message.ReceiptHandle;

      this.log.debug({ message_id: message.MessageId }, 'updateVisibility');

      try {
        await this.sqs
          .changeMessageVisibility({
            QueueUrl: queueUrl,
            ReceiptHandle: receiptHandle,
            VisibilityTimeout: this.config.options.inFlightDelay,
          })
          .promise();
      } catch (err) {
        this.log.error({ message_id: message.MessageId, queue: queueUrl, error: err }, 'Error setting visibility');
        clearInterval(visibilityInterval);
      }
    };

    visibilityInterval = setInterval(
      updateVisibilityFunc,
      900 * this.config.options.inFlightDelay,
    ); /* message in flight timeout in ms, less 10% */

    rs.on('data', () => {
      // bytesLoaded += chunk.length;
      clearTimeout(transferTimeout);
      transferTimeout = setTimeout(
        transferTimeoutFunc,
        1000 * this.config.options.downloadTimeout,
      ); /* download stream timeout in ms */
      //                this.log.debug(`downloaded ${chunk.length} bytes. resetting transferTimeout`);
    }).pipe(file); // initiate download stream
  }

  async uploadHandler(file) {
    /** open readStream and pipe to S3.upload */
    const s3 = await this.sessionedS3();

    let rs;
    const batch = file.batch || '';
    const fileId = path.join(this.config.options.inputFolder, batch, file.name);
    const objectId = `${this.config.instance.bucketFolder}/component-0/${file.name}/${file.name}`;
    let timeoutHandle;

    const p = new Promise((resolve, reject) => {
      const timeoutFunc = () => {
        if (rs && !rs.closed) rs.close();
        reject(new Error(`${file.name} timed out`));
      };
      // timeout to ensure this completeCb *always* gets called
      timeoutHandle = setTimeout(timeoutFunc, (this.config.options.uploadTimeout + 5) * 1000);

      try {
        rs = fs.createReadStream(fileId);
      } catch (createReadStreamException) {
        clearTimeout(timeoutHandle);

        reject(createReadStreamException);
        return;
      }

      rs.on('error', readStreamError => {
        rs.close();
        let errstr = 'error in upload readstream';
        if (readStreamError && readStreamError.message) {
          errstr += `: ${readStreamError.message}`;
        }
        clearTimeout(timeoutHandle);
        reject(new Error(errstr));
      });

      rs.on('open', () => {
        const params = {
          Bucket: this.config.instance.bucket,
          Key: objectId,
          Body: rs,
        };

        const options = { partSize: 10 * 1024 * 1024, queueSize: 1 };

        if (this.config.instance.key_id) {
          // MC-4996 support (optional, for now) encryption
          params.SSEKMSKeyId = this.config.instance.key_id;
          params.ServerSideEncryption = 'aws:kms';
        }

        if (file.size) {
          params['Content-Length'] = file.size;
        }

        const managedUpload = s3.upload(params, options);
        managedUpload.on('httpUploadProgress', progress => {
          // MC-6789 - reset upload timeout
          this.log.debug(`upload progress ${progress.key} ${progress.loaded} / ${progress.total}`);

          clearTimeout(timeoutHandle);
          timeoutHandle = setTimeout(timeoutFunc, (this.config.options.uploadTimeout + 5) * 1000);
        });

        managedUpload
          .promise()
          .then(() => {
            this.log.info(`${file.id} S3 upload complete`);
            rs.close();
            clearTimeout(timeoutHandle);

            this.uploadComplete(objectId, file)
              .then(() => {
                resolve(file);
              })
              .catch(uploadCompleteErr => {
                reject(uploadCompleteErr);
              });
          })
          .catch(uploadStreamErr => {
            this.log.warn(`${file.id} uploadStreamError ${uploadStreamErr}`);
            reject(uploadStreamErr);
          });
      });

      //      rs.on('end', rs.close);
      //      rs.on('close', () => this.log.debug('closing readstream'));
    });

    return p;
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

  async uploadComplete(objectId, file) {
    this.log.info(`${file.id} uploaded to S3: ${objectId}`);

    const message = {
      bucket: this.config.instance.bucket,
      outputQueue: this.config.instance.outputQueueName,
      remote_addr: this.config.instance.remote_addr,
      user_defined: this.config.instance.user_defined || null, // MC-2397 - bind paramthis.config to each sqs message
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
      // optionally populate input + output queues
      Object.keys(message.components).forEach(o => {
        if (message.components[o].inputQueueName === 'uploadMessageQueue') {
          message.components[o].inputQueueName = this.uploadMessageQueue;
        }
        if (message.components[o].inputQueueName === 'downloadMessageQueue') {
          message.components[o].inputQueueName = this.downloadMessageQueue;
        }
      });
    }

    try {
      const inputQueueURL = await this.discoverQueue(this.config.instance.inputQueueName);
      const sqs = await this.sessionedSQS();

      this.log.info(`${file.id} sending SQS message to input queue`);
      await sqs
        .sendMessage({
          QueueUrl: inputQueueURL,
          MessageBody: JSON.stringify(message),
        })
        .promise();
    } catch (sendMessageException) {
      this.log.error(`${file.id} exception sending SQS message: ${String(sendMessageException)}`);
      return Promise.reject(sendMessageException);
    }

    this.log.info(`${file.id} SQS message sent. Move to uploaded`);

    try {
      await this.moveFile(file, 'upload');
      return Promise.resolve();
    } catch (e) {
      return Promise.reject(e);
    }

    // success
  }

  async moveFile(file, type) {
    const moveTo = type === 'upload' ? this.uploadTo : this.skipTo;
    const fileName = file.name;
    const fileBatch = file.batch || '';
    const fileFrom = file.path || path.join(this.config.options.inputFolder, fileBatch, fileName);
    const fileTo = path.join(moveTo, fileBatch, fileName);

    try {
      await fs.mkdirp(path.join(moveTo, fileBatch));
      await fs.move(fileFrom, fileTo);

      this.log.debug(`${file.id} ${type} and mv done`);

      if (type === 'upload') {
        this.uploadState('total', 'incr', { bytes: file.size }); // this.states.upload.totalSize += file.size;
      }
      //      this.uploadedFiles.push(fileName); // flag as uploaded to prevent multiple uploads
    } catch (moveError) {
      this.log.debug(`${file.id} ${type} move error: ${String(moveError)}`);

      try {
        await fs.remove(fileTo);
      } catch (unlinkError) {
        this.log.warn(`${file.id} ${type} additionally failed to delete ${fileTo}: ${String(unlinkError)}`);
      }

      return Promise.reject(moveError);
    }
    return Promise.resolve();
  }

  async queueLength(queueURL) {
    if (!queueURL) return Promise.resolve();

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
    } catch (err) {
      this.log.error(`error in getQueueAttributes ${String(err)}`);
      return Promise.reject(err);
    }
    return Promise.resolve();
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
    if (this.states[key]) {
      //      this.states[key].queueLength = parseInt(this.states[key].queueLength, 10) || 0; // a little housekeeping
      // 'total' is the most up-to-date measure of the total number of reads to be uploaded
      if (key === 'upload') {
        this.states.upload.total = {
          files: 0 + parseInt(this.states.upload.enqueued.files, 10) + parseInt(this.states.upload.success.files, 10),
        };
        //        this.uploadState('total', 'incr', merge({ files: this.uploadedFiles.length }, this.states.upload.enqueued));
        //        this.uploadState('total', 'incr', this.states.upload.success);
        // this.states.upload.total = this.uploadedFiles.length + this.states.upload.enqueued + this.states.upload.success;
      }
    }
    return this.states[key];
  }
}

EPI2ME.version = utils.version;
EPI2ME.REST = _REST;
