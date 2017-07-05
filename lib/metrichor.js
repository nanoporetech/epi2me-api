// Author:        rpettett
// Last Maintained: $Author$
// Last Modified: $Date$
// Id:            $Id$
// $HeadURL$
// $LastChangedRevision$
// $Revision$

/*global console */

"use strict";
const _ = require("lodash");
const AWS = require("aws-sdk");
const defaults = require('./default_options.json');
const fs = require("graceful-fs"); /* MC-565 handle EMFILE gracefully */
const mkdirp = require("mkdirp");
const os = require("os");
const path = require("path");
const proxy = require("proxy-agent");
const queue = require("queue-async");
const utils = require("./utils");
const readdir = require('recursive-readdir') // handle batching

const targetBatchSize = 4000

class metrichor {
    constructor(opt_string) {
        let opts;
        if (typeof opt_string === 'string' || (typeof opt_string === "object" && opt_string.constructor === String)) {
            opts = JSON.parse(opt_string);
        } else {
            opts = opt_string || {};
        }

        if (opts.log) {
            if (_.every([opts.log.info, opts.log.warn, opts.log.error], _.isFunction)) {
                this.log = opts.log;
            } else {
                throw new Error('expected log object to have "error", "info" and "warn" methods');
            }
        } else {
            /* eslint no-console: ["error", { allow: ["log", "warn", "error"]}] */
            let logger = (level, msg) => console.log("[" + (new Date()).toISOString() + `] ${level}: ${msg}`);
            this.log = {
                info:  msg => logger('LOG', msg),
                warn:  msg => logger('WARN', msg),
                error:  msg => logger('ERROR', msg)
            };
        }

        this._stats = {
            upload:   {
                success: 0,
                failure: {},
                queueLength: 0,
                enqueued: 0,
                totalSize: 0
            },
            download: {
                success: 0,
                fail: 0,
                failure: {},
                queueLength: 0,
                totalSize: 0
            }
        };

        // if (opts.filter === 'on') defaults.downloadPoolSize = 5;

        this.config = {
            options: _.defaults(opts, defaults),
            instance: {
                id_workflow_instance   : opts.id_workflow_instance,
                inputQueueName         : null,
                inputQueueURL          : null,
                outputQueueName        : null,
                outputQueueURL         : null,
                _discoverQueueCache    : {},
                bucket                 : null,
                bucketFolder           : null,
                remote_addr            : null,
                chain                  : null
            }
        };

        this.config.instance.awssettings = {
            region: this.config.options.region
        }

        if (this.config.options.inputFolder) {
            if (this.config.options.uploadedFolder && this.config.options.uploadedFolder !== '+uploaded') {
                this.uploadTo = this.config.options.uploadedFolder;
            } else {
                this.uploadTo = path.join(this.config.options.inputFolder, "uploaded");
            }
        }
        // Container for Metrichor API configuration
        /* Container for workflow instance configuration. */
    }

    _list(entity, cb) {
        return utils._get(entity, this.config.options, (e, json) => {
            if (e) {
                this.log.error(e.error);
                cb(e.error);
            } else if (cb) {
                cb(null, json[entity + "s"]);
            }
        });
    }

    _read(entity, id, cb) {
        return utils._get(entity + '/' + id, this.config.options, cb);
    }

    token(id, cb) { /* should this be passed a hint at what the token is for? */
        return utils._post('token', {id_workflow_instance: id || this.config.instance.id_workflow_instance}, null, this.config.options, cb);
    }

    stop_everything(cb) {
        this.log.info("stopping watchers");

        if (this._downloadCheckInterval) {
            this.log.info("clearing _downloadCheckInterval interval");
            clearInterval(this._downloadCheckInterval);
            this._downloadCheckInterval = null;
        }

        if (this._stateCheckInterval) {
            this.log.info("clearing stateCheckInterval interval");
            clearInterval(this._stateCheckInterval);
            this._stateCheckInterval = null;
        }

        if (this._fileCheckInterval) {
            this.log.info("clearing _fileCheckInterval interval");
            clearInterval(this._fileCheckInterval);
            this._fileCheckInterval = null;
        }

        if (this.uploadWorkerPool) {
            this.log.info("clearing uploadWorkerPool");
            this.uploadWorkerPool.drain();
            this.uploadWorkerPool = null;
        }

        if (this.downloadWorkerPool) {
            this.log.info("clearing downloadWorkerPool");
            this.downloadWorkerPool.drain();
            this.downloadWorkerPool = null;
        }

        if (this.config.instance.id_workflow_instance) {
            this.stop_workflow(this.config.instance.id_workflow_instance, () => {
                if (cb) cb();
                this.log.info("workflow instance " + this.config.instance.id_workflow_instance + " stopped");
            });
        } else {
            if (cb) cb();
        }
    }

    session() {
        /* MC-1848 all session requests are serialised through that.sessionQueue to avoid multiple overlapping requests */
        if (!this.sessionQueue) {
            this.sessionQueue = queue(1);
        }

        if (!this._stats.sts_expiration ||
                (this._stats.sts_expiration
                 && this._stats.sts_expiration <= new Date() /* Ignore if session is still valid */
                 && !this.sessionQueue.remaining())) {        /* Throttle to n=1: bail out if there's already a job queued */

            /* queue a request for a new session token and hope it comes back in under this.config.options.sessionGrace time */
            this.sessionQueue.defer(queueCb => this.fetchInstanceToken(queueCb));
        }

        /* carry on regardless. These will fail if the session does
         * expire and isn't refreshed in time - could consider
         * delaying them in those cases
         */
    }

