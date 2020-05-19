/* eslint no-console: ["error", { allow: ["log", "info", "debug", "warn", "error"] }] */
/*
 * Copyright (c) 2018 Metrichor Ltd.
 * Author: rpettett
 * When: A long time ago, in a galaxy far, far away
 *
 */

import AWS from 'aws-sdk';
import fs from 'fs-extra'; /* MC-565 handle EMFILE & EXDIR gracefully; use Promises */
import { isArray, merge } from 'lodash';
import { EOL, homedir } from 'os';
import path from 'path';
import { resolve } from 'url';
import DB from './db';
import EPI2ME from './epi2me';
import Factory from './factory';
import filestats from './filestats';
import niceSize from './niceSize';
import Profile from './profile-fs';
import PromisePipeline from './promise-pipeline';
import REST from './rest-fs';
import SampleReader from './sample-reader';
import SessionManager from './session-manager';
import fastqSplitter from './splitters/fastq';
import fastqGzipSplitter from './splitters/fastq-gz';
import utils from './utils-fs';

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

    // Merge inputFolder and inputFolders here, can be removed if we transition everything to use inputFolders
    this.config.options.inputFolders = this.config.options.inputFolders || [];
    if (this.config.options.inputFolder) this.config.options.inputFolders.push(this.config.options.inputFolder);
    // overwrite non-fs REST object
    this.REST = new REST(
      merge(
        {},
        {
          log: this.log,
        },
        this.config.options,
      ),
    );
    this.SampleReader = new SampleReader();
  }

  async sessionedS3() {
    await this.sessionManager.session();
    return new AWS.S3({
      useAccelerateEndpoint: this.config.options.awsAcceleration === 'on',
    });
  }

  async sessionedSQS() {
    await this.sessionManager.session();
    return new AWS.SQS();
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
      getQueue = await sqs
        .getQueueUrl({
          QueueName: queueName,
        })
        .promise();
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

      if (attrs?.Attributes && 'ApproximateNumberOfMessages' in attrs.Attributes) {
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

  async autoStart(workflowConfig, cb) {
    const instance = await this.autoStartGeneric(workflowConfig, () => this.REST.startWorkflow(workflowConfig), cb);
    this.setClassConfigREST(instance);
    return this.autoConfigure(instance, cb);
  }

  async autoStartGQL(variables, cb) {
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
    const instance = await this.autoStartGeneric(variables, () => this.graphQL.startWorkflow({ variables }), cb);
    this.setClassConfigGQL(instance);
    // Pass this.config.instance because we need the old format
    // This can be improved
    return this.autoConfigure(this.config.instance, cb);
  }

  async autoStartGeneric(workflowConfig, startFn, cb) {
    this.stopped = false;
    let instance;
    try {
      instance = await startFn();
      this.analyseState$.next(true);
    } catch (startError) {
      const msg = `Failed to start workflow: ${String(startError)}`;
      this.log.warn(msg);

      return cb ? cb(msg) : Promise.reject(startError);
    }

    this.config.workflow = JSON.parse(JSON.stringify(workflowConfig)); // object copy
    this.log.info(`instance ${JSON.stringify(instance)}`);
    this.log.info(`workflow config ${JSON.stringify(this.config.workflow)}`);
    return instance;
  }

  async autoJoin(id, cb) {
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

  setClassConfigGQL({
    data: {
      startData: {
        bucket,
        idUser,
        remoteAddr,
        userDefined = {},
        instance: {
          outputqueue,
          keyId,
          startDate,
          idWorkflowInstance,
          mappedTelemetry,
          chain,
          workflowImage: {
            region: { name },
            workflow: { idWorkflow },
            inputqueue,
          },
        },
      },
    },
  }) {
    const map = {
      bucket,
      user_defined: userDefined,
      id_user: parseInt(idUser),
      remote_addr: remoteAddr,
      id_workflow_instance: idWorkflowInstance,
      key_id: keyId,
      start_date: startDate,
      outputQueueName: outputqueue,
      summaryTelemetry: mappedTelemetry,
      inputQueueName: inputqueue,
      id_workflow: parseInt(idWorkflow),
      region: name || this.config.options.region,
      bucketFolder: `${outputqueue}/${idUser}/${idWorkflowInstance}`,
      chain: utils.convertResponseToObject(chain),
    };

    this.config.instance = {
      ...this.config.instance,
      ...map,
    };
  }

  setClassConfigREST(instance) {
    [
      'id_workflow_instance',
      'id_workflow',
      'remote_addr',
      'key_id',
      'bucket',
      'user_defined',
      'start_date',
      'id_user',
    ].forEach(f => {
      this.config.instance[f] = instance[f];
    });

    // copy tuples with different names / structures
    this.config.instance.inputQueueName = instance.inputqueue;
    this.config.instance.outputQueueName = instance.outputqueue;
    this.config.instance.region = instance.region || this.config.options.region;
    this.config.instance.bucketFolder = `${instance.outputqueue}/${instance.id_user}/${instance.id_workflow_instance}`;
    this.config.instance.summaryTelemetry = instance.telemetry; // MC-7056 for fetchTelemetry (summary) telemetry periodically

    if (instance.chain) {
      this.config.instance.chain = utils.convertResponseToObject(instance.chain);
    }
  }

  initSessionManager(opts, children) {
    return new SessionManager(
      this.config.instance.id_workflow_instance,
      this.REST,
      [AWS, ...(children || [])],
      merge(
        {
          sessionGrace: this.config.options.sessionGrace,
          proxy: this.config.options.proxy,
          region: this.config.instance.region,
          log: this.log,
        },
        opts,
      ),
    );
  }

  async autoConfigure(instance, autoStartCb) {
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

    if (!this.config.options.inputFolders.length) throw new Error('must set inputFolder');
    if (!this.config.options.outputFolder) throw new Error('must set outputFolder');
    if (!this.config.instance.bucketFolder) throw new Error('bucketFolder must be set');
    if (!this.config.instance.inputQueueName) throw new Error('inputQueueName must be set');
    if (!this.config.instance.outputQueueName) throw new Error('outputQueueName must be set');

    fs.mkdirpSync(this.config.options.outputFolder);

    // MC-7108 use common epi2me working folder
    const instancesDir = path.join(rootDir(), 'instances');
    const thisInstanceDir = path.join(instancesDir, this.config.instance.id_workflow_instance);
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

    fs.mkdirp(telemetryLogFolder, mkdirException => {
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

    if (autoStartCb) autoStartCb(null, this.config.instance);

    // MC-7056 periodically fetch summary telemetry for local reporting purposes
    this.timers.summaryTelemetryInterval = setInterval(() => {
      if (this.stopped) {
        clearInterval(this.timers.summaryTelemetryInterval);
        return;
      }
      this.fetchTelemetry();
    }, this.config.options.downloadCheckInterval * 10000); // 10x slower than downloadChecks - is this reasonable?

    // MC-2068 - Don't use an interval.
    this.timers.downloadCheckInterval = setInterval(() => {
      if (this.stopped) {
        clearInterval(this.timers.downloadCheckInterval);
        return;
      }
      this.checkForDownloads();
    }, this.config.options.downloadCheckInterval * 1000);

    // MC-1795 - stop workflow when instance has been stopped remotely
    this.timers.stateCheckInterval = setInterval(async () => {
      if (this.stopped) {
        clearInterval(this.timers.stateCheckInterval);
        return;
      }

      try {
        // TODO: Convert to GQL
        // Should just require passing through setClassConfig...
        // Choose REST vs GQL based on class-wide flag
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
        this.log.warn(`failed to check instance state: ${instanceError?.error ? instanceError.error : instanceError}`);
      }
    }, this.config.options.stateCheckInterval * 1000);

    this.sessionManager = this.initSessionManager();

    /* Request session token */
    await this.sessionManager.session();

    this.reportProgress();
    // MC-5418: ensure that the session has been established before starting the upload
    this.loadUploadFiles(); // Trigger once at workflow instance start
    this.uploadState$.next(true);
    this.timers.fileCheckInterval = setInterval(
      this.loadUploadFiles.bind(this),
      this.config.options.fileCheckInterval * 1000,
    );
    return Promise.resolve(instance);
  }

  async stopUpload() {
    await super.stopUpload();

    this.log.debug('clearing split files');
    if (this.db) {
      return this.db.splitClean(); // remove any split files whose transfers were disrupted and which didn't self-clean
    }

    return;
  }

  async stopEverything() {
    delete this.sessionManager;
    await super.stopEverything();
  }

  async checkForDownloads() {
    if (this.checkForDownloadsRunning) {
      return Promise.resolve();
    }
    this.checkForDownloadsRunning = true;
    this.log.debug('checkForDownloads checking for downloads');

    try {
      const queueURL = await this.discoverQueue(this.config.instance.outputQueueName);
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
        return new Promise(resolve => {
          if (this.stopped) {
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
            .catch(e => {
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

    return Promise.resolve();
  }

  async enqueueUploadFiles(files) {
    let maxFiles = 0;
    let maxFileSize = 0;
    let splitSize = 0;
    let splitReads = 0;
    let settings = {};

    if (!isArray(files) || !files.length) return Promise.resolve();

    this.log.info(`enqueueUploadFiles ${files.length} files: ${files.map(file => file.path).join(' ')}.`);

    if ('workflow' in this.config) {
      if ('workflow_attributes' in this.config.workflow) {
        // started from GUI agent
        settings = this.config.workflow.workflow_attributes;
      } else if ('attributes' in this.config.workflow) {
        // started from CLI
        let { attributes: attrs } = this.config.workflow;
        if (!attrs) {
          attrs = {};
        }

        ['max_size', 'max_files', 'split_size', 'split_reads'].forEach(attr => {
          if (`epi2me:${attr}` in attrs) {
            settings[attr] = parseInt(attrs[`epi2me:${attr}`], 10);
          }
        });

        if ('epi2me:category' in attrs) {
          const epi2meCategory = attrs['epi2me:category'];
          if (epi2meCategory.includes('storage')) {
            settings.requires_storage = true;
          }
        }
      }
    }

    this.log.info(`enqueueUploadFiles settings ${JSON.stringify(settings)}`);

    if ('requires_storage' in settings) {
      if (settings.requires_storage) {
        if (!('storage_account' in this.config.workflow)) {
          const warning = {
            msg: 'ERROR: Workflow requires storage enabled. Please provide a valid storage account [ --storage ].',
            type: 'WARNING_STORAGE_ENABLED',
          };
          this.log.error(warning.msg);
          this.states.warnings.push(warning);
          return Promise.resolve();
        }
      }
    }

    if ('split_size' in settings) {
      splitSize = parseInt(settings.split_size, 10);
      this.log.info(`enqueueUploadFiles splitting supported files at ${splitSize} bytes`);
    }

    if ('split_reads' in settings) {
      splitReads = parseInt(settings.split_reads, 10);
      this.log.info(`enqueueUploadFiles splitting supported files at ${splitReads} reads`);
    }

    if ('max_size' in settings) {
      maxFileSize = parseInt(settings.max_size, 10);
      this.log.info(`enqueueUploadFiles restricting file size to ${maxFileSize}`);
    }

    if ('max_files' in settings) {
      maxFiles = parseInt(settings.max_files, 10);
      this.log.info(`enqueueUploadFiles restricting file count to ${maxFiles}`);

      if (files.length > maxFiles) {
        const warning = {
          msg: `ERROR: ${files.length} files found. Workflow can only accept ${maxFiles}. Please move the extra files away.`,
          type: 'WARNING_FILE_TOO_MANY',
        };
        this.log.error(warning.msg);
        this.states.warnings.push(warning);
        return Promise.resolve();
      }
    }

    //    this.uploadState('filesCount', 'incr', { files: files.length });
    this.states.upload.filesCount += files.length; // total count of files for an instance

    const inputBatchQueue = files.map(async fileIn => {
      const file = fileIn;

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
        const chunkHandler = async chunkFile => {
          this.log.debug(`chunkHandler for ${chunkFile}`);
          // mark start of chunk transfer. do it before the stop check so it's cleaned up correctly if stopped early
          await this.db.splitFile(chunkFile, file.path);

          if (this.stopped) {
            queue.stop();
            this.log.info(`stopped, so skipping ${chunkFile}`);
            return Promise.reject(new Error(`stopped`));
          }

          chunkId += 1;
          return filestats(chunkFile)
            .then(stats => {
              return {
                name: path.basename(chunkFile), // "my.fastq"
                path: chunkFile, // "/Users/rpettett/test_sets/zymo/demo/INPUT_PREFIX/my.fastq"
                relative: chunkFile.replace(this.config.options.inputFolder, ''), // "INPUT_PREFIX/my.fastq"
                id: `${fileId}_${chunkId}`,
                stats,
                size: stats.bytes,
              };
            })
            .then(async chunkStruct => {
              const p = new Promise(chunkResolve => {
                queue.enqueue(() => {
                  this.log.info(`chunk upload starting ${chunkStruct.id} ${chunkStruct.path}`);
                  // this function may have been sat in a queue for a while, so check 'stopped' state again
                  if (this.stopped) {
                    this.log.info(`chunk upload skipped (stopped) ${chunkStruct.id} ${chunkStruct.path}`);
                    queue.stop();
                    //                    queue.clear();
                    chunkResolve();
                    return Promise.resolve(); // .reject(new Error('stopped'));
                  }

                  return this.uploadJob(chunkStruct)
                    .then(() => {
                      return this.db.splitDone(chunkStruct.path);
                    })
                    .catch(e => {
                      this.log.error(`chunk upload failed ${chunkStruct.id} ${chunkStruct.path}: ${String(e)}`);
                    })
                    .finally(chunkResolve);
                });
              });
              await p; // need to wait for p to resolve before resolving the filestats outer
            });
        };

        try {
          await splitter(file.path, splitStyle, chunkHandler, this.log);
          queue.stop();
        } catch (splitterError) {
          queue.stop();
          if (String(splitterError) === 'Error: stopped') {
            return Promise.resolve();
          }
          throw splitterError;
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

      if (String(errorMsg).match(/AWS.SimpleQueueService.NonExistentQueue/)) {
        // FATALITY! thrown during sqs.sendMessage
        this.log.error(`instance stopped because of a fatal error`);
        return this.stopEverything();
      }
    } else {
      // this.uploadState('queueLength', 'decr', file2.stats); // this.states.upload.queueLength = this.states.upload.queueLength ? this.states.upload.queueLength - readCount : 0;
      this.uploadState(
        'success',
        'incr',
        merge(
          {
            files: 1,
          },
          file2.stats,
        ),
      ); // this.states.upload.success = this.states.upload.success ? this.states.upload.success + readCount : readCount;

      if (file2.name) {
        // nb. we only count types for successful uploads
        const ext = path.extname(file2.name);
        this.uploadState('types', 'incr', {
          [ext]: 1,
        });
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
      this.downloadWorkerPool[message.MessageId] = 1;

      const timeoutHandle = setTimeout(() => {
        this.log.error(`this.downloadWorkerPool timeoutHandle. Clearing queue slot for message: ${message.MessageId}`);
        throw new Error('download timed out');
      }, (60 + this.config.options.downloadTimeout) * 1000);

      this.processMessage(message)
        .catch(err => {
          this.log.error(`processMessage ${String(err)}`);
        })
        .finally(() => {
          clearTimeout(timeoutHandle);
          if (message) {
            // message is null if split file & stopping
            delete this.downloadWorkerPool[message.MessageId];
          }
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
            .filter(d => d?.length > 0)
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
    // MC-7519: Multiple instances running means multiple outputs need to be namespaced by id_workflow_instance
    folder = path.join(this.config.options.outputFolder, this.config.instance.id_workflow_instance || '');

    /* MC-940: use folder hinting if present */
    if (messageBody.telemetry?.hints?.folder) {
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
      let extra = this.config?.workflow?.settings?.output_format ? this.config.workflow.settings.output_format : [];
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
          return new Promise((resolve, reject) => {
            this.initiateDownloadStream(
              {
                bucket: messageBody.bucket,
                path: fetchObject,
              },
              message,
              fetchFile,
            )
              .then(resolve)
              .catch(e => {
                this.log.error(`Caught exception waiting for initiateDownloadStream: ${String(e)}`);
                if (suffix) {
                  reject(e);
                  return;
                }
                resolve();
              });
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
        const exitStatus = messageBody.telemetry?.json ? messageBody.telemetry.json.exit_status : false;
        if (exitStatus && this.config.options.dataCb) {
          this.config.options.dataCb(outputFile, exitStatus);
        }
      } catch (err) {
        this.log.warn(`failed to fire data callback: ${err}`);
      }
    } else {
      // telemetry-only mode uses readcount from message
      const readCount = messageBody.telemetry.batch_summary?.reads_num
        ? messageBody.telemetry.batch_summary.reads_num
        : 1;

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
    }).catch(e => {
      this.log.warn(`realtimeFeedback failed: ${String(e)}`);
    });

    /* must signal completion */
    return Promise.resolve();
  }

  async initiateDownloadStream(s3Item, message, outputFile) {
    // eslint-disable-next-line
    return new Promise(async (resolve, reject) => {
      let s3;
      try {
        s3 = await this.sessionedS3();
      } catch (e) {
        reject(e);
      }

      let file;
      let rs;

      const onStreamError = err => {
        this.log.error(
          `Error during stream of bucket=${s3Item.bucket} path=${s3Item.path} to file=${outputFile} ${String(err)}`,
        );
        clearTimeout(this.timers.transferTimeouts[outputFile]);
        delete this.timers.transferTimeouts[outputFile];

        if (file.networkStreamError) {
          // already dealing with it
          return;
        }

        try {
          file.networkStreamError = 1; /* MC-1953 - signal the file end of the pipe this the network end of the pipe failed */
          file.close();

          fs.remove(outputFile)
            .then(() => {
              this.log.warn(`removed failed download ${outputFile}`);
            })
            .catch(unlinkException => {
              this.log.warn(`failed to remove ${outputFile}. unlinkException: ${String(unlinkException)}`);
            });

          if (rs.destroy) {
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
        const req = s3.getObject(params);

        // track request/response bytes expected
        req.on('httpHeaders', (status, headers) => {
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
        if (file.networkStreamError) {
          return;
        }

        // SUCCESS
        this.log.debug(`downloaded ${outputFile}`);

        // MC-1993 - store total size of downloaded files
        try {
          const ext = path.extname(outputFile);
          const stats = await filestats(outputFile);
          this.downloadState(
            'success',
            'incr',
            merge(
              {
                files: 1,
              },
              stats,
            ),
          );
          this.downloadState('types', 'incr', {
            [ext]: 1,
          });
          this.downloadState('progress', 'decr', {
            total: stats.bytes,
            bytes: stats.bytes,
          }); // reset in-flight counters
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
        delete this.timers.visibilityIntervals[outputFile];
        clearTimeout(this.timers.transferTimeouts[outputFile]);
        delete this.timers.transferTimeouts[outputFile];

        // MC-2143 - check for more jobs
        setTimeout(this.checkForDownloads.bind(this));
        this.log.info(
          `download.initiateDownloadStream: ${message.MessageId} downloaded ${s3Item.path} to ${outputFile}`,
        );
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
        if (this.stopped) {
          clearInterval(this.timers.visibilityIntervals[outputFile]);
          delete this.timers.visibilityIntervals[outputFile];
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
          await this.sqs
            .changeMessageVisibility({
              QueueUrl: queueUrl,
              ReceiptHandle: receiptHandle,
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

        this.downloadState('progress', 'incr', {
          bytes: chunk.length,
        });
      }).pipe(file); // initiate download stream
    });
  }

  async uploadHandler(file) {
    /** open readStream and pipe to S3.upload */
    const s3 = await this.sessionedS3();

    let rs;

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
        if (readStreamError?.message) {
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

        const options = {
          partSize: 10 * 1024 * 1024,
          queueSize: 1,
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
        const sessionManager = this.initSessionManager(null, [managedUpload.service]);
        sessionManager.sts_expiration = this.sessionManager.sts_expiration; // No special options here, so use the main session and don't refetch until it's expired

        managedUpload.on('httpUploadProgress', async progress => {
          if (this.stopped) {
            reject(new Error('stopped'));
            return;
          }

          //          this.log.debug(`upload progress ${progress.key} ${progress.loaded} / ${progress.total}`);
          this.uploadState('progress', 'incr', {
            bytes: progress.loaded - myProgress,
          }); // delta since last time
          myProgress = progress.loaded; // store for calculating delta next iteration
          clearTimeout(timeoutHandle); // MC-6789 - reset upload timeout
          timeoutHandle = setTimeout(timeoutFunc, (this.config.options.uploadTimeout + 5) * 1000);
          try {
            await sessionManager.session(); // MC-7129 force refresh token on the MANAGED UPLOAD instance of the s3 service
          } catch (e) {
            this.log.warn(`Error refreshing token: ${String(e)}`);
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
                this.uploadState('progress', 'decr', {
                  total: file.size,
                  bytes: file.size,
                }); // zero in-flight upload counters
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

    let sentMessage = {};
    try {
      const inputQueueURL = await this.discoverQueue(this.config.instance.inputQueueName);
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
    }).catch(e => {
      this.log.warn(`realtimeFeedback failed: ${String(e)}`);
    });

    this.log.info(`${file.id} SQS message sent. Mark as uploaded`);
    return this.db.uploadFile(file.path);
  }

  async fetchTelemetry() {
    if (!this.config?.instance?.summaryTelemetry) {
      return Promise.resolve();
    }

    const instancesDir = path.join(rootDir(), 'instances');
    const thisInstanceDir = path.join(instancesDir, this.config.instance.id_workflow_instance);
    const toFetch = [];

    Object.keys(this.config.instance.summaryTelemetry).forEach(componentId => {
      const component = this.config.instance.summaryTelemetry[componentId] || {};
      const firstReport = Object.keys(component)[0]; // poor show
      let url = component[firstReport];

      if (!url) {
        return;
      }

      if (!url.startsWith('http')) {
        url = resolve(this.config.options.url, url);
      }

      const fn = path.join(thisInstanceDir, `${componentId}.json`);

      toFetch.push(
        this.REST.fetchContent(url)
          .then(body => {
            fs.writeJSONSync(fn, body);
            this.reportState$.next(true);
            this.log.debug(`fetched telemetry summary ${fn}`);
            return Promise.resolve(body);
          })
          .catch(e => {
            this.log.debug(`Error fetching telemetry: ${String(e)}`);
            return Promise.resolve(null);
          }),
      );
    });

    let errCount = 0;
    try {
      const allTelemetryPayloads = await Promise.all(toFetch);
      this.instanceTelemetry$.next(allTelemetryPayloads);
    } catch (err) {
      errCount += 1;
    }

    if (errCount) {
      this.log.warn('summary telemetry incomplete');
    }
    return Promise.resolve();
  }
}

EPI2ME_FS.version = utils.version;
EPI2ME_FS.REST = REST;
EPI2ME_FS.utils = utils;
EPI2ME_FS.SessionManager = SessionManager;
EPI2ME_FS.EPI2ME_HOME = rootDir();
EPI2ME_FS.Profile = Profile;
EPI2ME_FS.Factory = Factory;
