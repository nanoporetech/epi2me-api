// Author:        rpettett
// Last Maintained: $Author$
// Last Modified: $Date$
// Id:            $Id$
// $HeadURL$
// $LastChangedRevision$
// $Revision$

/*jslint nomen: true*/
/*global require, module, $, metrichor */
"use strict";
var request, jqWrap, AWS, queue, fs, path, os, mkdirp, proxy;

try {
    if ($) { // typeof $ !== 'undefined'
        // JQUERY MODE
        var jqWrap = function (method, params, cb) {
            /*jslint unparam: true*/
            $.ajax({
                url:     params.uri,
                type:    method,
                success: function (data,  status, jqXHR) { cb(null,   data, jqXHR.responseText); },
                error:   function (jqXHR, status, errStr) { cb(errStr, null, jqXHR.responseText); }, /* better do something sensible with this! */
                data:    params.form,
                dataType: "json"
            });
        };

        request = {
            put:  function (params, cb) { return jqWrap('PUT',  params, cb); },
            get:  function (params, cb) { return jqWrap('GET',  params, cb); },
            post: function (params, cb) { return jqWrap('POST', params, cb); }
        };
    }

} catch (exception) {
    // NODEJS MODE
    request = require("request");
    AWS     = require("aws-sdk");
    fs      = require("graceful-fs"); /* MC-565 handle EMFILE gracefully */
    os      = require("os");
    queue   = require("queue-async");
    path    = require("path");
    mkdirp  = require("mkdirp");
    proxy   = require("proxy-agent");

    module.exports         = metrichor;
    module.exports.version = '0.7.0';
}

function metrichor(opt_string) {
    opt_string = opt_string || '{}';
    var opts;

    if (typeof opt_string === 'string' ||
            (typeof opt_string === "object" &&
            opt_string.constructor === String)) {
        opts = JSON.parse(opt_string);
    } else {
        opts = opt_string;
    }

    this._url                = opts.url || 'https://metrichor.com';
    this._apikey             = opts.apikey;
    this._proxy              = opts.proxy;
    this._agent_version      = opts.agent_version;

    /* below are the consolidated harness options for 0.7.0 */

    /* common settings */
    this._idWorkflowInstance    = opts.id_workflow_instance;
    this.bucket                 = opts.bucket;
    this.bucketFolder           = opts.bucketFolder;
    this.remote_addr            = opts.remote_addr;
    this.log                    = function (str) { console.log("[" + (new Date()).toISOString() + "] " + str); };
    this._queueLengthTimeStamps = {};
    this._discoverQueueCache    = {};
    this.retention              = "on";

    this.awssettings            = {
        region: opts.region || "eu-west-1"
    };

    /* upload settings */
    this.inputFolder     = opts.inputFolder;
    this.inputQueueName   = opts.inputQueueName;
    this.chain            = opts.chain;
    this.uploadPoolSize   = 10;

    /* download settings */
    this.outputFolder    = opts.outputFolder;
    this.outputQueueName  = opts.outputQueueName;
    this.inFlightDelay    = 600;           // wait 5 mins before resub
    this.waitTimeSeconds  = 20;            // long-poll wait 20 seconds for messages
    this.downloadPoolSize = 10;            // MC-505 how many things to download at once
    this.filter           = opts.filter       || "on";
    this.downloadMode     = opts.downloadMode || "data+telemetry";

    this.resetStats();

    return this;
}