    fetchInstanceToken(queueCb) {

        if (!this.config.instance.id_workflow_instance) {
            throw new Error("must specify id_workflow_instance");
        }

        if (this._stats.sts_expiration &&
                this._stats.sts_expiration > new Date()) {
            /* escape if session is still valid */
            return queueCb();
        }

        this.log.info("new instance token needed");

        this.token(this.config.instance.id_workflow_instance, (tokenError, token) => {
            if (tokenError) {
                this.log.warn("failed to fetch instance token: " + tokenError.error ? tokenError.error : tokenError);
                setTimeout(queueCb, 1000 * this.config.options.waitTokenError); /* delay this one 30 secs so we don't hammer the website */
                return;
            }

            this.log.info("allocated new instance token expiring at " + token.expiration);
            this._stats.sts_expiration = new Date(token.expiration); // Date object for expiration check later
            this._stats.sts_expiration.setMinutes(this._stats.sts_expiration.getMinutes() - this.config.options.sessionGrace); // refresh token x mins before it expires
            // "classic" token mode no longer supported

            if (this.config.options.proxy) {
                AWS.config.update({
                    httpOptions: { agent: proxy(this.config.options.proxy, true) }
                });
            }

            AWS.config.update(this.config.instance.awssettings);
            AWS.config.update(token);
            return queueCb();
        });
    }

    sessionedS3() {
        this.session();
        return new AWS.S3({
            useAccelerateEndpoint: this.config.options.awsAcceleration === "on"
        });
    }

    sessionedSQS() {
        this.session();
        return new AWS.SQS();
    }

    autoStart(workflow_config, cb) {
        this.start_workflow(workflow_config, (workflowError, instance) => {
            if (workflowError) {
                var msg = "Failed to start workflow: " + (workflowError && workflowError.error ? workflowError.error : workflowError);
                this.log.warn(msg);
                if (cb) cb(msg);
                return;
            }

            this.autoConfigure(instance, cb);
        });
    }

    autoJoin(id, cb) {
        this.config.instance.id_workflow_instance = id;

        this.workflow_instance(id, (instanceError, instance) => {
            if (instanceError) {
                var msg = "Failed to join workflow instance: " + (instanceError && instanceError.error ? instanceError.error : instanceError);
                this.log.warn(msg);
                if (cb) cb(msg);
                return;
            }

            if (instance.state === "stopped") {
                this.log.warn("workflow " + id + " is already stopped");
                if (cb) cb("could not join workflow");
                return;
            }

            this.autoConfigure(instance, cb);
        });
    }

    autoConfigure(instance, autoStartCb) {
        let telemetryLogPath, telemetryLogFolder, fileName;

        /* region
         * id_workflow_instance
         * inputqueue
         * outputqueue
         * bucket
         * remote_addr
         * description (workflow)
         * chain
         */
        this.config.instance.id_workflow_instance = instance.id_workflow_instance;
        this.config.instance.id_workflow          = instance.id_workflow;
        this.config.instance.remote_addr          = instance.remote_addr;
        this.config.instance.bucket               = instance.bucket;
        this.config.instance.inputQueueName       = instance.inputqueue;
        this.config.instance.outputQueueName      = instance.outputqueue;
        this.config.instance.awssettings.region   = instance.region || this.config.options.region;
        this.config.instance.bucketFolder         = instance.outputqueue + "/" + instance.id_user + "/" + instance.id_workflow_instance;
        this.config.instance.user_defined         = instance.user_defined; // MC-2387 - parameterisation

        if (instance.chain) {
            if (typeof instance.chain === "object") { // already parsed
                this.config.instance.chain = instance.chain;
            } else {
                try {
                    this.config.instance.chain = JSON.parse(instance.chain);
                } catch (jsonException) {
                    throw new Error("exception parsing chain JSON " + String(jsonException));
                }
            }
        }

        if (!this.config.options.inputFolder) throw new Error("must set inputFolder");
        if (!this.config.options.outputFolder) throw new Error("must set outputFolder");
        if (!this.config.instance.bucketFolder) throw new Error("bucketFolder must be set");
        if (!this.config.instance.inputQueueName) throw new Error("inputQueueName must be set");
        if (!this.config.instance.outputQueueName) throw new Error("outputQueueName must be set");

        /* early request for a session token */
        this.session();

        mkdirp.sync(this.config.options.outputFolder);

        // MC-1828 - include instance id in telemetry file name
        fileName = (this.config.instance.id_workflow_instance) ? "telemetry-" + this.config.instance.id_workflow_instance + ".log" : "telemetry.log";
        telemetryLogFolder = path.join(this.config.options.outputFolder, 'epi2me-logs');
        telemetryLogPath = path.join(telemetryLogFolder, fileName);

        mkdirp(telemetryLogFolder, (mkdirException) => {
            if (mkdirException && !String(mkdirException).match(/EEXIST/)) {
                this.log.error("error opening telemetry log stream: mkdirpException:" + String(mkdirException));
            } else {
                try {
                    this.telemetryLogStream = fs.createWriteStream(telemetryLogPath, { flags: "a" });
                    this.log.info("logging telemetry to " + telemetryLogPath);
                } catch (telemetryLogStreamErr) {
                    this.log.error("error opening telemetry log stream: " + String(telemetryLogStreamErr));
                }
            }
        });

        // sqs event handler
        this._fileCheckInterval = setInterval(this.loadUploadFiles.bind(this), this.config.options.fileCheckInterval * 1000);

        this.inputBatchQueue = queue(1);
        this.log.info("delaying inputBatchQueue slot");
        this.inputBatchQueue.defer((cb) => {
            setTimeout(() => {
                this.log.info("freeing inputBatchQueue slot");
                cb();
            }, this.config.options.initDelay); /* slow connections, e.g. CRP, can take > 5 secs to allocate a STS token */
        });

        this._uploadedFiles = []; // container for files that have been successfully uploaded, but failed to move
        this.loadUploadFiles(); // Trigger once at workflow instance start
        if (autoStartCb) autoStartCb(null, this.config.instance);

        // MC-2068 - Don't use an interval.
        this._downloadCheckInterval = setInterval(this.loadAvailableDownloadMessages.bind(this), this.config.options.downloadCheckInterval * 1000);

        // MC-1795 - stop workflow when instance has been stopped remotely
        this._stateCheckInterval = setInterval(() => {
            this.workflow_instance(this.config.instance.id_workflow_instance, (instanceError, instance) => {
                if (instanceError) {
                    this.log.warn("failed to check instance state: " + (instanceError && instanceError.error ? instanceError.error : instanceError));
                } else {
                    if (instance.state === "stopped") {
                        this.log.warn("instance was stopped remotely at " + instance.stop_date + ". shutting down the workflow.");
                        this.stop_everything(function () {
                            if (typeof this.config.options.remoteShutdownCb === "function") {
                                this.config.options.remoteShutdownCb("instance was stopped outside agent at " + instance.stop_date);
                            }
                        });
                    }
                }
            });
        }, this.config.options.stateCheckInterval * 1000);
    }

