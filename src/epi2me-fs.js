/* eslint no-console: ["error", { allow: ["log", "info", "debug", "warn", "error"] }] */
/*
 * Copyright (c) 2018 Metrichor Ltd.
 * Author: rpettett
 * When: A long time ago, in a galaxy far, far away
 *
 */

import { merge, isArray } from 'lodash';
import fs from 'fs-extra'; /* MC-565 handle EMFILE & EXDIR gracefully; use Promises */
import { EOL, homedir } from 'os';
import path from 'path';
import Promise from 'core-js/features/promise'; // shim Promise.finally() for nw 0.29.4 nodejs
import utils from './utils-fs';
import _REST from './rest-fs';
import filestats from './filestats';
import EPI2ME from './epi2me';
import DB from './db';

const rootDir = () => {
  /* Windows: C:\Users\rmp\AppData\EPI2ME
   * MacOS:   /Users/rmp/Library/Application Support/EPI2ME
   * Linux:   /home/rmp/.epi2me
   * nb. EPI2ME_HOME environment variable always takes precedence
   */
  const appData =
    process.env.APPDATA ||
    (process.platform === 'darwin' ? path.join(homedir(), 'Library/Application Support') : homedir()); // linux strictly should use ~/.local/share/

  return process.env.EPI2ME_HOME || path.join(appData, process.platform === 'linux' ? '.epi2me' : 'EPI2ME');
};

