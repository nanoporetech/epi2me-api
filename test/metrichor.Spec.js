"use strict";
var proxyquire     = require('proxyquire');
var assert         = require("assert");
var sinon          = require("sinon");
var path           = require("path");
var _              = require("lodash");
var tmp            = require('tmp');
var queue          = require('queue-async');
var fs             = require('fs');
var requestProxy   = {};
var fsProxy        = {};
var mkdirpProxy    = {};
var awsProxy       = {};
proxyquire('../lib/utils', {
    'request' : requestProxy
});
var EPI2ME;

describe('Array', () => {

    beforeEach(() => {
        EPI2ME = proxyquire('../lib/metrichor.js', {
            'aws-sdk'     : awsProxy,
            'graceful-fs' : fsProxy,
            'mkdirp'      : mkdirpProxy
        });
    });

    describe('metrichor constructor', () => {
        it('should create a metrichor object with defaults and allow overwriting', () => {
            var client;
            assert.doesNotThrow(() => {
		client = new EPI2ME();
            }, Error, 'client obtained');

            assert.equal(client.url(), 'https://epi2me.nanoporetech.com', 'default url');
            assert.equal(client.apikey(), null, 'default apikey');
        });

        it('should create a metrichor object using the parsed options string', () => {
	    var client;
            assert.doesNotThrow(() => {
                client = new EPI2ME(JSON.stringify({
                    url: "test_url"
                }));
            }, Error, 'client obtained');
            assert.equal(client.url(), 'test_url', 'custom url');
        });

        it('should create a metrichor object with log functions', () => {
            var client,
                customLogging = {
                    debug: () => {},
                    info:  () => {},
                    warn:  () => {},
                    error: () => {}
                };

            // Default
            assert.doesNotThrow(() => {
                client = new EPI2ME();
            }, Error, 'client obtained');

            // Custom logging

            assert.doesNotThrow(() => {
                client = new EPI2ME({
                    log: customLogging
                });
                delete requestProxy.get;
            }, Error, 'client obtained');
            assert.deepEqual(client.log, customLogging, 'custom logging');

            // Validating custom logging
            assert.throws(() => {
                client = new EPI2ME({
                    log: {}
                });
            }, Error, 'expected log object to have "error", "info" and "warn" methods');
        });

        it('should get and overwrite config properties', () => {
            var client;
            assert.doesNotThrow(() => {
                client = new EPI2ME({
                    url: 'initial'
                });
                delete requestProxy.get;
            }, Error, 'client obtained');

            assert.equal(client.attr('url'), 'initial');
            client.attr('url', 'test');
            assert.equal(client.attr('url'), 'test');
            assert.throws(() => {
                client.attr('not_a_key', 'value')
            }, Error, 'config object does not contain property not_a_key');
        });

        it('should create a metrichor with opts', () => {
            var client;
            assert.doesNotThrow(() => {
                client = new EPI2ME({
                    url: 'https://metrichor.local:8000',
                    apikey: 'FooBar02'
                });
                delete requestProxy.get;
            }, Error, 'client obtained');
            assert.equal(client.url(), 'https://metrichor.local:8000', 'url built from constructor');
            assert.equal(client.apikey(), 'FooBar02', 'apikey built from constructor');
        });
    });

    describe('metrichor api', function(){
        describe('.autoConfigure method', () => {

            var conf = {
                inputFolder: "in",
                outputFolder: "out"
            };

            function newApi(error, instance) {
                var client = new EPI2ME(conf);

                client.uploadWorkerPool = {
                    defer: () => {}
                };

                client._stats = {
                    upload:   {
                        success: 0,
                        failure: {},
                        queueLength: 0
                    },
                    download: {
                        success: 0,
                        fail: 0,
                        failure: {},
                        queueLength: 0
                    }
                };

                sinon.stub(client.log, "warn");
                sinon.stub(client.log, "info");
                sinon.stub(client.log, "error");
                sinon.stub(client, "enqueueUploadJob");
                sinon.stub(fsProxy, 'watch');
                return client;
            }
        });

        describe('.autoStart method', () => {

            function newApi(error, instance) {

                var client = new EPI2ME();
                client.start_workflow = function (id, cb) {
                    cb(error, instance);
                };

                client.autoConfigure = function (id, cb) {
                    cb();
                };

                sinon.stub(client.log, "warn");
                sinon.spy(client, "autoConfigure");
                sinon.spy(client,  "start_workflow");
                return client;
            }

            it('should initiate a new workflow instance', () => {
                var client = newApi(null, {
                    id_workflow_instance: 10,
                    id_user: "user",
                    outputqueue: "queue"
                });

                client.autoStart(111, () => {
                    assert(client.start_workflow.calledOnce);
                    assert(client.autoConfigure.calledOnce);

                    var args = client.autoConfigure.args[0][0];
                    assert.equal(args.id_workflow_instance, 10);
                    assert.equal(args.id_user, 'user');
                    assert.equal(args.outputqueue, 'queue');
                });
            });

            it('should handle start_workflow errors', () => {
                var client = newApi({
                        error: "Message"
                    },
                    {
                        state: "stopped"
                    });

                client.autoStart(111, () => {
                    assert(client.start_workflow.calledOnce);
                    assert(client.log.warn.calledOnce);
                    assert(client.log.warn.calledWith("Failed to start workflow: Message"));
                    assert(client.autoConfigure.notCalled);
                });
            });
        });

        describe('.autoJoin method', () => {

            function newApi(error, instance) {

                var client = new EPI2ME();

                client.workflow_instance = function (id, cb) {
                    cb(error, instance);
                };

                client.autoConfigure = function (id, cb) {
                    cb();
                };

                sinon.stub(client.log, "warn");
                sinon.spy(client, "autoConfigure");
                sinon.spy(client,  "workflow_instance");
                return client;
            }

            it('should join an existing workflow instance', () => {
                var client = newApi(null, {
                    id_workflow_instance: 10,
                    id_user: "user",
                    outputqueue: "queue"
                });

                client.autoJoin(111, () => {
                    assert(client.workflow_instance.calledOnce);
                    assert(client.autoConfigure.calledOnce);

                    var args = client.autoConfigure.args[0][0];
                    assert.equal(args.id_workflow_instance, 10);
                    assert.equal(args.id_user, 'user');
                    assert.equal(args.outputqueue, 'queue');
                });
            });

            it('should handle workflow_instance errors', () => {
                var client = newApi({
                        error: "Message"
                    },
                    {
                        state: "stopped"
                    });

                client.autoJoin(111, () => {
                    assert(client.workflow_instance.calledOnce);
                    assert(client.log.warn.calledOnce);
                    assert(client.log.warn.calledWith("Failed to join workflow instance: Message"));
                    assert(client.autoConfigure.notCalled);
                });
            });

            it('should not join an instance where state === stopped', () => {
                var client = newApi(
                    {
                        state: "stopped"
                    });

                client.autoJoin(111, () => {
                    assert(client.workflow_instance.calledOnce);
                    assert(client.autoConfigure.notCalled);
                    //assert(client.log.warn.calledWith("workflow 111 is already stopped"));
                });
            });
        });
        /*
         describe('.loadUploadFiles method', () => {

         var client,
         conf = {
         inputFolder: "in",
         outputFolder: "out",
         inputFormat: '.fileExt',
         uploadQueueLimit: 2,
         uploadQueueThreshold: 1
         };

         function stub() {
         sinon.stub(client, 'enqueueUploadJob');
         sinon.stub(client.log, 'warn');
         sinon.stub(client.log, 'error');
         sinon.stub(client.log, 'info');
         client._fileStash = [];
         client._uploadedFiles = [];
         }

         afterEach(() => {
         delete fsProxy.readdir;
         });

         it('should ignore files with the wrong extension', () => {
         fsProxy.readdir = function (dir, cb) {
         cb(null, ['blabab/defe/fef.fileExt', 'f2.fileExt tmp', 'f2.fileExt.tmp']);
         };
         client = new EPI2ME(conf);
         stub();
         client.loadUploadFiles();
         //assert(!client._inputFiles.length);
         //assert(client.enqueueUploadJob.calledOnce);
         });

         it('should handle readdir errors', () => {
         fsProxy.readdir = function (dir, cb) {
         cb("ERROR");
         };
         client = new EPI2ME(conf);
         stub();
         client.loadUploadFiles();
         assert(client.log.error.calledOnce);
         //assert(!client._inputFiles.length);
         });
         });
         */

        describe('.receiveMessages method', () => {
            // MC-2068 - Load messages once all jobs are done
            var client;

            beforeEach(() => {
                client = new EPI2ME({});
                client.processMessage = function (msg, queueCb) {
                    setTimeout(queueCb, 1);
                };
                client.downloadWorkerPool = queue(10);
                sinon.stub(client.log, "warn");
                sinon.stub(client.log, "info");
            });

            it('should handle error and log warning', () => {
                client.receiveMessages('Error Message');
                assert(client.log.warn.calledOnce);
            });

            it('should ignore empty message', () => {
                client.receiveMessages(null, {});
                assert(client.log.info.calledWith("complete (empty)"));
            });

            it('should queue and process download messages using downloadWorkerPool', function (done) {
                client.receiveMessages(null, { Messages: [1, 2, 3, 4] }, () => {
                    assert.equal(client.downloadWorkerPool.remaining(), 4);
                });
                client.downloadWorkerPool.await(() => {
                    assert.equal(client.downloadWorkerPool.remaining(), 0);
                    done();
                });
            });
        });

        describe('.loadAvailableDownloadMessages method', () => {
            // MC-2068 - Load messages once all jobs are done
            var client,
                parallelism = 10,
                queueLength = 50,
                messages;

            beforeEach(() => {
		console.log("BEFORE");
                messages = Array.apply(null, Array(queueLength)).map(Number.prototype.valueOf, 0);
                client = new EPI2ME({});
                client.queueLength = function (url, cb) {
                    cb(messages.length);
                };
                client.sessionedSQS = function (cb) {
                    return {
                        receiveMessage: function (opts, cb) {
                            cb(null, {
                                Messages: messages.splice(0, parallelism) // fetch 10 messages each time
                            });
                        }
                    };
                };
                client.downloadWorkerPool = queue(parallelism);
                sinon.stub(client.log, "warn");
                sinon.stub(client.log, "info");
                sinon.spy(client, "processMessage");
            });

            it('should process all messages', function (done) {
                client.discoverQueue = function (qs, queueName, successCb, failureCb) {
                    successCb("queueUrl");
                };
                client.processMessage = function (msg, queueCb) {
                    setTimeout(queueCb);
                };
                sinon.spy(client, "processMessage");
                client.downloadWorkerPool
                    .await(() => {
                        client.loadAvailableDownloadMessages();
                        if (client.downloadWorkerPool.remaining() === 0) {
                            assert.equal(messages.length, 0);
                            assert.equal(client.processMessage.callCount, queueLength);
                            done();
                        }
                    });
            });

            it('should handle discoverQueue errors', function (done) {
                client.discoverQueue = function (qs, queueName, successCb, failureCb) {
                    failureCb("ErrorType");
                };
                client.downloadWorkerPool.await(() => {
                    client.loadAvailableDownloadMessages();
                    if (client.downloadWorkerPool.remaining() === 0) done();
                });
            });
        });

        describe('.queueLength method', () => {
            var client, queueUrl = 'queueUrl';
            beforeEach(() => {
                client = new EPI2ME({});
                sinon.stub(client.log, "warn");
                sinon.stub(client.log, "error");
                sinon.stub(client.log, "info");
            });

            it('should return sqs queue', function (done) {
                client.sessionedSQS = function (cb) {
                    return {
                        getQueueAttributes: function (opts, cb) {
                            assert.equal(opts.QueueUrl, queueUrl);
                            cb(null, { Attributes: { ApproximateNumberOfMessages: 10 } });
                            assert(completeCb.calledOnce);
                            assert.equal(completeCb.lastCall.args[0], 10);
                            cb("Error");
                            assert(client.log.warn.calledOnce);
                            assert(completeCb.calledTwice);
                            done();
                        }
                    };
                };
                var completeCb = sinon.spy();
                client.queueLength(queueUrl, completeCb);
            });

            it('should handle sessionedSQS errors', () => {
                client.sessionedSQS = () => {
                    return {
                        getQueueAttributes: function (opts, cb) {
                            throw Error;
                        }
                    };
                };
                var completeCb = sinon.spy();
                client.queueLength(queueUrl, completeCb);
                // assert(completeCb.calledTwice, 'call callback even for errors');
                assert.equal(completeCb.firstCall.args[0], undefined);
                // assert.equal(completeCb.secondCall.args[0], undefined);
                assert(client.log.error.calledOnce);
                assert.doesNotThrow(() => {
                    client.queueLength(queueUrl);
                    client.queueLength();
                }, 'Error');
            });
        });

        describe('.discoverQueue method', () => {
            var client, queueUrl = 'queueUrl';
            beforeEach(() => {
                client = new EPI2ME({});
                sinon.stub(client.log, "warn");
                sinon.stub(client.log, "error");
                sinon.stub(client.log, "info");
            });

            /*it('should return sqs queue', () => {
             var sqs = {
             getQueueUrl: function (opts, cb) {
             cb("Error");
             assert(client.log.warn.calledOnce);
             cb(null, { QueueUrl: "result" });
             assert(client.log.warn.calledOnce);
             throw Error
             }
             };
             var successCb = sinon.spy();
             var faliureCb = sinon.spy();
             client.discoverQueue(sqs, 'queueName', successCb, faliureCb);
             assert.equal(successCb.firstCall.args[0], "result");
             assert.equal(faliureCb.firstCall.args[0], "getqueueurl error");
             assert.equal(faliureCb.lastCall.args[0], "getqueueurl exception");
             client.discoverQueue(sqs, 'queueName', successCb, faliureCb);
             });*/

            it('should handle sessionedSQS errors', () => {
                sinon.stub(client, "sessionedSQS");
                var completeCb = sinon.spy();
                client.queueLength(queueUrl, completeCb);
                //assert(completeCb.calledTwice, 'call callback even for errors');
                assert.equal(completeCb.firstCall.args[0], undefined);
                //assert.equal(completeCb.secondCall.args[0], undefined);
                assert(client.log.error.calledOnce);
                assert.doesNotThrow(() => {
                    client.queueLength(queueUrl);
                    client.queueLength();
                }, 'Error');
            });
        });

        describe('.sendMessage method', () => {

            var client;

            beforeEach(() => {
                fsProxy.rename = () => {};
                mkdirpProxy = () => {};

                client = new EPI2ME({
                    inputFolder: 'path'
                });
                client.workflow_instance = function (id, cb) {
                    cb(error, instance);
                };

                client.autoConfigure = function (id, cb) {
                    cb();
                };

                sinon.stub(client.log, "warn");
                sinon.stub(client.log, "info");
            });

            afterEach(() => {
                // Cleanup
                delete fsProxy.rename;
                delete awsProxy.SQS;
                mkdirpProxy = {};
            });

            it('sqs callback should handle error and log warning', () => {
                var item     = 'filename.fast5',
                    objectId = 'PREFIX/'+item,
                    sqsMock  = {
			sendMessage: () => {
			    let cb = args[1];
			    cb("Error message");
			    assert(client.log.warn.calledOnce);
			}
                    };

                client.sendMessage(sqsMock, objectId, item, () => {});
            });

            it('sqs callback should move file to the ./uploaded folder', () => {
                var item     = 'filename.fast5',
                    objectId = 'PREFIX/'+item,
                    sqsMock  = {
			sendMessage: () => {}
                    };

                client.sendMessage(sqsMock, objectId, item, () => {});

//                cb = args[1];
                // cb();
                //assert(client.enqueueUploadJob.calledOnce);
                //assert(client.enqueueUploadJob.calledWith(item));
            });

        });

        describe('.uploadComplete method', () => {
            var client;

            beforeEach(() => {
                client = new EPI2ME();
                sinon.stub(client, "sessionedSQS");
                sinon.stub(client.log, "warn");
                sinon.stub(client.log, "info");
                sinon.stub(client, "sendMessage");
                sinon.stub(client, "discoverQueue");
            });

            it('should handle error', () => {
                var errorCallback;
                client.discoverQueue = function (sqs, queueName, cb, errorCb) {
                    cb();
                    errorCb();
                };
                client.uploadComplete(null, 'item', () => {});
            });
        });

        describe('.processMessage method', () => {
            var client;

            beforeEach(() => {
                client = new EPI2ME({downloadMode: "telemetry"});
                client.sessionedSQS = function (cb) { cb(); };
                sinon.stub(client.log, "info");
                sinon.stub(client.log, "warn");
                sinon.stub(client.log, "error");
                sinon.stub(client, "deleteMessage");
                fsProxy.createWriteStream = () => {};
                mkdirpProxy.sync = () => {};
                sinon.spy(fsProxy, 'createWriteStream');
                client.sessionedS3 = () => {};
                sinon.spy(client, 'sessionedS3');
            });

            afterEach(() => {
                delete fsProxy.createWriteStream;
                delete mkdirpProxy.sync;
            });

            it('should handle bad message json', function (done) {
                var msg = { Body: '{message: body}' };
                client.processMessage(msg, () => {
                    assert(client.deleteMessage.calledWith(msg));
                    assert(client.log.error.calledOnce);
                    done();
                });
            });

            it('should parse message json', () => {
                client.sessionedS3 = function (cb) {
                    cb('error message');
                };
                sinon.spy(client, 'sessionedS3');

                client.processMessage({
                    Body: '{"message": "body"}'
                }, () => {});
                assert(client.log.warn.calledOnce); // No path
            });
        });

        it('should list workflows', () => {
            var req,
                client = new EPI2ME({
                    "url"    : "http://metrichor.local:8080",
                    "apikey" : "FooBar02"
                });

            requestProxy.get = function(req, cb) {
		assert.deepEqual(req, {
		    uri: "http://metrichor.local:8080/workflow.js",
		    headers: {
			'X-EPI2ME-ApiKey':  'FooBar02',
			'X-EPI2ME-Client':  'Metrichor API',
			'X-EPI2ME-Version': '0'
		    }});
                cb(null, null, JSON.stringify({"workflows":[{"description":"a workflow"}]}));
                delete requestProxy.get;
            };

            assert.doesNotThrow(() => {
                client.workflows(function(e, o) {
		    assert.equal(e,     null, 'no error reported');
		    assert.deepEqual(o, [{"description":"a workflow"}], 'workflow list');
                });
            });
        });

        it('should include useful request headers', () => {
            var obj1, obj2, err, client = new EPI2ME({
                "url"           : "http://metrichor.local:8080",
                "apikey"        : "FooBar02",
                "agent_version" : "0.18.12345",
            });

            requestProxy.get = function(o, cb) {
                obj1 = o;
                cb(null, null, '{}');
                delete requestProxy.get;
            };

            assert.doesNotThrow(() => {
                client.workflows(function(e, o) {
                    err  = e;
                    obj2 = o;
                });
                delete requestProxy.get;
            });

            assert.deepEqual(obj1.headers['X-EPI2ME-Version'], '0.18.12345',    'version header sent');
            assert.deepEqual(obj1.headers['X-EPI2ME-Client'],  'Metrichor API', 'useragent header sent');
            assert.equal(err, null, 'no error reported');
        });

        it('should update a workflow', () => {
            var client = new EPI2ME({
                "url"    : "http://metrichor.local:8080",
                "apikey" : "FooBar02"
            });

            requestProxy.post = function(obj, cb) {
                assert.equal(obj.uri,    "http://metrichor.local:8080/workflow/test.js");
                assert.equal(obj.headers['X-EPI2ME-ApiKey'], "FooBar02");
                assert.deepEqual(JSON.parse(obj.form.json), {"description":"test workflow", "rev":"1.1"});
                cb(null, null, '{"description":"a workflow","rev":"1.0"}');
                delete requestProxy.post;
            };

            client.workflow('test', {"description":"test workflow", "rev":"1.1"}, function(err, obj) {
                assert.equal(err, null, 'no error reported');
                assert.deepEqual(obj, {"description":"a workflow","rev":"1.0"}, 'workflow read');
            });
        });

        it('should start a workflow_instance', () => {
            var client = new EPI2ME({
                "url"    : "http://metrichor.local:8080",
                "apikey" : "FooBar02"
            });

            requestProxy.post = function(obj, cb) {
                assert.equal(obj.uri,    "http://metrichor.local:8080/workflow_instance.js");
                assert.equal(obj.headers['X-EPI2ME-ApiKey'], "FooBar02");
                assert.equal(JSON.parse(obj.form.json).id_workflow, "test");
                cb(null, null, '{"id_workflow_instance":"1","id_user":"1"}');
                delete requestProxy.post;
            };

            client.start_workflow({id_workflow: 'test'}, function(err, obj) {
                assert.equal(err, null, 'no error reported');
                assert.deepEqual(obj, {"id_workflow_instance":"1","id_user":"1"}, 'workflow_instance start response');
            });
        });

        it('should stop a workflow_instance', () => {
            var client = new EPI2ME({
                "url"    : "http://metrichor.local:8080",
                "apikey" : "FooBar02"
            });

            requestProxy.put = function(obj, cb) {
                assert.equal(obj.uri,    "http://metrichor.local:8080/workflow_instance/stop/test.js");
                assert.equal(obj.headers['X-EPI2ME-ApiKey'], "FooBar02");
                cb(null, null, '{"id_workflow_instance":"1","id_user":"1","stop_requested_date":"2013-09-03 15:17:00"}');
                delete requestProxy.get;
            };

            client.stop_workflow('test', function(err, obj) {
                assert.equal(err, null, 'no error reported');
                assert.deepEqual(obj, {"id_workflow_instance":"1","id_user":"1","stop_requested_date":"2013-09-03 15:17:00"}, 'workflow_instance stop response');
            });
        });

        it('should list workflow_instances', () => {
            var client = new EPI2ME({
                "url"    : "http://metrichor.local:8080",
                "apikey" : "FooBar02"
            });

            requestProxy.get = function(obj, cb) {
                assert.equal(obj.uri, "http://metrichor.local:8080/workflow_instance.js");
                assert.equal(obj.headers['X-EPI2ME-ApiKey'], "FooBar02");
                cb(null, null, '{"workflow_instances":[{"id_workflow_instance":"149","state":"running","workflow_filename":"DNA_Sequencing.js","start_requested_date":"2013-09-16 09:25:15","stop_requested_date":"2013-09-16 09:26:04","start_date":"2013-09-16 09:25:17","stop_date":"2013-09-16 09:26:11","control_url":"127.0.0.1:8001","data_url":"localhost:3006"}]}');
            };

            client.workflow_instances(function(err, obj) {
                assert.equal(err, null, 'no error reported');
                assert.deepEqual(obj, [{"id_workflow_instance":"149","state":"running","workflow_filename":"DNA_Sequencing.js","start_requested_date":"2013-09-16 09:25:15","stop_requested_date":"2013-09-16 09:26:04","start_date":"2013-09-16 09:25:17","stop_date":"2013-09-16 09:26:11","control_url":"127.0.0.1:8001","data_url":"localhost:3006"}], 'workflow instance list');
            });
        });

        it('should read a workflow_instance', () => {
            var client = new EPI2ME({
                "url"    : "http://metrichor.local:8080",
                "apikey" : "FooBar02"
            });

            requestProxy.get = function(obj, cb) {
                assert.equal(obj.uri, "http://metrichor.local:8080/workflow_instance/149.js");
                assert.equal(obj.headers['X-EPI2ME-ApiKey'], "FooBar02");
                cb(null, null, '{"id_workflow_instance":"149","state":"running","workflow_filename":"DNA_Sequencing.js","start_requested_date":"2013-09-16 09:25:15","stop_requested_date":"2013-09-16 09:26:04","start_date":"2013-09-16 09:25:17","stop_date":"2013-09-16 09:26:11","control_url":"127.0.0.1:8001","data_url":"localhost:3006"}');
                delete requestProxy.get;
            };

            client.workflow_instance(149, function(err, obj) {
                assert.equal(err, null, 'no error reported');
                assert.deepEqual(obj, {"id_workflow_instance":"149","state":"running","workflow_filename":"DNA_Sequencing.js","start_requested_date":"2013-09-16 09:25:15","stop_requested_date":"2013-09-16 09:26:04","start_date":"2013-09-16 09:25:17","stop_date":"2013-09-16 09:26:11","control_url":"127.0.0.1:8001","data_url":"localhost:3006"}, 'workflow read');
            });
        });

        it('should read a workflow', () => {
            var client = new EPI2ME({
                "url"    : "http://metrichor.local:8080",
                "apikey" : "FooBar02"
            });

            requestProxy.get = function(obj, cb) {
                assert.equal(obj.uri, 'http://metrichor.local:8080/workflow/test.js');
                assert.equal(obj.headers['X-EPI2ME-ApiKey'], 'FooBar02');
                cb(null, null, '{"description":"a workflow","rev":"1.0"}');
                delete requestProxy.get;
            };

            assert.doesNotThrow(() => {
                client.workflow('test', function(e, o) {
		    assert.equal(e,      null, 'no error reported');
		    assert.deepEqual(o, {"description":"a workflow","rev":"1.0"}, 'workflow read');
                });
            });
        });
    });
});