    downloadWork(len, cb) {
        if (!cb) cb = function () { return undefined; };
        if (len === undefined || len === null) return cb();

        this._stats.download.queueLength = len;

        if (len > 0) {
            /* only process downloads if there are downloads to process */
            this.log.info(`downloads available: ${len}`);
            return this.downloadAvailable(cb);
        }

        this.log.info("no downloads available");
        return cb();
    }

    loadAvailableDownloadMessages() {
        if (!this.queueLengthQueue) this.queueLengthQueue = queue(1);
        if (this.queueLengthQueue.remaining() > 0) {
            /* don't build up a backlog by queuing another job */
            return;
        }

        this.queueLengthQueue.defer((cb) => {
            let sqs = this.sessionedSQS(),
                queryQueueLength = () => {
                    this.queueLength(this.config.instance.outputQueueURL, len => this.downloadWork(len, cb));
                };

            if (this.config.instance.outputQueueURL) {
                queryQueueLength();
            } else {
                this.discoverQueue(sqs, this.config.instance.outputQueueName,
                    (queueURL) => {
                        this.config.instance.outputQueueURL = queueURL;
                        queryQueueLength();
                    },
                    (err) => {
                        this.log.warn("error looking up queue. " + String(err));
                        if (!this._stats.download.failure) this._stats.download.failure = {};
                        this._stats.download.failure[err] = this._stats.download.failure[err] ? this._stats.download.failure[err] + 1 : 1;
                        return cb();  // clear queueLengthQueue slot
                    });
            }
        });
    }

    downloadAvailable(cb) {
        let sqs = this.sessionedSQS(),
            downloadWorkerPoolRemaining = (this.downloadWorkerPool) ? this.downloadWorkerPool.remaining() : 0;

        if (!cb) cb = () => {}

        if (downloadWorkerPoolRemaining >= this.config.options.downloadPoolSize * 5) { /* ensure downloadPool is limited but fully utilised */
            this.log.info(downloadWorkerPoolRemaining + " downloads already queued");
            return cb();
        }

        this.discoverQueue(sqs, this.config.instance.outputQueueName,
            (queueURL) => {
                this.log.info("fetching messages");
                try {
                    sqs.receiveMessage({
                        QueueUrl:            queueURL,
                        VisibilityTimeout:   this.config.options.inFlightDelay,    // approximate time taken to pass/fail job before resubbing
                        MaxNumberOfMessages: this.config.options.downloadPoolSize, // MC-505 - download multiple threads simultaneously
                        WaitTimeSeconds:     this.config.options.waitTimeSeconds   // long-poll

                    }, (receiveMessageErr, receiveMessageSet) => {
                        this.receiveMessages(receiveMessageErr, receiveMessageSet, cb);
                    });

                } catch (receiveMessageErr) {
                    this.log.error("receiveMessage exception: " + String(receiveMessageErr));
                    return cb();
                }
            },
            (reason) => {
                this._stats.download.failure[reason] = this._stats.download.failure[reason] ? this._stats.download.failure[reason] + 1 : 1;
                return cb();
            });
    }