export default class EPI2ME_FS extends EPI2ME {
  constructor(optString) {
    super(optString); // sets up this.config & this.log

    // overwrite non-fs REST object
    this.REST = new _REST(merge({}, { log: this.log }, this.config.options));
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
    this.log.info('instance', JSON.stringify(instance));
    this.log.info('workflow config', JSON.stringify(this.config.workflow));
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

    ['id_workflow_instance', 'id_workflow', 'remote_addr', 'key_id', 'bucket', 'user_defined', 'start_date'].forEach(
      f => {
        this.config.instance[f] = instance[f];
      },
    );

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

    // MC-7108 use common epi2me working folder
    const instancesDir = path.join(rootDir(), 'instances');
    const thisInstanceDir = path.join(instancesDir, this.config.instance.id_workflow_instance);
    // set up new tracking database
    this.db = new DB(thisInstanceDir, this.config.instance.id_workflow_instance, this.log);

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

    if (autoStartCb) autoStartCb(null, this.config.instance);

    // MC-2068 - Don't use an interval.
    this.timers.downloadCheckInterval = setInterval(() => {
      this.checkForDownloads();
    }, this.config.options.downloadCheckInterval * 1000);

    // MC-1795 - stop workflow when instance has been stopped remotely
    this.timers.stateCheckInterval = setInterval(async () => {
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

    this.reportProgress();
    // MC-5418: ensure that the session has been established before starting the upload
    this.loadUploadFiles(); // Trigger once at workflow instance start
    this.timers.fileCheckInterval = setInterval(this.loadUploadFiles.bind(this), this.config.options.fileCheckInterval * 1000);
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

    if (downloadWorkerPoolRemaining >= this.config.options.transferPoolSize) {
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
          MaxNumberOfMessages: this.config.options.transferPoolSize - downloadWorkerPoolRemaining, // download enough messages to fill the pool up again
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
      return Promise.resolve();
    }

    this.dirScanInProgress = true;
    this.log.debug('upload: started directory scan');

    try {
      const dbFilter = fileIn => this.db.seenUpload(fileIn);

      // find files waiting for upload
      const files = await utils.loadInputFiles(this.config.options, this.log, dbFilter);
      // trigger upload for all waiting files, blocking until all complete

      let running = 0;
      const chunkFunc = () => {
        return new Promise(async resolve => {
          if (running > this.config.options.transferPoolSize) {
            // run at most n at any one time
            setTimeout(resolve, 1000); // and check for more members of files[] after a second
            return;
          }

          // subtlety: if you upload a pre-existing run, this will generally always quantise/"sawtooth" n files at a time and wait for each set to complete
          // but if you trickle files in one at a time, you'll actually achieve faster throughput
          const filesChunk = files.splice(0, this.config.options.transferPoolSize - running); // fill up all available slots
          running += filesChunk.length;

          try {
            await this.enqueueUploadFiles(filesChunk);
          } catch (e) {
            this.log.error(`upload: exception in enqueueUploadFiles: ${String(e)}`);
          }

          running -= filesChunk.length; // clear the upload slot(s)

          resolve();
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
        msg = `Maximum ${maxFiles} file(s) already uploaded. Marking ${file.name} as skipped`;
        this.log.error(msg);
        this.states.warnings.push(msg);
        this.states.upload.filesCount -= 1;
        file.skip = 'SKIP_TOO_MANY';
      } else if (maxFileSize && file.size > maxFileSize) {
        // file too big to process
        msg = `${file.name} is over ${maxFileSize
          .toString()
          .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}. Marking as skipped`;
        file.skip = 'SKIP_TOO_BIG';
        this.states.upload.filesCount -= 1;

        this.log.error(msg);
        this.states.warnings.push(msg);
      } else {
        try {
          // normal handling for all file types
          file.stats = await filestats(file.path);
        } catch (e) {
          this.error(`failed to stat ${file.path}: ${String(e)}`);
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
      // return Promise.resolve();
    } catch (err) {
      this.log.error(`upload: enqueueUploadFiles exception ${String(err)}`);
      return Promise.reject(err);
    }
  }

  async uploadJob(file) {
    // Initiate file upload to S3

    if ('skip' in file) {
      return this.db.skipFile(file.path);
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

    if (errorMsg) {
      this.log.error(`uploadJob ${errorMsg}`);
      if (!this.states.upload.failure) {
        this.states.upload.failure = {};
      }

      this.states.upload.failure[errorMsg] = this.states.upload.failure[errorMsg]
        ? this.states.upload.failure[errorMsg] + 1
        : 1;
    } else {
      // this.uploadState('queueLength', 'decr', file2.stats); // this.states.upload.queueLength = this.states.upload.queueLength ? this.states.upload.queueLength - readCount : 0;
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
        this.downloadWorkerPool[message.MessageId] = 1;

        const timeoutHandle = setTimeout(() => {
          this.log.error(
            `this.downloadWorkerPool timeoutHandle. Clearing queue slot for message: ${message.MessageId}`,
          );
          reject(new Error('download timed out'));
        }, (60 + this.config.options.downloadTimeout) * 1000);

        this.processMessage(message)
          .then(() => {
            resolve();
          })
          .catch(err => {
            this.log.error(`processMessage ${String(err)}`);
            resolve();
          })
          .finally(() => {
            clearTimeout(timeoutHandle);
          });
      });

      p.then(() => {
        delete this.downloadWorkerPool[message.MessageId];
      });
    });

    this.log.info(`downloader queued ${receiveMessages.Messages.length} messages for processing`);
    // return Promise.all(this.downloadWorkerPool); // does awaiting here control parallelism better?
    return Promise.resolve();
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

    fs.mkdirpSync(folder);
    const outputFile = path.join(folder, fn);

    if (this.config.options.downloadMode === 'data+telemetry') {
      /* download file[s] from S3 */

      // MC-6190 extra file extensions generated by workflow
      const fetchSuffixes = ['']; // default message object
      let extra =
        this.config &&
        this.config.workflow &&
        this.config.workflow.settings &&
        this.config.workflow.settings.output_format
          ? this.config.workflow.settings.output_format
          : [];
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
        const fetchPromises = fetchSuffixes.map(suffix => {
          const fetchObject = messageBody.path + suffix;
          const fetchFile = outputFile + suffix;
          this.log.debug(`download.processMessage: ${message.MessageId} downloading ${fetchObject} to ${fetchFile}`);

          // we ignore failures to fetch anything with extra suffixes by wrapping
          // initiateDownloadStream with another Promise which permits fetch-with-suffix failures
          return new Promise(async (resolve, reject) => {
            try {
              await this.initiateDownloadStream(
                {
                  bucket: messageBody.bucket,
                  path: fetchObject,
                },
                message,
                fetchFile,
              );
            } catch (e) {
              if (suffix) {
                reject(e);
              }
            }
            resolve();
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
        const exitStatus =
          messageBody.telemetry && messageBody.telemetry.json ? messageBody.telemetry.json.exit_status : false;
        if (exitStatus && this.config.options.dataCb) {
          this.config.options.dataCb(outputFile, exitStatus);
        }
      } catch (err) {
        this.log.warn(`failed to fire data callback: ${err}`);
      }
    } else {
      // telemetry-only mode uses readcount from message
      const readCount =
        messageBody.telemetry.batch_summary && messageBody.telemetry.batch_summary.reads_num
          ? messageBody.telemetry.batch_summary.reads_num
          : 1;

      this.downloadState('success', 'incr', { files: 1, reads: readCount });
    }

    // this.config.options.downloadMode === 'telemetry'
    /* skip download - only interested in telemetry */
    try {
      await this.deleteMessage(message);
    } catch (e) {
      this.log.error(`Exception deleting message: ${String(e)}`);
    }

    /* must signal completion */
    return Promise.resolve();
  }

  async initiateDownloadStream(s3Item, message, outputFile) {
    return new Promise(async (resolve, reject) => {
      let s3;
      try {
        s3 = await this.sessionedS3();
      } catch (e) {
        reject(e);
      }

      let file;
      let rs;

      const deleteFile = () => {
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

      const onStreamError = err => {
        this.log.error(`Error during stream ${String(err)}`);
        clearTimeout(this.timers.transferTimeouts[outputFile]);

        if (!file.networkStreamError) {
          try {
            file.networkStreamError = 1; /* MC-1953 - signal the file end of the pipe this the network end of the pipe failed */
            file.close();
            deleteFile();
            if (rs.destroy) {
              // && !rs.destroyed) {
              this.log.error(`destroying read stream for ${outputFile}`);
              rs.destroy();
            }
          } catch (e) {
            this.log.error(`error handling stream error: ${String(e)}`);
          }
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
        const req = s3.getObject(params);

        // track request/response bytes expected
        req.on('httpHeaders', (status, headers) => {
          // status, headers, response
          this.downloadState('progress', 'incr', { total: parseInt(headers['content-length'], 10) });
        });

        rs = req.createReadStream();
      } catch (getObjectException) {
        this.log.error(`getObject/createReadStream exception: ${String(getObjectException)}`);

        reject(getObjectException);
        return;
      }

      rs.on('error', onStreamError);

      file.on('finish', async () => {
        if (file.networkStreamError) {
          return;
        }

        // SUCCESS
        this.log.debug(`downloaded ${outputFile}`);

        // MC-1993 - store total size of downloaded files
        try {
          const ext = path.extname(outputFile);
          const stats = await filestats(outputFile);
          this.downloadState('success', 'incr', merge({ files: 1 }, stats));
          this.downloadState('types', 'incr', { [ext]: 1 });
          this.downloadState('progress', 'decr', { total: stats.bytes, bytes: stats.bytes }); // reset in-flight counters
        } catch (err) {
          this.log.warn(`failed to stat ${outputFile}: ${String(err)}`);
        }
        this.reportProgress();
      });

      file.on('close', writeStreamError => {
        this.log.debug(`closing writeStream ${outputFile}`);
        if (writeStreamError) {
          this.log.error(`error closing write stream ${writeStreamError}`);
          /* should we bail and return completeCb() here? */
        }

        /* must signal completion */
        clearInterval(this.timers.visibilityIntervals[outputFile]);
        // MC-2143 - check for more jobs
        setTimeout(this.checkForDownloads.bind(this));
        this.log.info(`download.processMessage: ${message.MessageId} downloaded ${s3Item.path} to ${outputFile}`);
        resolve();
      });

      file.on('error', onStreamError);

      const transferTimeoutFunc = () => {
        onStreamError(new Error('transfer timed out'));
      };

      this.timers.transferTimeouts[outputFile] = setTimeout(
        transferTimeoutFunc,
        1000 * this.config.options.downloadTimeout,
      ); /* download stream timeout in ms */

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
          clearInterval(this.timers.visibilityIntervals[outputFile]);
          // reject here?
        }
      };

      this.timers.visibilityIntervals[outputFile] = setInterval(
        updateVisibilityFunc,
        900 * this.config.options.inFlightDelay,
      ); /* message in flight timeout in ms, less 10% */

      rs.on('data', chunk => {
        // reset timeout
        clearTimeout(this.timers.transferTimeouts[outputFile]);
        this.timers.transferTimeouts[outputFile] = setTimeout(
          transferTimeoutFunc,
          1000 * this.config.options.downloadTimeout,
        ); /* download stream timeout in ms */

        this.downloadState('progress', 'incr', { bytes: chunk.length });
      }).pipe(file); // initiate download stream
    });
  }

  async uploadHandler(file) {
    /** open readStream and pipe to S3.upload */
    const s3 = await this.sessionedS3();

    let rs;
    const objectId = [
      this.config.instance.bucketFolder,
      'component-0',
      file.name,
      encodeURIComponent(file.relative.replace(/^[\\/]+/, '')), // do we need to replace \ with / here ?
    ]
      .join('/')
      .replace(/\/+/g, '/');

    let timeoutHandle;

    const p = new Promise((resolve, reject) => {
      const timeoutFunc = () => {
        if (rs && !rs.closed) rs.close();
        reject(new Error(`${file.name} timed out`));
      };
      // timeout to ensure this completeCb *always* gets called
      timeoutHandle = setTimeout(timeoutFunc, (this.config.options.uploadTimeout + 5) * 1000);

      try {
        rs = fs.createReadStream(file.path);
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

        this.uploadState('progress', 'incr', { total: file.size });
        let myProgress = 0;

        const managedUpload = s3.upload(params, options);

        managedUpload.on('httpUploadProgress', async progress => {
          //          this.log.debug(`upload progress ${progress.key} ${progress.loaded} / ${progress.total}`);
          this.uploadState('progress', 'incr', { bytes: progress.loaded - myProgress }); // delta since last time
          myProgress = progress.loaded; // store for calculating delta next iteration
          clearTimeout(timeoutHandle); // MC-6789 - reset upload timeout
          timeoutHandle = setTimeout(timeoutFunc, (this.config.options.uploadTimeout + 5) * 1000);
          try {
            await this.session([s3]); // MC-7129 check if token needs refreshing during long duration uploads (>token duration). Don't bother awaiting.
            //            managedUpload.service.config.update(s3.config); // update the managed upload with the refreshed token
          } catch (e) {
            this.log.warn({ error: String(e) }, 'Error refreshing token');
          }
        });

        managedUpload
          .promise()
          .then(() => {
            this.log.info(`${file.id} S3 upload complete`);
            rs.close();
            clearTimeout(timeoutHandle);

            this.uploadComplete(objectId, file) // send message
              .then(() => {
                resolve(file);
              })
              .catch(uploadCompleteErr => {
                reject(uploadCompleteErr);
              })
              .finally(() => {
                this.uploadState('progress', 'decr', { total: file.size, bytes: file.size }); // zero in-flight upload counters
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

  async uploadComplete(objectId, file) {
    this.log.info(`${file.id} uploaded to S3: ${objectId}`);

    const message = {
      bucket: this.config.instance.bucket,
      outputQueue: this.config.instance.outputQueueName,
      remote_addr: this.config.instance.remote_addr,
      user_defined: this.config.instance.user_defined || null, // MC-2397 - bind param this.config to each sqs message
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

    this.log.info(`${file.id} SQS message sent. Mark as uploaded`);
    return this.db.uploadFile(file.path);
  }
}

EPI2ME_FS.version = utils.version;
EPI2ME_FS.REST = _REST;
EPI2ME_FS.utils = utils;
EPI2ME_FS.EPI2ME_HOME = rootDir();