metrichor.prototype = {
    _accessor : function (field, value) {
        var store = '_' + field;
        if (value !== undefined) {
            this[store] = value;
        }
        return this[store];
    },

    url : function (url) {
        return this._accessor('url', url);
    },

    apikey : function (apikey) {
        return this._accessor('apikey', apikey);
    },

    stats: function (key) {
        return this._stats[key];
    },

    user : function (cb) {
        return this._get('user', cb);
    },

    workflows : function (cb) {
        return this._list('workflow', cb);
    },

    workflow : function (id, obj, cb) {

        if (!cb) {
            // two args: get object
            cb = obj;
            return this._read('workflow', id, cb);
        }

        // three args: update object
        return this._post('workflow', id, obj, cb);
    },

    start_workflow : function (workflow_id, cb) {
        return this._post('workflow_instance', null, { "workflow": workflow_id }, cb);
    },

    stop_workflow : function (instance_id, cb) {
        return this._put('workflow_instance/stop', instance_id, cb);
    },

    workflow_instances : function (cb) {
        return this._list('workflow_instance', cb);
    },

    workflow_instance : function (id, cb) {
        return this._read('workflow_instance', id, cb);
    },

    token : function (id, cb) { /* should this be passed a hint at what the token is for? */
        var that = this;
        return that._post('token', {id_workflow_instance: id || that._idWorkflowInstance}, null, cb);
    },

    telemetry : function (id_workflow_instance, obj, cb) {
        if (cb === null) {
            // two args: get object
            cb = obj;
            return this._read('workflow_instance/telemetry', id_workflow_instance, cb);
        }

        // three args: update object
        return this._post('workflow_instance/telemetry', id_workflow_instance, obj, cb);
    },

    _list : function (entity, cb) {
        return this._get(entity, function (e, json) {
            cb(e, json[entity + "s"]);
        });
    },

    _read : function (entity, id, cb) {
        return this._get(entity + '/' + id, cb);
    },

    _get : function (uri, cb) {
        // do something to get/set data in metrichor
        var call, mc,
            srv = this.url();

        uri = "/" + uri + ".js?apikey=" + this.apikey();
        srv = srv.replace(/\/+$/, ""); // clip trailing /s
        uri = uri.replace(/\/+/g, "/");

        if (this._agent_version) {
            uri = uri + ";agent_version=" + this._agent_version;
        }

        call = srv + uri;
        mc   = this;

        request.get(
            {
                uri   : call,
                proxy : this._proxy
            },
            function (e, r, body) {
                mc._responsehandler(e, r, body, cb);
            }
        );
    },

    _post : function (uri, id, obj, cb) {
        var srv, call, that = this,
            form = {
                apikey: that.apikey(),
            };

        if (obj !== undefined) {
            form.json = JSON.stringify(obj);
        }

        if (that._agent_version) {
            form.agent_version = that._agent_version;
        }

        /* if id is an object, merge it into form post parameters */
        if (id && typeof id === 'object') {
            Object.keys(id).forEach(function (attr) {
                form[attr] = id[attr];
            });

            id = "";
        }

        srv  = that.url();
        srv  = srv.replace(/\/+$/, ""); // clip trailing /s
        uri  = uri.replace(/\/+/g, "/");
        call = srv + '/' + uri;

        if (id) {
            call = call + '/' + id;
        }
        call += '.js';

        request.post(
            {
                uri   : call,
                form  : form,
                proxy : that._proxy
            },
            function (e, r, body) {
                that._responsehandler(e, r, body, cb);
            }
        );
    },

    _put : function (uri, id, obj, cb) {
        /* three-arg _put call (no parameters) */
        if (typeof obj === 'function') {
            cb = obj;
        }

        var srv, call, that = this,
            form = {
                apikey: that.apikey(),
                json:   JSON.stringify(obj)
            };

        if (that._agent_version) {
            form.agent_version = that._agent_version;
        }

        srv  = that.url();
        srv  = srv.replace(/\/+$/, ""); // clip trailing /s
        uri  = uri.replace(/\/+/g, "/");
        call = srv + '/' + uri + '/' + id + '.js';

        request.put(
            {
                uri   : call,
                form  : form,
                proxy : that._proxy
            },
            function (e, r, body) {
                that._responsehandler(e, r, body, cb);
            }
        );
    },

    _responsehandler : function (res_e, r, body, cb) {
        if (res_e) {
            return cb(res_e, {});
        }

        if (r && r.statusCode >= 400) {
            return cb({"error": "HTTP status " + r.statusCode}, {});
        }

        var json;
        try {
            json = JSON.parse(body);

        } catch (jsn_e) {
            return cb(jsn_e, {});
        }

        if (json.error) {
            return cb({"error": json.error}, {});
        }

        return cb(null, json);
    },

    resetStats: function () {
        this._stats = {
            upload:   { success: 0, failure: {} },
            download: { success: 0, failure: {} }
        };
        this.transfersInProgress = {}; // maybe should use _stats ?
    },

    on: function (eventName, eventHandler) {
        var that = this,
            workChecker,
            timedChecker;

        if (eventName === "folderChange") {
            if (that._fsWatcher) {
                // arbitrary limit: only one folder-watcher at a time
                that._fsWatcher.close();
            }

            that._fsWatcher = fs.watch(that.inputFolder, function (event, filename) {
                eventHandler(event, filename);
            });

            return;
        }

        if (eventName === "downloadAvailable") {
            if (that._downloadQueueInterval) {
                // arbitrary limit: only one queue-timer at a time
                clearInterval(that._downloadQueueInterval);
            }
            that.log("setting up timer interval");

            workChecker = function (len) {
                that._stats.download.queueLength = len;

                if (len) {
                    that.log("download available: " + len);
                    eventHandler();
                }
                return;
            };

            timedChecker = function () {
                that.log("download heartbeat");

                that.sessionedSQS(function (sqs) {
                    if (that.outputQueueURL) {
                        return that.queueLength(that.outputQueueURL, workChecker, 1);
                    }

                    that.discoverQueue(sqs, that.outputQueueName,
                        function (queueURL) {
                            that.log("discovered queue " + queueURL);
                            that.outputQueueURL = queueURL;
                            return that.queueLength(that.outputQueueURL, workChecker, 1);
                        },
                        function (err) {
                            that.log("error looking up queue. " + String(err));
                            if (!that._stats.download.failure) {
                                that._stats.download.failure = {};
                            }
                            that._stats.download.failure[err] = that._stats.download.failure[err] ? that._stats.download.failure[err] + 1 : 1;
                            return;
                        });
                });
            };

            that._downloadQueueInterval = setInterval(timedChecker, 4000); // Should be a setTimeout with variable delay rather than static 4000ms poll
            return;
        }

        throw new Error("unsupported event: " + eventName);
    },

    stop_everything: function (cb) {
        var that = this;

        that.log("stopping watchers");

        // should probably use another quick queue-async here

        if (that._idWorkflowInstance) {
            that.stop_workflow(that._idWorkflowInstance, function () {
                that.log("workflow instance " + that._idWorkflowInstance + " stopped");
            });
        }

        if (that._fsWatcher) {
            that.log("stopping folder watcher");
            that._fsWatcher.close();
            that.log("stopped folder watcher");
        }

        if (that._downloadQueueInterval) {
            that.log("stopping queue watcher");
            clearInterval(that._downloadQueueInterval);
            that.log("stopped queue watcher");
        }

        that.log("stopped everything");

        if (cb) {
            return cb();
        }
    },

    session: function (cb) {
        var that = this;

        if (!that._stats.sts_expiration ||
                that._stats.sts_expiration < new Date()) {

            that.log("new session token needed");

            if (!that._idWorkflowInstance) {
                throw new Error("must specify id_workflow_instance");
            }

            that.token(that._idWorkflowInstance, function (tokenError, token) {
                if (tokenError) {
                    that.log("failed to fetch session token: " + tokenError);
                    return;
                }

                that.log(JSON.stringify(token));
                that.log("allocated new session token expiring at " + token.expiration);
                that._stats.sts_expiration = new Date(token.expiration); // Date object for expiration check later
                that._stats.sts_expiration.setMinutes(that._stats.sts_expiration.getMinutes() - 2); // refresh token 2 mins before it expires
                // "classic" token mode no longer supported

                if (that.proxy) {
                    AWS.config.update({
                        httpOptions: { agent: proxy(that.proxy, true) }
                    });
                }

                AWS.config.update(that.awssettings);
                AWS.config.update(token);
                cb();
            });

            return; /* if existing session is invalid */
        }

        cb(); /* if existing session is valid */
    },

    sessionedS3: function (cb) {
        var that = this;
        that.session(function () {
            var s3 = new AWS.S3();
            cb(s3);
        });
    },

    sessionedSQS: function (cb) {
        var that = this;
        that.session(function () {
            var sqs = new AWS.SQS();
            cb(sqs);
        });
    },

    autoStart: function (id) {
        var that = this;
        that.start_workflow(id, function (workflowError, instance) {
            if (workflowError) {
                that.log("failed to start workflow: " + (workflowError && workflowError.error ? workflowError.error : workflowError));
                return;
            }

            /* region
             * id_workflow_instance
             * inputqueue
             * outputqueue
             * bucket
             * remote_addr
             * description (workflow)
             * chain
             */
            that._idWorkflowInstance = instance.id_workflow_instance;
            that.chain               = instance.chain;
            that.remote_addr         = instance.remote_addr;
            that.bucket              = instance.bucket;
            that.inputQueueName      = instance.inputqueue;
            that.outputQueueName     = instance.outputqueue;
            that.awssettings.region  = instance.region;
	    that.bucketFolder        = instance.outputqueue + "/" + instance.id_user + "/" + instance.id_workflow_instance;

            that.autoConfigure();
        });
    },

    autoConfigure: function () {
        var i, blocker, telemetryLogPath,
            that = this;

        if (!that.inputFolder) {
            throw new Error("must set inputFolder");
        }

        if (!that.bucketFolder) {
            throw new Error("bucketFolder must be set");
        }

        if (!that.inputQueueName) {
            throw new Error("inputQueueName must be set");
        }

        if (!that.outputQueueName) {
            throw new Error("outputQueueName must be set");
        }

        // configure the upload queue, but start slowly (artificially occupied slots for a few seconds)
        if (!that.uploadWorkerPool) {
            that.uploadWorkerPool = queue(that.uploadPoolSize + 1);
            that.uploadWorkerPool.defer(function () { that.log("initialising upload worker pool"); }); // first slot never allows that.uploadWorkerPool to complete
        }

        blocker = function () {
            that.uploadWorkerPool.defer(function (cb) { global.setTimeout(function () { that.log("unblocking slot"); cb(); }, 5000); });
        };

        for (i = 1; i < that.uploadPoolSize; i += 1) {
            that.log("blocking slot " + i);
            blocker();
        }

        // fs.watch event handler
        that.on("folderChange", function (event, item) {
            if (item.match(/fast5$/)) {
                // file might be newly created / touched / deleted / moved
                that.log("fs.watch " + event + " " + item);
                that.enqueueUploadJob(item);
            }
        });

        // initial folder-scan for existing files which won't trigger the fs.watch event. only run once.
        fs.readdir(that.inputFolder, function (readdirErr, files) {
            if (readdirErr) {
                that.log("error reading folder " + String(readdirErr));
            }

            files.forEach(function (item) {
                if (item.match(/fast5$/)) {
                    that.enqueueUploadJob(item);
                }
            });
        });

        if (!that.downloadWorkerPool) {
            that.downloadWorkerPool = queue(that.downloadPoolSize + 1);
            that.downloadWorkerPool.defer(function () { that.log("initialising download worker pool"); }); // first slot never allows that.downloadWorkerPool to complete
        }

        mkdirp.sync(that.outputFolder);
        telemetryLogPath = path.join(that.outputFolder, "telemetry.log");

        try {
            that.telemetryLogStream = fs.createWriteStream(telemetryLogPath, { flags: "a" });
            that.log("logging telemetry to " + telemetryLogPath);

        } catch (telemetryLogStreamErr) {
            that.log("error opening telemetry log stream: " + String(telemetryLogStreamErr));
        }

        // sqs event handler
        that.on("downloadAvailable", function () {
            that.downloadAvailable();
        });
    },

    downloadAvailable: function () {
        var that = this;

        that.sessionedSQS(function (sqs) {
            that.discoverQueue(sqs, that.outputQueueName,
                function (queueURL) {
		    that.log("fetching messages");
                    try {
                        sqs.receiveMessage({
                            QueueUrl:            queueURL,
                            VisibilityTimeout:   that.inFlightDelay,    // approximate time taken to pass/fail job before resubbing
                            MaxNumberOfMessages: that.downloadPoolSize, // MC-505 - download multiple threads simultaneously
                            WaitTimeSeconds:     that.waitTimeSeconds   // long-poll

                        }, function (receiveMessageErr, receiveMessageSet) {
                            that.receiveMessages(receiveMessageErr, receiveMessageSet);
                        });

                    } catch (receiveMessageErr) {
                        that.log("receiveMessage exception: " + String(receiveMessageErr));
                    }
                },
                function (reason) {
                    that._stats.download.failure[reason] = that._stats.download.failure[reason] ? that._stats.download.failure[reason] + 1 : 1;
                });
        });
    },

    receiveMessages: function (receiveMessageError, receiveMessages) {
        var that = this;

        if (receiveMessageError) {
            that.log("error in receiveMessage " + String(receiveMessageError));
            return;
        }

        if (!receiveMessages ||
                !receiveMessages.Messages ||
                !receiveMessages.Messages.length) {
            /* no work to do */
            that.log("complete (empty)");

            return;
        }

        receiveMessages.Messages.forEach(function (message) {
            that.downloadWorkerPool.defer(function (completeCb) {
                that.transfersInProgress[message.ReceiptHandle] = new Date(); // should use that._stats here?
                /* cb *must* be called to signal queue job termination */
                that.processMessage(message, function () {
                    delete that.transfersInProgress[message.ReceiptHandle]; // should use that._stats here?
                    return completeCb();
                });
            });

            return;
        });
    },

    deleteMessage: function (message) {
        var that = this,
            messageBody = JSON.parse(message.Body);

        if (that.rentention === "on") {
            /* MC-622 data retention */
            that.sessionedS3(function (s3) {
                try {
                    s3.deleteObject({
                        Bucket: messageBody.bucket,
                        Key:    messageBody.path
                    }, function (deleteObjectErr) {
                        if (deleteObjectErr) {
                            that.log(String(deleteObjectErr) + " " + String(deleteObjectErr.stack)); // an error occurred
                        } else {
                            that.log("deleteObject " + messageBody.path);
                        }
                    });

                } catch (deleteObjectException) {
                    that.log("deleteObject exception: " + JSON.stringify(deleteObjectException));
                }
            });
        }

        that.sessionedSQS(function (sqs) {
            that.discoverQueue(sqs, that.outputQueueName,
                function (queueURL) {
                    try {
                        sqs.deleteMessage({
                            QueueUrl:      queueURL,
                            ReceiptHandle: message.ReceiptHandle

                        }, function (deleteMessageError) {
                            if (deleteMessageError) {
                                that.log("error in deleteMessage " + String(deleteMessageError));
                            }
                            that.log("deleteMessage success");
                        });

                    } catch (deleteMessageErr) {
                        that.log("deleteMessage exception: " + String(deleteMessageErr));
                    }
                },
                function (reason) {
                    that._stats.download.failure[reason] = that._stats.download.failure[reason] ? that._stats.download.failure[reason] + 1 : 1;
                });
        });
    },

    processMessage: function (message, completeCb) {
        var outputFile, messageBody, fn, folder, match, exit_status, file, rs, transferTimeout,
            that = this;

        if (!message) {
            that.log("empty message");
            return completeCb();
        }

        try {
            messageBody = JSON.parse(message.Body);

        } catch (jsonError) {
            that.log("error parsing JSON message.Body from message: " + JSON.stringify(message) + " " + String(jsonError));

            that.deleteMessage(message);
            return completeCb();
        }

//        that.log("telemetry:" + JSON.stringify(messageBody.telemetry));

        /* MC-405 telemetry log to file */
        if (messageBody.telemetry) {
            try {
                that.telemetryLogStream.write(JSON.stringify(messageBody.telemetry) + os.EOL);

            } catch (telemetryWriteErr) {
                that.log("error writing telemetry: " + telemetryWriteErr);
            }
        }

        if (!messageBody.path) {
            that.log("invalid message: " + JSON.stringify(messageBody));
            return;
        }

        match      = messageBody.path.match(/[\w\W]*\/([\w\W]*?)$/);
        fn         = match ? match[1] : "";
        folder     = that.outputFolder;

        if (that.filter === 'on') {
            /* MC-940: use folder hinting if present */
            if (messageBody.telemetry &&
                    messageBody.telemetry.hints &&
                    messageBody.telemetry.hints.folder) {
                that.log("using folder hint");
                folder = path.join(folder, messageBody.telemetry.hints.folder);
            }

            /* MC-348 Purity Filter exit_status =~ /Workflow successful/ */
            if (messageBody.telemetry &&
                    !messageBody.telemetry.hints &&
                    messageBody.telemetry.json &&
                    messageBody.telemetry.json.exit_status) {

                exit_status = messageBody.telemetry.json.exit_status;

                if (exit_status.match(/workflow[ ]successful/i)) {
                    folder = path.join(folder, "pass");

                } else {
                    folder = path.join(folder, "fail");
                }
            }

            /* make the target folder; todo: add error check */
            mkdirp.sync(folder);
        }

        outputFile = path.join(folder, fn);

        if (that.downloadMode === "data+telemetry") {
            /* download file from S3 */
            that.log("downloading " + messageBody.path + " to " + outputFile);

            that.sessionedS3(function (s3) {
                file = fs.createWriteStream(outputFile);
                try {
                    rs = s3.getObject({
                        Bucket: messageBody.bucket,
                        Key:    messageBody.path
                    }).createReadStream();

                } catch (getObjectErr) {
                    that.log("getObject/createReadStream exception: " + String(getObjectErr));
                    file.close();
                    return completeCb();
                }

                rs.on("error", function (readStreamError) {
                    that.log("error in readstream " + readStreamError); /* e.g. socket hangup */
                    try {
                        fs.unlink(outputFile); /* likely to be corrupt */
                    } catch (ignore) {
                    }

                    /* figure out how to cleanly requeue a download
                     * message - as soon as file is closed here it will
                     * call deleteMessage unrecoverably */
                    file.close();

                    /* must signal completion */
                    clearTimeout(transferTimeout);
                    return completeCb();
                });

                file.on("close", function (writeStreamError) {
                    if (writeStreamError) {
                        that.log("error closing writestream " + writeStreamError);
                        /* should we bail and return completeCb() here? */
                    }

                    that.deleteMessage(message);

                    that.log("downloaded " + messageBody.path + " to " + outputFile);

                    that._stats.download.success = that._stats.download.success ? that._stats.download.success + 1 : 1;

                    /* must signal completion */
                    clearTimeout(transferTimeout);
                    return completeCb();
                });

                transferTimeout = setTimeout(function () {
                    that.log("transfer timed out");
                    rs.emit("error", new Error("downloader: transfer timed out"));
                }, 300000); /* 5 minute timeout in ms */

                transferTimeout.id = fn;

                rs.pipe(file);
            });

        } else {
            /* skip download - only interested in telemetry */
            that.deleteMessage(message);
            if (that.requestSuccess) {
                that.requestSuccess();
            }

            /* must signal completion */
            return completeCb();
        }
    },

    enqueueUploadJob: function (item) {
        var that = this;

        if (that._stats.upload.enqueueCount) {
            that._stats.upload.enqueueCount += 1;
        } else {
            that._stats.upload.enqueueCount = 0;
        }

        that.uploadWorkerPool.defer(function (completeCb) {
            that.queueLength(that.inputQueueURL, function (len) {
                that._stats.upload.queueLength = len;
            }); // async request for upload queue length

            that.uploadHandler(item, function (result) {
                if (isNaN(result)) {
                    if (!that._stats.upload.failure) {
                        that._stats.upload.failure = {};
                    }

                    that._stats.upload.failure[result] = that._stats.upload.failure[result] ? that._stats.upload.failure[result] + 1 : 1;

                } else {
                    that._stats.upload.success = that._stats.upload.success ? that._stats.upload.success + 1 : 1;
                }

                return completeCb();
            });
        });
    },

    uploadHandler: function (item, successCb) {
        var that = this;

        that.sessionedS3(function (s3) {
            var rs,
                fileId   = path.join(that.inputFolder, item),
                objectId = that.bucketFolder + "/" + (that.inputQueueName ? that.inputQueueName + "/" : "") + item;

            try {
                rs = fs.createReadStream(fileId);

            } catch (readStreamException) {
                that.log("failed to createReadStream " + String(readStreamException));
                return successCb("readstream exception"); // close the queue job
            }

            rs.on("error", function (readStreamError) {
                if (String(readStreamError).match(/ENOENT/)) {
                    // fs.watch probably fired for something which just moved - don't tally as an error. "fs.exists is an antipattern" my arse
                    return successCb("ignore");
                }

                that.log("error in readstream: " + readStreamError);
                return successCb("readstream error"); // close the queue job
            });

            rs.on("open", function () {
                var params, options;

                params   = {
                    Bucket: that.bucket,
                    Key:    objectId,
                    Body:   rs
                };
                options  = { partSize: 10 * 1024 * 1024, queueSize: 1};

                try {
                    s3.upload(params, options, function (uploadStreamErr) {

                        if (uploadStreamErr) {
                            that.log("uploadStreamError " + String(uploadStreamErr));
                            that.log("requeuing " + item);
                            that.enqueueUploadJob(item);
                            return successCb("upload error"); // close the queue job
                        }

                        that.uploadComplete(objectId, item, successCb);
                    });

                } catch (uploadStreamException) {
                    that.log("failed to upload: " + String(uploadStreamException));
                    that.log("requeuing " + item);
                    that.enqueueUploadJob(item);

                    return successCb("upload exception"); // close the queue job
                }
            });
        });
    },

    discoverQueue: function (sqs, queueName, successCb, failureCb) {
        var that = this;

        if (that._discoverQueueCache[queueName]) {
            return successCb(that._discoverQueueCache[queueName]);
        }

        that.log("discovering queue for " + queueName);

        try {
            sqs.getQueueUrl({ QueueName: queueName }, function (getQueueErr, getQueue) {
                if (getQueueErr) {
                    if (that.proxy && (String(getQueueErr)).match(/Unexpected close tag/)) {
                        that.log("error in getQueueUrl. Could be an aws-sdk/SSL/proxy compatibility issue");
                    }

                    that.log("uploader: could not getQueueUrl: " + getQueueErr);
                    return failureCb("getqueueurl error");
                }

                that.log("found queue " + getQueue.QueueUrl);
                that._discoverQueueCache[queueName] = getQueue.QueueUrl;

                return successCb(getQueue.QueueUrl);
            });

        } catch (getQueueException) {
            that.log("exception in getQueueUrl: " + String(getQueueException));

            return failureCb("getqueueurl exception");
        }
    },

    uploadComplete: function (objectId, item, successCb) {
        var that = this;
        that.log("uploaded " + item + " to " + objectId);

        /* initialise SQS on autoConfigure or after first upload ? */
        that.sessionedSQS(function (sqs) {
            if (that.inputQueueURL) {
                return that.sendMessage(sqs, objectId, item, successCb);
            }

            that.discoverQueue(sqs, that.inputQueueName,
                function (queueURL) {
                    that.inputQueueURL = queueURL;
                    return that.sendMessage(sqs, objectId, item, successCb);
                },
                function (err) {
                    that.log("requeuing " + item);
                    that.enqueueUploadJob(item);
                    return successCb(err);
                });
        });
    },

    sendMessage: function (sqs, objectId, item, successCb) {
        var that    = this,
            message = {
                bucket:               that.bucket,
                outputQueue:          that.outputQueueName,
                remote_addr:          that.remote_addr,
                apikey:               that.apikey,
                id_workflow_instance: that._idWorkflowInstance,
                utc:                  new Date().toISOString(),
//                message.inputFolder = that.runFolder; // MC-960 folder aggregation messages
                path:                 objectId,
                // components        // chained workflow structure
                // targetComponentId // first component to run
            };

	if(that.chain) {
            message.components        = JSON.parse(JSON.stringify(that.chain.components)); // low-frills object clone
            message.targetComponentId = that.chain.targetComponentId; // first component to run
	}

	if(message.components) {
            // optionally populate input + output queues
            Object.keys(message.components).forEach(function (o) {
		if (message.components[o].inputQueueName === 'uploadMessageQueue') {
                    message.components[o].inputQueueName = that.uploadMessageQueue;
		}

		if (message.components[o].inputQueueName === 'downloadMessageQueue') {
                    message.components[o].inputQueueName = that.downloadMessageQueue;
		}
            });
	}

        try {
            sqs.sendMessage({
                QueueUrl:    that.inputQueueURL,
                MessageBody: JSON.stringify(message)

            }, function (sendMessageError) {
                var fileFrom = path.join(that.inputFolder, item),
                    folderTo = path.join(that.inputFolder, "uploaded"),
                    fileTo   = path.join(folderTo, item);

                if (sendMessageError) {
                    that.log("error sending message " + String(sendMessageError));
                    that.log("requeuing " + item);
                    that.enqueueUploadJob(item);

                    return successCb("sendmessage error"); // close the queue job
                }

                that.log("message sent " + JSON.stringify(message));
                mkdirp(folderTo, function (mkdirException) {
                    if (mkdirException && !String(mkdirException).match(/EEXIST/)) {
                        that.log("mkdirpException " + String(mkdirException));
                    }

                    fs.rename(fileFrom, fileTo, function (renameException) {
                        if (renameException) {
                            that.log("renameException " + String(renameException));
                        }

                        that.log("marked " + item + " as done");
                        return successCb(1); // close the queue job // SUCCESS
                    });
                });
            });

        } catch (sendMessageException) {
            that.log("exception sending message " + String(sendMessageException));
            that.log("requeuing " + item);
            that.enqueueUploadJob(item);

            return successCb("sendmessage exception"); // close the queue job
        }
    },

    queueLength: function (queueURL, cb, forceUpdate) {
        var that = this,
            now = new Date();

        if (queueURL &&
                (forceUpdate ||
                    (!that._queueLengthTimeStamps[queueURL] ||
                     that._queueLengthTimeStamps[queueURL] < now))) {

            that._queueLengthTimeStamps[queueURL] = now;
            that._queueLengthTimeStamps[queueURL].setMinutes(that._queueLengthTimeStamps[queueURL].getMinutes() + 1);
        } else {
            return;
        }

//        that.log("querying queue length of " + queueURL);

        that.sessionedSQS(function (sqs) {
            try {
                sqs.getQueueAttributes({
                    QueueUrl:       queueURL,
                    AttributeNames: ['ApproximateNumberOfMessages']

                }, function (attrErr, attrs) {
                    if (attrErr) {
                        that.log("error in getQueueAttributes: " + String(attrErr));
                        return;
                    }

                    if (attrs &&
                            attrs.Attributes &&
                            attrs.Attributes.ApproximateNumberOfMessages) {
			var len = attrs.Attributes.ApproximateNumberOfMessages;
			len = isNaN(len) ? 0 : 0+parseInt(len);
                        cb(len);
                    }
                });

            } catch (getQueueAttrException) {
                that.log("error in getQueueAttributes " + String(getQueueAttrException));
            }
        });
    }
};