    loadUploadFiles() {
        /**
         * Entry point for new .fast5 files. Triggered on an interval
         *  - Scan the input folder files
         *      fs.readdir is resource-intensive if there are a large number of files
         *      It should only be triggered when needed
         *  - Push list of new files into uploadWorkerPool (that.enqueueFiles)
         */

        // const fileExp = new RegExp('\\.' + this.config.options.inputFormat + '$');   // only consider files with the specified extension
        const remaining = this.inputBatchQueue ? this.inputBatchQueue.remaining() : 0;

        this.log.info(`${remaining} batches in the inputBatchQueue`);

        // if remaining > 0, there are still files in the inputBatchQueue
        if (!this._dirScanInProgress && remaining === 0) {
            this._dirScanInProgress = true;
            this.log.info('scanning input folder for new files');

            // Filter out files that have already been uploaded or are of the wrong format
            // const fileExp = new RegExp('\\.' + this.config.options.inputFormat + '$')
            const isValidType = item => path.extname(item) === this.config.options.filetype
            let ignorable = (file, stats) => {
                let uploadedFolder = this.config.options.uploadedFolder
                let outputFolder = this.config.options.outputFolder
                if (path.basename(file) === "downloads") return true
                if (path.basename(file) === "uploaded") return true
                if (path.basename(file) === "skip") return true
                if (path.basename(file) === "fail") return true
                if (uploadedFolder && path.basename(file) === path.basename(uploadedFolder)) return true
                if (outputFolder && path.basename(file) === path.basename(outputFolder)) return true
                if (path.basename(file) === "tmp") return true
                if (stats.isDirectory()) return false
                let correctFormat = isValidType(file)
                let fileName = path.posix.basename(file)
                let alreadyUploaded = this._uploadedFiles.indexOf(fileName) > -1
                let ignore = !correctFormat || alreadyUploaded
                return ignore
            }
            const input = this.config.options.inputFolder
            const ignorables = [ignorable]
            readdir(input, ignorables, (err, files) => {

                if (err) return this.log.error(`readdir error: ${err}`);

                // We have an object for each file:
                // { name: 'filename.fast5', batch: 'batch_name' }
                files = files.map(file => {
                    let parsed     = path.parse(file)
                    let batch      = parsed.dir.replace(`${input}`, '').replace("\\", "").replace("/","")
                    let fileObject = { name: parsed.base }
                    if (batch.length) fileObject.batch = batch
                    return fileObject
                })

                this._dirScanInProgress = false;
                this.log.info(`items in input folder: ${files.length}\tnew ${this.config.options.filetype} files: ${files.length}`);

                if (this.config.options.filetype === '.fastq') {
                    this.inputBatchQueue.defer(batch_complete => {
                        let uploadWorkerPool = queue(this.config.options.uploadPoolSize);
                        let statQ = queue(3);
                        files.forEach(file => {
                            statQ.defer(releaseQSlot => {
                                utils.countFileReads(path.join(this.config.options.inputFolder, file.name))
                                    .then(count => {
                                        releaseQSlot();
                                        file.readCount = count;
                                        this._stats.upload.enqueued += count;
                                        uploadWorkerPool.defer(this.uploadJob.bind(this, file));
                                    })
                                    .catch(err => {
                                        this.log.error(err);
                                        releaseQSlot();
                                    });
                            });
                        });
                        statQ.awaitAll(() => {
                            uploadWorkerPool.awaitAll(batch_complete);
                        });
                    });
                } else {
                    utils.chunk(files, this.config.options.uploadBatchSize)
                        .forEach((chunk) => {
                            this._stats.upload.enqueued += chunk.length;
                            this.inputBatchQueue.defer(batch_complete => {
                                let uploadWorkerPool = queue(this.config.options.uploadPoolSize);
                                chunk.forEach((item) => {
                                    uploadWorkerPool.defer(this.uploadJob.bind(this, item))
                                });
                                uploadWorkerPool.awaitAll(batch_complete);
                            });
                        });
                }
            });
        }
    }

    uploadJob(file, completeCb) {
        // Initiate file upload to S3
        this.uploadHandler(file, (errorMsg) => {
            completeCb(); // Release slot in upload queue
            this._stats.upload.enqueued = this._stats.upload.enqueued - (file.readCount || 1);

            if (errorMsg) {
                this.log.error(errorMsg);
                if (!this._stats.upload.failure) {
                    this._stats.upload.failure = {};
                }
                this._stats.upload.failure[errorMsg] = this._stats.upload.failure[errorMsg] ? this._stats.upload.failure[errorMsg] + 1 : 1;
            } else {
                let readCount = file.readCount || 1;
                this._stats.upload.queueLength = this._stats.upload.queueLength ? this._stats.upload.queueLength - readCount : 0;
                this._stats.upload.success     = this._stats.upload.success     ? this._stats.upload.success     + readCount : readCount;
            }
        });
    }

    receiveMessages(receiveMessageError, receiveMessages, cb) {
        if (!cb) {
            cb = function () { return undefined; };
        }

        if (receiveMessageError) {
            this.log.warn("error in receiveMessage " + String(receiveMessageError));
            return cb();
        }

        if (!receiveMessages ||
                !receiveMessages.Messages ||
                !receiveMessages.Messages.length) {
            /* no work to do */
            this.log.info("complete (empty)");

            return cb();
        }

        if (!this.downloadWorkerPool) {
            this.downloadWorkerPool = queue(this.config.options.downloadPoolSize);
        }

        receiveMessages.Messages.forEach(message => {
            this.downloadWorkerPool.defer(queueCb => {
                /* queueCb *must* be called to signal queue job termination */
                let timeoutHandle;
                function done() {
                    clearTimeout(timeoutHandle);
                    queueCb();
                }

                // timeout to ensure this queueCb *always* gets called
                timeoutHandle = setTimeout(() => {
                    done();
                    this.log.error("this.downloadWorkerPool timeoutHandle. Clearing queue slot for message: " + message.Body);
                }, (60 + this.config.options.downloadTimeout) * 1000);
                this.processMessage(message, done); // queueCb becomes completeCb
            });
        });

        this.log.info("downloader queued " + receiveMessages.Messages.length + " files for download");
        return cb();
    }

