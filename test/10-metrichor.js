var proxyquire     = require('proxyquire');
var assert         = require("assert");
var sinon          = require("sinon");
var path           = require("path");
var tmp            = require('tmp');
var fs             = require('fs');
var requestProxy   = {};
var fsProxy        = {};
var mkdirpProxy    = {};
var awsProxy       = {};
var Metrichor      = proxyquire('../lib/metrichor', {
    'aws-sdk'   : awsProxy,
    'request'   : requestProxy,
    'graceful-fs' : fsProxy,
    'mkdirp'    : mkdirpProxy
});

describe('Array', function(){
    describe('metrichor constructor', function () {
        it('should create a metrichor object with defaults and allow overwriting', function () {
            var client;
            assert.doesNotThrow(function () {
                client = new Metrichor();
            }, Error, 'client obtained');

            assert.equal(client.url(), 'https://metrichor.com', 'default url');
            assert.equal(client.apikey(), null, 'default apikey');
        });

        it('should create a metrichor object using the parsed options string', function () {
            assert.doesNotThrow(function () {
                client = new Metrichor(JSON.stringify({
                    url: "test_url"
                }));
            }, Error, 'client obtained');
            assert.equal(client.url(), 'test_url', 'custom url');
        });

        it('should create a metrichor object with log functions', function () {
            var client,
                customLogging = {
                    info: function () {},
                    warn: function () {},
                    error: function () {}
                };

            // Default
            assert.doesNotThrow(function () {
                client = new Metrichor();
            }, Error, 'client obtained');

            // Custom logging

            assert.doesNotThrow(function () {
                client = new Metrichor({
                    log: customLogging
                });
                delete requestProxy.get;
            }, Error, 'client obtained');
            assert.deepEqual(client.log, customLogging, 'custom logging');

            // Validating custom logging
            assert.throws(function () {
                client = new Metrichor({
                    log: {}
                });
            }, Error, 'expected log object to have "error", "info" and "warn" methods');
        });

        it('should get and overwrite config properties', function () {
            var client;
            assert.doesNotThrow(function () {
                client = new Metrichor({
                    url: 'initial'
                });
                delete requestProxy.get;
            }, Error, 'client obtained');

            assert.equal(client.attr('url'), 'initial');
            client.attr('url', 'test');
            assert.equal(client.attr('url'), 'test');
            assert.throws(function () {
                client.attr('not_a_key', 'value')
            }, Error, 'config object does not contain property not_a_key');
        });

        it('should create a metrichor with opts', function () {
            var client;
            assert.doesNotThrow(function () {
                client = new Metrichor({
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
        describe('.autoConfigure method', function () {

            var conf = {
                inputFolder: "in",
                outputFolder: "out"
            };

            function newApi(error, instance) {
                var client = new Metrichor(conf);

                client.uploadWorkerPool = {
                    defer: function () {}
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

        describe('.autoStart method', function () {

            function newApi(error, instance) {

                var client = new Metrichor();
                client.start_workflow = function (id, cb) {
                    cb(error, instance);
                };

                client.autoConfigure = function (id, cb) {
                    cb();
                };

                sinon.stub(client.log, "warn");
                sinon.spy(client, "autoConfigure");
                sinon.stub(client, "resetStats");
                sinon.spy(client,  "start_workflow");
                return client;
            }

            it('should initiate a new workflow instance', function () {
                var client = newApi(null, {
                    id_workflow_instance: 10,
                    id_user: "user",
                    outputqueue: "queue"
                });

                client.autoStart(111, function () {
                    assert(client.resetStats.calledOnce);
                    assert(client.start_workflow.calledOnce);
                    assert(client.autoConfigure.calledOnce);

                    var args = client.autoConfigure.args[0][0];
                    assert.equal(args.id_workflow_instance, 10);
                    assert.equal(args.bucketFolder, "queue/user/10");
                });
            });

            it('should handle start_workflow errors', function () {
                var client = newApi({
                        error: "Message"
                    },
                    {
                        state: "stopped"
                    });

                client.autoStart(111, function () {
                    assert(client.resetStats.calledOnce);
                    assert(client.start_workflow.calledOnce);
                    assert(client.log.warn.calledOnce);
                    assert(client.log.warn.calledWith("failed to start workflow: Message"));
                    assert(client.autoConfigure.notCalled);
                });
            });
        });

        describe('.autoJoin method', function () {

            function newApi(error, instance) {

                var client = new Metrichor();

                client.workflow_instance = function (id, cb) {
                    cb(error, instance);
                };

                client.autoConfigure = function (id, cb) {
                    cb();
                };

                sinon.stub(client.log, "warn");
                sinon.spy(client, "autoConfigure");
                sinon.stub(client, "resetStats");
                sinon.spy(client,  "workflow_instance");
                return client;
            }

            it('should join an existing workflow instance', function () {
                var client = newApi(null, {
                    id_workflow_instance: 10,
                    id_user: "user",
                    outputqueue: "queue"
                });

                client.autoJoin(111, function () {
                    assert(client.resetStats.calledOnce);
                    assert(client.workflow_instance.calledOnce);
                    assert(client.autoConfigure.calledOnce);

                    var args = client.autoConfigure.args[0][0];
                    assert.equal(args.id_workflow_instance, 10);
                    assert.equal(args.bucketFolder, "queue/user/10");
                });
            });

            it('should handle workflow_instance errors', function () {
                var client = newApi({
                        error: "Message"
                    },
                    {
                        state: "stopped"
                    });

                client.autoJoin(111, function () {
                    assert(client.resetStats.calledOnce);
                    assert(client.workflow_instance.calledOnce);
                    assert(client.log.warn.calledOnce);
                    assert(client.log.warn.calledWith("failed to join workflow: Message"));
                    assert(client.autoConfigure.notCalled);
                });
            });

            it('should not join an instance where state === stopped', function () {
                var client = newApi(
                    {
                        state: "stopped"
                    });

                client.autoJoin(111, function () {
                    assert(client.workflow_instance.calledOnce);
                    assert(client.autoConfigure.notCalled);
                    //assert(client.log.warn.calledWith("workflow 111 is already stopped"));
                });
            });
        });
        /*
        describe('.loadUploadFiles method', function () {

            var client,
                conf = {
                    inputFolder: "in",
                    outputFolder: "out",
                    uploadQueueLimit: 2,
                    uploadQueueThreshold: 1
                };

            beforeEach(function () {
                client = new Metrichor(conf);
                client._seenFiles = {};
                sinon.stub(client, 'enqueueUploadJob');
                sinon.stub(client.log, 'warn');
                sinon.stub(client.log, 'error');
                sinon.stub(client.log, 'info');
            });
        });
        */

        // MC-1304 - test download streams
        describe('._initiateDownloadStream method', function () {

            var tmpfile, tmpdir, writeStream;

            function s3Mock(cb) {
                return {
                    getObject: function () {
                        return {
                            createReadStream: cb
                        }
                    }
                }
            }

            function stub(client) {
                sinon.stub(client.log, "error");
                sinon.stub(client.log, "warn");
                sinon.stub(client.log, "info");
                sinon.stub(client, "deleteMessage");
            }

            beforeEach(function () {
                tmpdir = tmp.dirSync({unsafeCleanup: true});
                fs.writeFile(path.join(tmpdir.name, 'tmpfile.txt'), "dataset", function () {});

                fsProxy.unlink = function () { };
                fsProxy.stat = function () { };
                fsProxy.createWriteStream = function () {
                    writeStream = fs.createWriteStream.apply(this, arguments);
                    return writeStream;
                };
            });

            afterEach(function cleanup() {
                writeStream = null;
                delete fsProxy.stat;
                delete fsProxy.unlink;
                delete fsProxy.createWriteStream;
                tmpfile ? tmpfile.removeCallback() : null;
                tmpdir ? tmpdir.removeCallback() : null;
            });

            it('should handle s3 error', function (done) {
                var client = new Metrichor({});
                stub(client);
                var s3 = s3Mock(function () { throw "Error" });
                client._initiateDownloadStream(s3, {}, {}, path.join(tmpdir.name, 'tmpfile.txt'), function () {
                    assert(client.log.error.calledOnce, "should log error message");
                    done();
                });
            });

            it('should open read stream and write to outputFile', function (done) {
                var client = new Metrichor({});
                stub(client);
                var readStream,
                    msg = {msg: 'bla'},
                    s3 = s3Mock(function cb() {
                        var tmpfile = tmp.fileSync({ prefix: 'prefix-', postfix: '.txt' });
                        readStream = fs.createReadStream(tmpfile.name, function (err) {});
                        return readStream;
                    });
                var filename = path.join(tmpdir.name, 'tmpfile.txt');
                client._initiateDownloadStream(s3, {}, msg, filename, function cb() {
                    assert.equal(readStream.destroyed, true, "should destroy the read stream");
                    assert(client.deleteMessage.calledWith(msg), "should delete sqs message on success");
                    assert.equal(client._stats.download.success, 1, "should count as download as success");
                    done();
                });
            });

            it('should handle read stream errors', function (done) {
                var client = new Metrichor({});
                stub(client);
                var readStream, tmpfile, s3, filename;
                s3 = s3Mock(function cb() {
                    tmpfile = tmp.fileSync({ prefix: 'prefix-', postfix: '.txt' });
                    readStream = fs.createReadStream(tmpfile.name, function (err) { });
                    readStream.on("open", function () {
                        readStream.emit("error", new Error("Test"));
                    });
                    return readStream;
                });
                filename = path.join(tmpdir.name, 'tmpfile.txt');

                client._initiateDownloadStream(s3, {}, {}, filename, function cb() {
                    //assert.equal(readStream.destroyed, true, "should destroy the read stream");
                    assert(client.deleteMessage.notCalled, "should not delete sqs message on error");
                    assert.equal(client._stats.download.success, 0, "should not count as download success on error");
                    done();
                });
                assert.equal(client._stats.download.success, 0);
            });

            it('should handle write stream errors', function (done) {
                var client = new Metrichor({});
                stub(client);
                var readStream, tmpfile, s3, filename;
                s3 = s3Mock(function cb() {
                    tmpfile = tmp.fileSync({ prefix: 'prefix-', postfix: '.txt' });
                    readStream = fs.createReadStream(tmpfile.name, function (err) { });
                    return readStream;
                });
                filename = path.join(tmpdir.name, 'tmpfile2.txt');

                client._initiateDownloadStream(s3, {}, {}, filename, function cb() {
                    //assert.equal(readStream.destroyed, true, "should destroy the read stream");
                    assert(client.deleteMessage.notCalled, "should not delete sqs message on error");
                    assert.equal(client._stats.download.success, 0, "should not count as download success on error");
                    done();
                });
                writeStream.on("open", function () {
                    writeStream.emit("error", new Error("Test"));
                });
            });

            it('should handle createWriteStream error', function (done) {
                var client = new Metrichor({});
                stub(client);
                assert.doesNotThrow(function () {
                    client._initiateDownloadStream(s3Mock(function cb() {}), {}, {}, null, function cb() {
                        done();
                    });
                });
            });

            it('should handle transfer timeout errors', function (done) {
                var readStream, tmpfile, filename, s3,
                    client = new Metrichor({downloadTimeout: 0.0000001});
                stub(client);

                s3 = s3Mock(function cb() {
                    tmpfile = tmp.fileSync({ prefix: 'prefix-', postfix: '.txt' });
                    readStream = fs.createReadStream(tmpfile.name, function (err) { });
                    return readStream;
                });
                filename = path.join(tmpdir.name, 'tmpfile.txt');
                client._initiateDownloadStream(s3, {}, {}, filename, function cb() {
                    assert(readStream.destroyed, "should destroy the read stream");
                    assert(client.deleteMessage.notCalled, "should not delete sqs message on error");
                    assert.equal(client._stats.download.success, 0, "should not count as download success on error");
                    done();
                });
            });
        });

        describe('.sendMessage method', function () {

            var client, args,
                sqsMock = {
                    sendMessage: function () {
                        args = arguments;
                    }
                };

            beforeEach(function () {

                fsProxy.rename = function () {};
                mkdirpProxy = function () {};

                client = new Metrichor({
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

            afterEach(function () {
                // Cleanup
                delete fsProxy.rename;
                delete awsProxy.SQS;
                mkdirpProxy = {};
            });

            it('sqs callback should handle error and log warning', function () {
                var cb,
                    item = 'filename.fast5';

                client.sendMessage(sqsMock, 10, item, function () {});

                cb = args[1];
                cb("Error message");
                assert(client.log.warn.calledOnce);
            });

            it('sqs callback should move file to the ./uploaded folder', function () {
                var cb,
                    item = 'filename.fast5';

                client.sendMessage(sqsMock, 10, item, function () {});

                cb = args[1];
                // cb();
                //assert(client.enqueueUploadJob.calledOnce);
                //assert(client.enqueueUploadJob.calledWith(item));
            });

        });

        describe('._responseHandler method', function () {
            var client,
                container;

            beforeEach(function () {
                client = new Metrichor();
                container = {
                    callback: function () {}
                };
                sinon.stub(container, 'callback');
            });

            it('should handle error status codes', function () {
                client._responsehandler(null, {statusCode: 400}, '', container.callback);
                assert(container.callback.calledWith({"error": "HTTP status 400"}));
                assert(container.callback.calledOnce);
            });

            it('should handle errors', function () {
                client._responsehandler('message', '', ''); // ensure it checks callback exists
                client._responsehandler('message', '', '', container.callback);
                assert(container.callback.calledWith('message'));
                assert(container.callback.calledOnce);
            });

            it('should parse body and handle bad json', function () {
                client._responsehandler(null, '', '{\"error\": \"message\"}');
                client._responsehandler(null, '', '{\"error\": \"message\"}', container.callback);
                assert(container.callback.calledWith({error: 'message'}));
                assert(container.callback.calledOnce);
                client._responsehandler(null, '', '{error: message}', container.callback); // Handles JSON error gracefully
                assert(container.callback.calledTwice);
            });
        });

        describe('.uploadComplete method', function () {
            var client;

            beforeEach(function () {
                client = new Metrichor();
                client.sessionedSQS = function (cb) {
                    cb();
                };
                sinon.stub(client.log, "warn");
                sinon.stub(client.log, "info");
                sinon.stub(client, "sendMessage");
                sinon.stub(client, "discoverQueue");
            });

            it('should handle error', function () {
                var errorCallback;
                client.sessionedSQS = function (cb) {
                    cb(null, {});
                };
                client.discoverQueue = function (sqs, queueName, cb, errorCb) {
                    cb();
                    errorCb();
                };
                sinon.spy(client, "sessionedSQS");
                client.uploadComplete(null, 'item', function () {});
            });
        });

        describe('.processMessage method', function () {
            var client;

            beforeEach(function () {
                client = new Metrichor();
                client.sessionedSQS = function (cb) { cb(); };
                sinon.stub(client.log, "info");
                sinon.stub(client.log, "warn");
                sinon.stub(client.log, "error");
                sinon.stub(client, "deleteMessage");
                fsProxy.createWriteStream = function () {};
                mkdirpProxy.sync = function () {};
                sinon.spy(fsProxy, 'createWriteStream');
                client.sessionedS3 = function () {};
                sinon.spy(client, 'sessionedS3');
            });

            afterEach(function () {
                delete fsProxy.createWriteStream;
                delete mkdirpProxy.sync;
            });

            it('should validate input', function () {
                client.processMessage();
                assert(client.log.info.calledWith('empty message'));
                client.processMessage(null, function () {});
            });

            it('should handle bad message json', function () {
                var msg = { Body: '{message: body}' };
                client.processMessage(msg);
                assert(client.deleteMessage.calledWith(msg));
                assert(client.log.error.calledOnce);
            });

            it('should parse message json', function () {
                client.sessionedS3 = function (cb) {
                    cb('error message');
                };
                sinon.spy(client, 'sessionedS3');

                client.processMessage({
                    Body: '{"message": "body"}'
                });
                assert(client.log.warn.calledOnce); // No path

                /*
                 client.processMessage({
                 Body: '{"path": "body"}'
                 });*/
            });
        });

        it('should list workflows', function() {
            var uri, err, obj,
                client = new Metrichor({
                    "url"    : "http://metrichor.local:8080",
                    "apikey" : "FooBar02"
                });

            requestProxy.get = function(o, cb) {
                uri = o.uri;
                cb(null, null, '{"workflows":[{"description":"a workflow"}]}');
                delete requestProxy.get;
            };

            assert.doesNotThrow(function () {
                client.workflows(function(e, o) {
                    err = e;
                    obj = o;
                });
            });

            assert.equal(uri,     "http://metrichor.local:8080/workflow.js?apikey=FooBar02");
            assert.equal(err,     null, 'no error reported');
            assert.deepEqual(obj, [{"description":"a workflow"}], 'workflow list');
        });

        it('should list workflows and include agent_version', function() {
            var obj1, obj2, err, client = new Metrichor({
                "url"           : "http://metrichor.local:8080",
                "apikey"        : "FooBar02",
                "agent_version" : "0.18.12345",
            });

            requestProxy.get = function(o, cb) {
                obj1 = o.uri;
                cb(null, null, '{"workflows":[{"description":"a workflow"}]}');
                delete requestProxy.get;
            };

            assert.doesNotThrow(function () {
                client.workflows(function(e, o) {
                    err = e;
                    obj2 = o;
                });
                delete requestProxy.get;
            });

            assert.equal(obj1,     "http://metrichor.local:8080/workflow.js?apikey=FooBar02;agent_version=0.18.12345");
            assert.equal(err,      null, 'no error reported');
            assert.deepEqual(obj2, [{"description":"a workflow"}], 'workflow list');
        });

        it('should update a workflow', function() {
            var client = new Metrichor({
                "url"    : "http://metrichor.local:8080",
                "apikey" : "FooBar02"
            });

            requestProxy.post = function(obj, cb) {
                assert.equal(obj.uri,    "http://metrichor.local:8080/workflow/test.js");
                assert.equal(obj.form.apikey, "FooBar02");
                assert.deepEqual(JSON.parse(obj.form.json), {"description":"test workflow", "rev":"1.1"});
                cb(null, null, '{"description":"a workflow","rev":"1.0"}');
                delete requestProxy.post;
            };

            client.workflow('test', {"description":"test workflow", "rev":"1.1"}, function(err, obj) {
                assert.equal(err, null, 'no error reported');
                assert.deepEqual(obj, {"description":"a workflow","rev":"1.0"}, 'workflow read');
            });
        });

        it('should start a workflow_instance', function() {
            var client = new Metrichor({
                "url"    : "http://metrichor.local:8080",
                "apikey" : "FooBar02"
            });

            requestProxy.post = function(obj, cb) {
                assert.equal(obj.uri,    "http://metrichor.local:8080/workflow_instance.js");
                assert.equal(obj.form.apikey, "FooBar02");
                assert.equal(JSON.parse(obj.form.json).workflow, "test");
                cb(null, null, '{"id_workflow_instance":"1","id_user":"1"}');
                delete requestProxy.post;
            };

            client.start_workflow('test', function(err, obj) {
                assert.equal(err, null, 'no error reported');
                assert.deepEqual(obj, {"id_workflow_instance":"1","id_user":"1"}, 'workflow_instance start response');
            });
        });

        it('should stop a workflow_instance', function() {
            var client = new Metrichor({
                "url"    : "http://metrichor.local:8080",
                "apikey" : "FooBar02"
            });

            requestProxy.put = function(obj, cb) {
                assert.equal(obj.uri,    "http://metrichor.local:8080/workflow_instance/stop/test.js");
                assert.equal(obj.form.apikey, "FooBar02");
                cb(null, null, '{"id_workflow_instance":"1","id_user":"1","stop_requested_date":"2013-09-03 15:17:00"}');
                delete requestProxy.get;
            };

            client.stop_workflow('test', function(err, obj) {
                assert.equal(err, null, 'no error reported');
                assert.deepEqual(obj, {"id_workflow_instance":"1","id_user":"1","stop_requested_date":"2013-09-03 15:17:00"}, 'workflow_instance stop response');
            });
        });

        it('should list workflow_instances', function() {
            var client = new Metrichor({
                "url"    : "http://metrichor.local:8080",
                "apikey" : "FooBar02"
            });

            requestProxy.get = function(obj, cb) {
                assert.equal(obj.uri, "http://metrichor.local:8080/workflow_instance.js?apikey=FooBar02");
                cb(null, null, '{"workflow_instances":[{"id_workflow_instance":"149","state":"running","workflow_filename":"DNA_Sequencing.js","start_requested_date":"2013-09-16 09:25:15","stop_requested_date":"2013-09-16 09:26:04","start_date":"2013-09-16 09:25:17","stop_date":"2013-09-16 09:26:11","control_url":"127.0.0.1:8001","data_url":"localhost:3006"}]}');
            };

            client.workflow_instances(function(err, obj) {
                assert.equal(err, null, 'no error reported');
                assert.deepEqual(obj, [{"id_workflow_instance":"149","state":"running","workflow_filename":"DNA_Sequencing.js","start_requested_date":"2013-09-16 09:25:15","stop_requested_date":"2013-09-16 09:26:04","start_date":"2013-09-16 09:25:17","stop_date":"2013-09-16 09:26:11","control_url":"127.0.0.1:8001","data_url":"localhost:3006"}], 'workflow instance list');
            });
        });

        it('should read a workflow_instance', function() {
            var client = new Metrichor({
                "url"    : "http://metrichor.local:8080",
                "apikey" : "FooBar02"
            });

            requestProxy.get = function(obj, cb) {
                assert.equal(obj.uri, "http://metrichor.local:8080/workflow_instance/149.js?apikey=FooBar02");
                cb(null, null, '{"id_workflow_instance":"149","state":"running","workflow_filename":"DNA_Sequencing.js","start_requested_date":"2013-09-16 09:25:15","stop_requested_date":"2013-09-16 09:26:04","start_date":"2013-09-16 09:25:17","stop_date":"2013-09-16 09:26:11","control_url":"127.0.0.1:8001","data_url":"localhost:3006"}');
                delete requestProxy.get;
            };

            client.workflow_instance(149, function(err, obj) {
                assert.equal(err, null, 'no error reported');
                assert.deepEqual(obj, {"id_workflow_instance":"149","state":"running","workflow_filename":"DNA_Sequencing.js","start_requested_date":"2013-09-16 09:25:15","stop_requested_date":"2013-09-16 09:26:04","start_date":"2013-09-16 09:25:17","stop_date":"2013-09-16 09:26:11","control_url":"127.0.0.1:8001","data_url":"localhost:3006"}, 'workflow read');
            });
        });

        it('should read a workflow', function() {
            var obj1, obj2, err, client = new Metrichor({
                "url"    : "http://metrichor.local:8080",
                "apikey" : "FooBar02"
            });

            requestProxy.get = function(o, cb) {
                obj1 = o.uri;
                cb(null, null, '{"description":"a workflow","rev":"1.0"}');
                delete requestProxy.get;
            };

            assert.doesNotThrow(function () {
                client.workflow('test', function(e, o) {
                    err  = e;
                    obj2 = o;
                });
            });

            assert.equal(obj1,     "http://metrichor.local:8080/workflow/test.js?apikey=FooBar02");
            assert.equal(err,      null, 'no error reported');
            assert.deepEqual(obj2, {"description":"a workflow","rev":"1.0"}, 'workflow read');
        });
    });
});
