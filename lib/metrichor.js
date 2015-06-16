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
    request     = require("request");
    AWS            = require("aws-sdk");
    fs             = require("fs");
    queue          = require("queue-async");
    path           = require("path");

    module.exports = metrichor;
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
    this.queueName           = opts.queueName;
    this.chain               = opts.chain;
    this.log                 = console.log;
    this.transferPoolSize    = 10;
    this.awssettings         = {
        region: opts.region || "eu-west-1"
    };

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

    on: function (eventName, eventHandler) {
        var that = this;

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
/*
        if (eventName === "watchQueue") {
            if (that.queueTimer) {
                // arbitrary limit: only one queue-timer at a time
                global.clearTimeout(that.queueTimer);
            }

            that.queueTimer = global.setTimeout(function () {

                // if !session set up session
                // if !queueurl set up queueurl
                // if message run handler
                if (
                AWS.config.update(that.awssettings); // todo: adjust for proxy
            var sqs = new AWS.SQS();
            that.token(null, function (tokenError, token) {
                if (tokenError) {
                    console.log(
                AWS.config.update(token);
            });
        }
*/
    },

    session: function (cb) {
        var that = this;

        if (!that.sts_expiration ||
                that.sts_expiration < new Date()) {

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
                that.sts_expiration = new Date(token.expiration); // Date object for expiration check later
                that.sts_expiration.setMinutes(that.sts_expiration.getMinutes() - 2); // refresh token before it expires
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

        that.queue = queue(that.transferPoolSize + 1);
        that.queue.defer(function () { that.log("opening queue"); }); // first slot never allows that.queue to complete

        blocker = function () {
            that.queue.defer(function (cb) { global.setTimeout(function () { that.log("unblocking slot"); cb(); }, 5000); });
        };

        for (i = 1; i < that.transferPoolSize; i += 1) {
            that.log("blocking slot " + i);
            blocker();
        }

        that.on("folderChange", function (event, item) {
            if (item.match(/fast5$/)) {
                // file might be newly created / touched / deleted / moved
                that.log("fs.watch", event, item);
                that.enqueueUploadJob(item);
            }
        });

        /* only run the folder scan once */
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
    },

    enqueueUploadJob: function (item) {
        var that = this;

        that.queue.defer(function (completeCb) {
            that.uploadHandler(item, completeCb);
        });
    },

    uploadHandler: function (item, completeCb) {
        var that = this;

        that.sessionedS3(function (s3) {
            var rs,
                fileId   = path.join(that._watchFolder, item),
                objectId = that.bucketFolder + "/" + (that.queueName ? that.queueName + "/" : "") + item;

            try {
                rs = fs.createReadStream(fileId);

            } catch (readStreamException) {
                that.log("failed to createReadStream", String(readStreamException));
                return completeCb(); // close the queue job
            }

            rs.on("error", function (readStreamError) {
                if (!String(readStreamError).match(/ENOENT/)) {
                    that.log("error in readstream: " + readStreamError);
                }
                return completeCb(); // close the queue job
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
                            return completeCb(); // close the queue job
                        }

                        that.uploadComplete(objectId, item, completeCb);
                    });

                } catch (uploadStreamException) {
                    that.log("failed to upload:", String(uploadStreamException));
                    that.log("requeuing " + item);
                    that.enqueueUploadJob(item);

                    return completeCb(); // close the queue job
                }
            });
        });
    },

    uploadComplete: function (objectId, item, completeCb) {
        var that = this;
        that.log("uploaded " + item + " to " + objectId);

        /* initialise SQS on autoConfigure or after first upload ? */
        that.sessionedSQS(function (sqs) {
            if (that.queueURL) {
                return that.sendMessage(sqs, objectId, item, completeCb);
            }

            that.log("discovering queue");
            try {
                sqs.getQueueUrl({ QueueName: that.queueName }, function (getQueueErr, getQueue) {
                    if (getQueueErr) {
                        if (that.proxy && (String(getQueueErr)).match(/Unexpected close tag/)) {
                            that.log("error in getQueueUrl. Could be an aws-sdk/SSL/proxy compatibility issue");
                            that.log("requeuing " + item);
                            that.enqueueUploadJob(item);

                            return completeCb();
                        }

                        throw new Error("uploader: could not getQueueUrl: " + getQueueErr);
                    }

                    that.queueURL = getQueue.QueueUrl;
                    that.log("found queue " + that.queueURL);

                    return that.sendMessage(sqs, objectId, item, completeCb);
                });

            } catch (getQueueException) {
                that.log("exception in getQueueUrl: " + String(getQueueException));
                that.log("requeuing " + item);

                that.enqueueUploadJob(item);
                return completeCb();
            }
        });
    },

    sendMessage: function (sqs, objectId, item, completeCb) {
        var that    = this,
            message = {
                bucket:               that.bucket,
                outputQueue:          that.queueName,
//                remote_addr:          that.remote_addr,
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
                QueueUrl:    that.queueURL,
                MessageBody: JSON.stringify(message)

            }, function (sendMessageError) {
                var fileFrom = path.join(that._watchFolder, item),
                    folderTo = path.join(that._watchFolder, "uploaded"),
                    fileTo   = path.join(folderTo, item);

                if (sendMessageError) {
                    that.log("error sending message " + String(sendMessageError));
                    that.log("requeuing " + item);
                    that.enqueueUploadJob(item);

                    return completeCb(); // close the queue job
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
                        return completeCb(); // close the queue job
                    });
                });
            });

        } catch (sendMessageException) {
            that.log("exception sending message " + String(sendMessageException));
            that.log("requeuing " + item);
            that.enqueueUploadJob(item);

            return completeCb(); // close the queue job
        }
    }
};