    deleteMessage(message) {
        let sqs = this.sessionedSQS(),
            messageBody = JSON.parse(message.Body);

        if (this.rentention === "on") {
            /* MC-622 data retention */
            try {
                this.sessionedS3().deleteObject({
                    Bucket: messageBody.bucket,
                    Key:    messageBody.path

                }, function (deleteObjectErr) {
                    if (deleteObjectErr) {
                        this.log.warn(String(deleteObjectErr) + " " + String(deleteObjectErr.stack)); // an error occurred
                    } else {
                        this.log.info("deleteObject " + messageBody.path);
                    }
                });

            } catch (deleteObjectException) {
                this.log.error("deleteObject exception: " + JSON.stringify(deleteObjectException));
            }
        }

        this.discoverQueue(sqs, this.config.instance.outputQueueName,
            (queueURL) => {
                try {
                    sqs.deleteMessage({
                        QueueUrl:      queueURL,
                        ReceiptHandle: message.ReceiptHandle

                    }, function (deleteMessageError) {
                        if (deleteMessageError) {
                            this.log.warn("error in deleteMessage " + String(deleteMessageError));
                        }
                    });

                } catch (deleteMessageErr) {
                    this.log.error("deleteMessage exception: " + String(deleteMessageErr));
                }
            },
            (reason) => {
                this._stats.download.failure[reason] = this._stats.download.failure[reason] ? this._stats.download.failure[reason] + 1 : 1;
            });
    }

    processMessage(message, completeCb) {
        let outputFile, messageBody, fn, folder, match, s3;

        // console.log('processing', message)
        if (!message) {
            this.log.info("empty message");
            return completeCb();
        }

        try {
            messageBody = JSON.parse(message.Body);
        } catch (jsonError) {
            this.log.error("error parsing JSON message.Body from message: " + JSON.stringify(message) + " " + String(jsonError));
            this.deleteMessage(message);
            return completeCb();
        }

        /* MC-405 telemetry log to file */
        if (messageBody.telemetry) {
            try {
                this.telemetryLogStream.write(JSON.stringify(messageBody.telemetry) + os.EOL);
            } catch (telemetryWriteErr) {
                this.log.error("error writing telemetry: " + telemetryWriteErr);
            }
            if (this.config.options.telemetryCb) this.config.options.telemetryCb(messageBody.telemetry);
        }

        if (!messageBody.path) {
            this.log.warn("invalid message: " + JSON.stringify(messageBody));
            return;
        }

        match      = messageBody.path.match(/[\w\W]*\/([\w\W]*?)$/);
        fn         = match ? match[1] : "";
        folder     = this.config.options.outputFolder;

        if (this.config.options.filter === 'on') {
            /* MC-940: use folder hinting if present */
            if (messageBody.telemetry &&
                    messageBody.telemetry.hints &&
                    messageBody.telemetry.hints.folder) {
                this.log.info("using folder hint " + messageBody.telemetry.hints.folder);
                // MC-4987 - folder hints may now be nested.
                // eg: HIGH_QUALITY/CLASSIFIED/ALIGNED
                // or: LOW_QUALITY
                let codes = messageBody.telemetry.hints.folder.split('/');
                folder = path.join.apply(null, [ folder, ...codes ]);
            }
        } else if (this.config.options.filetype === ".fast5") {
            // .fast5 files need to be batched
            // question is if
            folder = this.findSuitableBatchIn(folder)
        }

        mkdirp.sync(folder);
        outputFile = path.join(folder, fn);

        if (this.config.options.downloadMode === "data+telemetry") {
            /* download file from S3 */
            this.log.info("downloading " + messageBody.path + " to " + outputFile);

            s3 = this.sessionedS3();
            this._initiateDownloadStream(s3, messageBody, message, outputFile, completeCb);

        } else if (this.config.options.downloadMode === "telemetry") {
            /* skip download - only interested in telemetry */
            this.deleteMessage(message);

            let readCount = messageBody.telemetry.batch_summary && messageBody.telemetry.batch_summary.reads_num ?
                messageBody.messageBody.telemetry.reads_num : 1;

            this._stats.download.success = this._stats.download.success ? this._stats.download.success + readCount : readCount; // hmm. not exactly "download", these

            /* must signal completion */
            return completeCb();
        }
    }

    // For downloads without the folder split
    // Look inside `folder` and return any batch with a free slot.
    // if no suitable batches, create one and return that.
    findSuitableBatchIn(folder) {
        const prefix = 'batch_'
        const createBatch = () => {
            const batchName = `${prefix}${Date.now()}`
            const newBatchPath = path.join(folder, batchName)
            // console.log('create batch', batchName)
            mkdirp.sync(newBatchPath)
            return newBatchPath
        }
        let batches = fs.readdirSync(folder).filter(d => d.slice(0, prefix.length) === prefix)
        if (!batches.length) return createBatch()
        const latestBatch = path.join(folder, batches.pop())
        if (fs.readdirSync(latestBatch).length < targetBatchSize) {
            // console.log('using batch', latestBatch)
            return latestBatch
        }
        return createBatch()
    }

