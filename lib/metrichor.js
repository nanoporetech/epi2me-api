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
var request, jqWrap, AWS, queue, fs, path;

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
    fs      = require("fs");
    queue   = require("queue-async");
    path    = require("path");

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
//    this._watchQueue         = opts.watchQueue;
    this._watchFolder        = opts.watchFolder;
    this._idWorkflowInstance = opts.id_workflow_instance;
    this.bucket              = opts.bucket;
    this.bucketFolder        = opts.bucketFolder;
    this.inputQueueName      = opts.inputQueueName;
    this.outputQueueName     = opts.outputQueueName;
    this.remote_addr         = opts.remote_addr;
    this.chain               = opts.chain;
    this.log                 = function (str) { console.log("[" + (new Date()).toISOString() + "] " + str); };
    this.transferPoolSize    = 10;
    this._queueLengthTimeStamps = {};
    this.awssettings         = {
        region: opts.region || "eu-west-1"
    };
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

            that._fsWatcher = fs.watch(that._watchFolder, function (event, filename) {
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
                if (len) {
                    that.log("download available");
                    eventHandler();
                }
                return;
            };

            timedChecker = function () {
                that.log("begin timed function");

                that.sessionedSQS(function (sqs) {
                    if (that.outputQueueURL) {
                        return that.queueLength(that.outputQueueURL, workChecker);
                    }

                    that.discoverQueue(sqs, that.outputQueueName,
                        function (queueURL) {
                            that.log("discovered queue" + queueURL);
                            that.outputQueueURL = queueURL;
                            return that.queueLength(that.outputQueueURL, workChecker);
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
            that.log("INTERVAL: " + that._downloadQueueInterval);
            return;
        }

        throw new Error("unsupported event: " + eventName);
    },

    stop_everything: function (cb) {
        var that = this;

        that.log("stopping watchers" + that);

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

    autoConfigure: function () {
        var i, blocker,
            that = this;

        if (!that._watchFolder) {
            throw new Error("must set watchFolder");
        }

        if (!that.bucketFolder) {
            throw new Error("bucketFolder must be set");
        }

        /* configure the upload queue, but start slowly (artificially occupied slots for a few seconds) */
        that.uploadWorkerPool = queue(that.transferPoolSize + 1);
        that.uploadWorkerPool.defer(function () { that.log("opening queue"); }); // first slot never allows that.uploadWorkerPool to complete

        blocker = function () {
            that.uploadWorkerPool.defer(function (cb) { global.setTimeout(function () { that.log("unblocking slot"); cb(); }, 5000); });
        };

        for (i = 1; i < that.transferPoolSize; i += 1) {
            that.log("blocking slot " + i);
            blocker();
        }

        /* fs.watch event handler */
        that.on("folderChange", function (event, item) {
            if (item.match(/fast5$/)) {
                // file might be newly created / touched / deleted / moved
                that.log("fs.watch", event, item);
                that.enqueueUploadJob(item);
            }
        });

        /* initial folder-scan for existing files which won't trigger the fs.watch event. only run once. */
        fs.readdir(that._watchFolder, function (readdirErr, files) {
            if (readdirErr) {
                that.log("error reading folder " + String(readdirErr));
            }

            files.forEach(function (item) {
                if (item.match(/fast5$/)) {
                    that.enqueueUploadJob(item);
                }
            });
        });

        /* sqs event handler */
        that.on("downloadAvailable", function (obj) {
            that.log("download available " + obj);
        });
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
                fileId   = path.join(that._watchFolder, item),
                objectId = that.bucketFolder + "/" + (that.inputQueueName ? that.inputQueueName + "/" : "") + item;

            try {
                rs = fs.createReadStream(fileId);

            } catch (readStreamException) {
                that.log("failed to createReadStream", String(readStreamException));
                return successCb("readstream exception"); // close the queue job
            }

            rs.on("error", function (readStreamError) {
                if (!String(readStreamError).match(/ENOENT/)) {
                    that.log("error in readstream: " + readStreamError);
                }
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
                            that.log("uploadStreamError", String(uploadStreamErr));
                            that.log("requeuing " + item);
                            that.enqueueUploadJob(item);
                            return successCb("upload error"); // close the queue job
                        }

                        that.uploadComplete(objectId, item, successCb);
                    });

                } catch (uploadStreamException) {
                    that.log("failed to upload:", String(uploadStreamException));
                    that.log("requeuing " + item);
                    that.enqueueUploadJob(item);

                    return successCb("upload exception"); // close the queue job
                }
            });
        });
    },

    discoverQueue: function (sqs, queueName, successCb, failureCb) {
        var that = this;

        that.log("discovering queue");

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

        message.components        = JSON.parse(JSON.stringify(that.chain.components)); // low-frills object clone
        message.targetComponentId = that.chain.targetComponentId; // first component to run

        // optionally populate input + output queues
        Object.keys(message.components).forEach(function (o) {
            if (message.components[o].inputQueueName === 'uploadMessageQueue') {
                message.components[o].inputQueueName = that.uploadMessageQueue;
            }

            if (message.components[o].inputQueueName === 'downloadMessageQueue') {
                message.components[o].inputQueueName = that.downloadMessageQueue;
            }
        });

        try {
            sqs.sendMessage({
                QueueUrl:    that.inputQueueURL,
                MessageBody: JSON.stringify(message)

            }, function (sendMessageError) {
                var fileFrom = path.join(that._watchFolder, item),
                    folderTo = path.join(that._watchFolder, "uploaded"),
                    fileTo   = path.join(folderTo, item);

                if (sendMessageError) {
                    that.log("error sending message " + String(sendMessageError));
                    that.log("requeuing " + item);
                    that.enqueueUploadJob(item);

                    return successCb("sendmessage error"); // close the queue job
                }

                that.log("message sent " + JSON.stringify(message));
                fs.mkdir(folderTo, function (mkdirException) {
                    if (mkdirException && !String(mkdirException).match(/EEXIST/)) {
                        that.log("mkdirException", String(mkdirException));
                    }

                    fs.rename(fileFrom, fileTo, function (renameException) {
                        if (renameException) {
                            that.log("renameException", String(renameException));
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

    queueLength: function (queueURL, cb) {
        var that = this,
            now = new Date();

        if (queueURL &&
                (!that._queueLengthTimeStamps[queueURL] ||
                that._queueLengthTimeStamps[queueURL] < now)) {

            that._queueLengthTimeStamps[queueURL] = now;
            that._queueLengthTimeStamps[queueURL].setMinutes(that._queueLengthTimeStamps[queueURL].getMinutes() + 1);
        } else {
            return;
        }

        that.log("querying queue length of " + queueURL);

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
                        cb(attrs.Attributes.ApproximateNumberOfMessages);
                    }
                });
            } catch (getQueueAttrException) {
                that.log("error in getQueueAttributes " + String(getQueueAttrException));
            }
        });
    }
};