    _initiateDownloadStream(s3, messageBody, message, outputFile, completeCb) {

        let file,
            transferTimeout,
            rs;

        const deleteFile = () => {
            // cleanup on exception
            if (this.config.options.filter !== 'on') return;
            // don't delete the file if the stream is in append mode
            // ideally the file should be restored to it's original state
            // if the write stream has already written data to disk, the downloaded dataset would be inaccurate
            //
            try {
                // if (file && file.bytesWritten > 0)
                fs.unlink(outputFile, (err) => {
                    if (err) {
                        this.log.warn("failed to remove file: " + outputFile);
                    } else {
                        this.log.warn("removed failed download file: " + outputFile + ' ' + err);
                    }
                });
            } catch (unlinkException) {
                this.log.warn("failed to remove file. unlinkException: " + outputFile + ' ' + String(unlinkException));
            }
        }

        const onStreamError = () => {
            if (!file._networkStreamError) {
                try {
                    file._networkStreamError = 1; /* MC-1953 - signal the file end of the pipe this the network end of the pipe failed */
                    file.close();
                    deleteFile();
                    if (rs.destroy) { //&& !rs.destroyed) {
                        this.log.error("destroying readstream for " + outputFile);
                        rs.destroy();
                    }
                } catch (err) {
                    this.log.error("error handling sream error: " + err.message);
                }
            }
        }

        try {
            file = fs.createWriteStream(outputFile, { 'flags': 'a' });
            rs = s3.getObject({
                Bucket: messageBody.bucket,
                Key:    messageBody.path
            }).createReadStream();
        } catch (getObjectException) {
            this.log.error("getObject/createReadStream exception: " + String(getObjectException));
            if (completeCb) completeCb();
            return;
        }

        rs.on("error", (readStreamError) => {
            this.log.error("error in download readstream " + readStreamError); /* e.g. socket hangup */
            try {
                onStreamError();
            } catch (e) {
                this.log.error("error handling readStreamError: " + e);
            }
        });

        file.on("finish", () => {
            if (!file._networkStreamError) {
                // SUCCESS
                this.log.info("downloaded " + outputFile);

                let readCount = messageBody.telemetry && messageBody.telemetry.batch_summary && messageBody.telemetry.batch_summary.reads_num ?
                    messageBody.telemetry.batch_summary.reads_num :
                    1;

                if (!this._stats.download.success) {
                    this._stats.download.success = readCount;
                } else {
                    this._stats.download.success += readCount
                }

                // MC-1993 - store total size of downloaded files
                try {
                    fs.stat(outputFile, (err, stats) => {
                        if (err) {
                            this.log.warn("failed to fs.stat file: " + err);
                        } else if (stats && stats.size) {
                            // doesn't make sense if file already exists...
                            this._stats.download.totalSize += stats.size;
                            // MC-2540 : if there is some postprocessing to do( e.g fastq extraction) - call the dataCallback
                            // dataCallback might depend on the exit_status ( e.g. fastq can only be extracted from successful reads )
                        }
                    });

                    const logStats = () => {
                        this.log.info("Uploads: " + JSON.stringify(this._stats.upload));
                        this.log.info("Downloads: " + JSON.stringify(this._stats.download));
                    }

                    if (this.config.options.filetype === ".fastq") {
                        // files may be appended, so can't increment the totalSize
                        if (!this._downloadedFileSizes) this._downloadedFileSizes = {};
                        utils.getFileSize(outputFile)
                            .then(size => {
                                this._downloadedFileSizes[outputFile] = size;
                                this._stats.download.totalSize = _.chain(this._downloadedFileSizes).values().sum().value();
                                logStats();
                            })
                            .catch(err => this.log.error(err));
                    } else {
                        utils.getFileSize(outputFile)
                            .then(size => {
                                this._stats.download.totalSize += size;
                                logStats();
                            })
                            .catch(err => this.log.error(err));
                    }

                    // MC-2540 : if there is some postprocessing to do( e.g fastq extraction) - call the dataCallback
                    // dataCallback might depend on the exit_status ( e.g. fastq can only be extracted from successful reads )
                    var exit_status = messageBody.telemetry && messageBody.telemetry.json ? messageBody.telemetry.json.exit_status : false;
                    if (exit_status && this.config.options.dataCb) {
                        this.config.options.dataCb(outputFile, exit_status);
                    }
                } catch (err) {
                    this.log.warn("failed to fs.stat file: " + err);
                }
                this.deleteMessage(message); /* MC-1953 - only delete message on condition neither end of the pipe failed */
            }
        });

        file.on("close", (writeStreamError) => {
            this.log.info("closing writeStream " + outputFile);
            if (writeStreamError) {
                this.log.error("error closing writestream " + writeStreamError);
                /* should we bail and return completeCb() here? */
            }

            /* must signal completion */
            clearTimeout(transferTimeout);
            // MC-2143 - check for more jobs
            setTimeout(this.loadAvailableDownloadMessages.bind(this));
            completeCb();
        });

        file.on("error", (writeStreamError) => {
            this.log.error("error in download write stream " + writeStreamError);
            onStreamError();
        });

        transferTimeout = setTimeout(() => {
            this.log.info("transfer timed out");
            onStreamError();
        }, 1000 * this.config.options.downloadTimeout); /* download stream timeout in ms */

        rs.pipe(file); // initiate download stream
    }

    uploadHandler(item, completeCb) {
        /** open readStream and pipe to S3.upload */
        let s3 = this.sessionedS3(),
            rs,
            batch = item.batch || '',
            fileId   = path.join(this.config.options.inputFolder, batch, item.name),
            objectId = this.config.instance.bucketFolder + "/component-0/" + item.name + "/" + item.name,
            timeoutHandle,
            completed = false;
      
        function done(err) {
            if (!completed) {
                completed = true;
                clearTimeout(timeoutHandle);
                completeCb(err);
            }
        }

        // timeout to ensure this completeCb *always* gets called
        timeoutHandle = setTimeout(() => {
            if (rs && !rs.closed) rs.close();
            done("this.uploadWorkerPool timeoutHandle. Clearing queue slot for file: " + item.name);
        }, (this.config.options.uploadTimeout + 1) * 1000);

        try {
            rs = fs.createReadStream(fileId);
        } catch (createReadStreamException) {
            return done("createReadStreamException exception" + String(createReadStreamException)); // close the queue job
        }

        rs.on("error", (readStreamError) => {
            rs.close();
            if (String(readStreamError).match(/ENOENT/)) {
                this.log.error("uploadHandler readStream error: " + readStreamError.Error);
                // fs.watch probably fired for something which just moved - don't tally as an error. "fs.exists is an antipattern" my arse
                done("error in upload readstream: ENOENT");
            } else {
                done("error in upload readstream: " + readStreamError);
            }
        });

        rs.on("open", () => {
            let params, options;

            params   = {
                Bucket: this.config.instance.bucket,
                Key:    objectId,
                Body:   rs
            };
            options  = { partSize: 10 * 1024 * 1024, queueSize: 1};

            s3.upload(params, options, (uploadStreamErr) => {
                if (uploadStreamErr) {
                    this.log.warn("uploadStreamError " + String(uploadStreamErr));
                    return done("uploadStreamError " + String(uploadStreamErr)); // close the queue job
                }
                this.uploadComplete(objectId, item, done);
                rs.close();
            });
        });

        rs.on('end', rs.close);
        rs.on('close', () => this.log.info("closing readstream"));
    }

    discoverQueue(sqs, queueName, successCb, failureCb) {

        if (this.config.instance._discoverQueueCache[queueName]) {
            if (successCb) successCb(this.config.instance._discoverQueueCache[queueName]);
            return;
        }

        this.log.info("discovering queue for " + queueName);
        sqs.getQueueUrl({ QueueName: queueName }, (getQueueErr, getQueue) => {
            if (getQueueErr) {
                if (this.config.options.proxy && (String(getQueueErr)).match(/Unexpected close tag/)) {
                    this.log.warn("error in getQueueUrl. Could be an aws-sdk/SSL/proxy compatibility issue");
                }
                this.log.warn("uploader: could not getQueueUrl: " + getQueueErr);
                if (failureCb) failureCb("getqueueurl error");
                return;
            }

            if (!getQueue || !getQueue.QueueUrl) return failureCb ? failureCb("getqueueurl error") : null;

            this.log.info("found queue " + getQueue.QueueUrl);
            this.config.instance._discoverQueueCache[queueName] = getQueue.QueueUrl;
            if (successCb) successCb(getQueue.QueueUrl);
        });
    }

    uploadComplete(objectId, item, successCb) {
        let sqs = this.sessionedSQS();
        this.log.info("uploaded " + item.name + " to " + objectId);

        if (this.config.instance.inputQueueURL) {
            return this.sendMessage(sqs, objectId, item, successCb);
        }

        this.discoverQueue(sqs, this.config.instance.inputQueueName,
            (queueURL) => {
                this.config.instance.inputQueueURL = queueURL;
                return this.sendMessage(sqs, objectId, item, successCb);
            },
            (discoverQueueErr) => {
                this.log.warn(discoverQueueErr);
                successCb(discoverQueueErr);
            });
    }

    sendMessage(sqs, objectId, item, successCb) {
        let message = {
            bucket:               this.config.instance.bucket,
            outputQueue:          this.config.instance.outputQueueName,
            remote_addr:          this.config.instance.remote_addr,
            user_defined:         this.config.instance.user_defined || null, // MC-2397 - bind paramthis.config to each sqs message
            apikey:               this.config.options.apikey,
            id_workflow_instance: this.config.instance.id_workflow_instance,
            id_master:            this.config.instance.id_workflow,
            utc:                  new Date().toISOString(),
            path:                 objectId,
            prefix:               objectId.substring(0, objectId.lastIndexOf('/'))
        };

        if (this.config.instance.chain) {
            try {
                message.components        = JSON.parse(JSON.stringify(this.config.instance.chain.components)); // low-frills object clone
                message.targetComponentId = this.config.instance.chain.targetComponentId; // first component to run
            } catch (jsonException) {
                this.log.error("exception parsing components JSON " + String(jsonException));
                return successCb("json exception");// close the queue job
            }
        }
        // MC-1304 - attach geo location and ip
        try {
            if (this.config.options.agent_address) message.agent_address = JSON.parse(this.config.options.agent_address);
        }
         catch (exception) {
            this.log.error("Could not parse agent_address " + String(exception));
         }

        if (message.components) {
            // optionally populate input + output queues
            Object.keys(message.components).forEach(function (o) {
                if (message.components[o].inputQueueName === 'uploadMessageQueue') {
                    message.components[o].inputQueueName = this.uploadMessageQueue;
                }
                if (message.components[o].inputQueueName === 'downloadMessageQueue') {
                    message.components[o].inputQueueName = this.downloadMessageQueue;
                }
            });
        }

        try {
            sqs.sendMessage({
                QueueUrl:    this.config.instance.inputQueueURL,
                MessageBody: JSON.stringify(message)
            }, (sendMessageError) => {
                if (sendMessageError) {
                    this.log.warn("error sending message " + String(sendMessageError));
                    return successCb("sendmessage error"); // close the queue job
                }
                // console.log('test')
                this._moveUploadedFile(item, successCb);
            });
        } catch (sendMessageException) {
            this.log.error("exception sending message " + String(sendMessageException));
            if (successCb) successCb("sendmessage exception"); // close the queue job
        }
    }

    _moveUploadedFile(file, successCb) {
        // console.log('move', file)
        let fileName = file.name
        let fileBatch = file.batch || ''

        let fileTo, fileFrom, streamErrorFlag, readStream, writeStream, renameComplete;
        fileFrom = path.join(this.config.options.inputFolder, fileBatch, fileName);
        fileTo = path.join(this.uploadTo, fileBatch, fileName);

        // console.log(fileFrom, '>', fileTo)

        const done = (err) => {
            if (!renameComplete) {
                renameComplete = true;
                if (err) {
                    successCb(err);
                    this._uploadedFiles.push(fileName); // flag as uploaded to prevent multiple uploads
                } else {
                    successCb();
                }
            }
        }

        const statFile = () => {
            fs.stat(fileTo, (err, stats) => {
                if (err) {
                    this.log.warn("failed to fs.stat uploaded file: " + err);
                } else if (stats && stats.size) {
                    this._stats.upload.totalSize += stats.size;
                }
            });
        }

        const deleteFile = (outputFile) => {
            try {
                fs.unlink(outputFile, (err) => {
                    if (err) {
                        this._uploadedFiles[fileName] = true; // flag as uploaded
                        this.log.warn("failed to remove uploaded file " + fileFrom + " : " + err);
                    }
                });
            } catch (unlinkException) {
                this._uploadedFiles[fileName] = true; // flag as uploaded
                this.log.warn("failed to remove file. unlinkException: " + outputFile + ' ' + String(unlinkException));
            }
        }

        const onError = (err) => {
            done("_moveUploadedFile error: " + err); // close the queue job
            if (err && !streamErrorFlag) {
                streamErrorFlag = true; // flag as uploaded
                try {
                    statFile(fileFrom);
                    writeStream.close();
                    if (readStream.destroy) {
                        this.log.error("destroying upload readstream for " + fileName);
                        readStream.destroy();
                    }
                    deleteFile(fileTo);
                } catch (e) {
                    this.log.error("error removing uploaded target file " + fileTo + " : " + e);
                }
            }
        }

        mkdirp(path.join(this.uploadTo, fileBatch), (mkdirException) => {
            if (mkdirException && !String(mkdirException).match(/EEXIST/)) {
                done("mkdirpException " + String(mkdirException));
                streamErrorFlag = true; // flag as uploaded
                statFile(fileFrom);
            } else {
                // MC-2389 - fs.rename can cause "EXDEV, Cross-device link" exception
                // Ref: http://stackoverflow.com/questions/4568689/how-do-i-move-file-a-to-a-different-partition-or-device-in-node-js

                try {
                    readStream = fs.createReadStream(fileFrom);
                    writeStream = fs.createWriteStream(fileTo)
                        .on("error", (writeStreamError) => onError("writeStream error: " + writeStreamError));

                    readStream
                        .on('close', () => {
                            if (!streamErrorFlag) deleteFile(fileFrom);  // don't delete if there's an error
                            statFile(fileTo);
                            this.log.info("marked " + fileFrom + " as done");
                            done(); // close the queue job // SUCCESS
                        })
                        .on("error", (readStreamError) => onError("failed to rename uploaded file. " + readStreamError))
                        .pipe(writeStream);

                } catch (renameStreamException) {
                    onError("failed to move uploaded file into upload folder: " + String(renameStreamException));
                }
            }
        });
    }

    queueLength(queueURL, cb) {
        let sqs = this.sessionedSQS(),
            queuename;

        if (!cb) cb = function () { return undefined; };
        if (!queueURL) return cb();

        queuename = queueURL.match(/([\w\-_]+)$/)[0];
        this.log.info("querying queue length of " + queuename);

        try {
            sqs.getQueueAttributes({
                QueueUrl:       queueURL,
                AttributeNames: ['ApproximateNumberOfMessages']

            }, (attrErr, attrs) => {
                if (attrErr) {
                    this.log.warn("error in getQueueAttributes: " + String(attrErr));
                    return cb();
                }

                if (attrs && attrs.Attributes && attrs.Attributes.ApproximateNumberOfMessages) {
                    let len = attrs.Attributes.ApproximateNumberOfMessages;
                    len = isNaN(len) ? 0 : parseInt(len, 10);
                    return cb(len);
                }
            });
        } catch (getQueueAttrException) {
            this.log.error("error in getQueueAttributes " + String(getQueueAttrException));
            return cb();
        }
    }

    url() {
        return this.config.options.url;
    }

    apikey() {
        return this.config.options.apikey;
    }

    attr(key, value) {
        if (this.config.options.hasOwnProperty(key)) {
            if (value) {
                this.config.options[key] = value;
            } else {
                return this.config.options[key];
            }
        } else {
            throw new Error("config object does not contain property " + key);
        }
        return this;
    }

    stats(key) {
        if (this._stats[key]) {
            this._stats[key].queueLength = isNaN(this._stats[key].queueLength) ? 0 : this._stats[key].queueLength; // a little housekeeping
            // 'total' is the most up-to-date measure of the total number of reads to be uploaded
            if (key === "upload" && this._uploadedFiles && this._stats && this._stats.upload) {
                this._stats.upload.total = this._uploadedFiles.length + this._stats.upload.enqueued + this._stats.upload.success;
            }
        }
        return this._stats[key];
    }

    user(cb) {
        return utils._get('user', this.config.options, cb);
    }

    attributes(cb) {
        return this._list('attribute', cb);
    }

    workflows(cb) {
        return this._list('workflow', cb);
    }

    workflow(id, obj, cb) {

        if (!cb) {
            // two args: get object
            cb = obj;
            return this._read('workflow', id, cb);
        }

        // three args: update object
        return utils._post('workflow', id, obj, this.config.options, cb);
    }

    start_workflow(config, cb) {
        return utils._post('workflow_instance', null, config, this.config.options, cb);
    }

    stop_workflow(instance_id, cb) {
        return utils._put('workflow_instance/stop', instance_id, null, this.config.options, cb);
    }

    workflow_instances(cb) {
        return this._list('workflow_instance', cb);
    }

    workflow_instance(id, cb) {
        return this._read('workflow_instance', id, cb);
    }

    workflow_config(id, cb) {
        return utils._get('workflow/' + id, this.config.options, cb);
    }
}

module.exports         = metrichor;
module.exports.version = '2.48.1';
