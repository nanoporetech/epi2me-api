"use strict";
/**
 * end-to-end test of the epi2me api
 *
 */

const proxyquire     = require('proxyquire');
const assert         = require("assert");
const sinon          = require("sinon");
const path           = require("path");
const tmp            = require('tmp');
const queue          = require('queue-async');
const fs             = require('fs-extra');
var fsProxy        = {};
const api_key        = process.env.API_KEY;
const workflowID     = 486;
const timeout        = 50000;
const fileCount      = 3;
const serviceUrl     = 'https://epi2me-dev.nanoporetech.com';
const fileExp        = new RegExp('fast5$');

const EPI2ME         = proxyquire('../build/lib/epi2me', {
    'fs-extra' : fsProxy
}).default;

describe('epi2me api integration test', function () {

    if (require("os").type() !== 'Darwin') {
	console.log('WARNING: e2e tests only configured for OSX');
	return;
    } else if (process.env.NODE_ENV !== 'development') {
	console.log('WARNING: e2e tests require env variable NODE_ENV to equal development');
	return;
    } else if (!process.env.API_KEY) {
	console.log('WARNING: e2e tests require env variable API_KEY to be set');
	return;
    }

    after(function () {
        //fakeS3process.stop();
    });

    before(function (done) {
        this.timeout(timeout);
        //fakeS3process.exec();
        setTimeout(done, 500);
    });

    function logging() {
        return {
            warn: function (msg) {
                console.log(msg);
            },
            error: function (err) {
                console.log(err);
            },
            info: function (msg) {
                console.log(msg)
            }
        }
    };

    describe('uploading', function () {

        var tmpInputDir, tmpOutputDir, client;
        beforeEach(function () {
            tmpInputDir = tmp.dirSync({unsafeCleanup: true});
            tmpOutputDir = tmp.dirSync({unsafeCleanup: true});

            // Generating 100 empty .fast5 files
            for (var i = 0; i<fileCount; i++) {
                fs.writeFile(path.join(tmpInputDir.name, i + '.fast5'));
            }
        });

        afterEach(function cleanup() {
            tmpInputDir ? tmpInputDir.removeCallback() : null;
            tmpOutputDir ? tmpOutputDir.removeCallback() : null;
        });

        function runTests(client, uploadDir, downloadDir, done) {

            var ustats = client.stats("upload");
            var dstats = client.stats("download");
            assert.equal(ustats.success, fileCount, 'upload all files');
            assert.equal(dstats.success, fileCount, 'download all files');
            queue()
                .defer(function (cb) {
                    fs.readdir(uploadDir, function (err, files) {
                        var filtered = files.filter(function (f) { return f.match(fileExp); });
                        assert.equal(filtered.length, 0, 'move all uploaded files from the upload folder');
                        cb();
                    });
                })
                .defer(function (cb) {
                    fs.readdir(path.join(uploadDir, 'uploaded'), function (err, files) {
                        var filtered = files.filter(function (f) { return f.match(fileExp); });
                        assert.equal(filtered.length, fileCount, 'move all uploaded files to +uploaded');
                        cb();
                    });
                })
                .defer(function (cb) {
                    fs.readdir(path.join(downloadDir, 'fail'), function (err, files) {
                        var filtered = files.filter(function (f) { return f.match(fileExp); });
                        assert.equal(filtered.length, fileCount, 'move all downloaded files to the downloadDir/fail');
                        cb();
                    });
                })
                .awaitAll(done);
        }

        it('should initiate and upload files', function (done) {
            this.timeout(timeout);
            client = new EPI2ME({
                apikey: api_key,
                url: serviceUrl,
                agent_version: '10000.0.0',
                log: logging(),
                fileCheckInterval: 4,
                initDelay: 100,
                downloadMode: "data+telemetry",
                inputFolder:  tmpInputDir.name,
                outputFolder: tmpOutputDir.name
            });
            client.autoStart(workflowID, function (err, state) {
                setTimeout(function () {
                    client.stop_everything();
                    setTimeout(function () {
                        runTests(client, tmpInputDir.name, tmpOutputDir.name, done);
                    }, 800);
                }, timeout - 10000);
                setInterval(function () {
                    // Exit early if all files have been uploaded
                    if (client.stats("download").success === fileCount) {
                        client.stop_everything();
                        setTimeout(function () {
                            runTests(client, tmpInputDir.name, tmpOutputDir.name, done);
                        }, 800);
                    }
                }, 500);
            });
        });
    });
});

/*
        it('should initiate and upload files', function (done) {
            this.timeout(timeout);
            client = new EPI2ME({
                apikey: api_key,
                url: serviceUrl,
                fileCheckInterval: 1,
                initDelay: 100,
                filter: "off",
                log: logging(),
                downloadMode: "telemetry",
                inputFolder:  tmpInputDir.name,
                outputFolder: tmpOutputDir.name
            });
            client.autoStart(workflowID, function (err, state) {
                setTimeout(function () {
                    client.stop_everything();
                    setTimeout(done, 800);
                }, timeout - 10000);
            });
        });
        */
        /*
        it('should join workflow and upload files', function (done) {
            this.timeout(3000);
            client = new EPI2ME({
                fileCheckInterval: 1,
                initDelay: 100,
                log: logging(),
                inputFolder:  tmpInputDir.name,
                outputFolder: tmpOutputDir.name
            });
            client.autoJoin(486, function (err, state) {
                setTimeout(function () {
                    client.stop_everything();
                    setTimeout(done, 800);
                }, 2000);
            });
        });
        */
/*
var cp;

    s3tmpdir,

    fakeS3port = 10001,
    fakeS3process = {
        exec: function () {

            var execOptions = {
                stdout: true,
                stderr: true,
                stdin: true,
                failOnError: true,
                stdinRawMode: false
            };

            s3tmpdir = tmp.dirSync();
            var cmd = "fakes3 -r " + s3tmpdir.name + " -p " + fakeS3port;
            cp = exec(cmd, execOptions, function (err, stdout, stderr) {}.bind(this));
            cp.stdout.pipe(process.stdout);
            cp.stderr.pipe(process.stderr);
            process.stdin.resume();
            process.stdin.setEncoding('utf8');
            process.stdin.pipe(cp.stdin);
        },
        stop: function () {
            cp.kill('SIGINT');
        }
    };


var fakeS3 = {
    get: function (opts, cb) {
        if (opts.uri && opts.uri.match("workflow_instance")) {
            cb(null, {statusCode: 200}, JSON.stringify({
                id_workflow_instance : "id_workflow_instance",
                chain : null,
                remote_addr : "remote_addr",
                bucket : "bucket",
                inputqueue : "inputqueue",
                outputqueue : "inputqueue",
                region : "region",
                state : "started"
            }));
        } else {
            cb({});
        }
    },
    post: function (opts, cb) {
        // Called by
        var ret = {};
        if (opts.uri && opts.uri.match('workflow_instance')) {
            ret.id_workflow_instance = "id_workflow_instance";
            ret.chain = null;
            ret.remote_addr = "remote_addr";
            ret.bucket = "bucket";
            ret.inputqueue = "inputqueue";
            ret.outputqueue = "inputqueue";
            ret.region = "region";
            ret.state = "started";
            cb(null, {statusCode: 200}, JSON.stringify(ret));
        } else if (opts.uri && opts.uri.match("token")) {
            cb(null, {statusCode: 200}, JSON.stringify({expiration: new Date(1e13)}));
        } else {
            cb("ERROR");
        }
    },
    put: function (opts, cb) {
        cb({});
    }
};

var awsProxy = {
    config: {
        update: function () {}
    },
    SQS: function () {
        return { // sqs object constructor
            receiveMessage: function (opts, cb) {
                // Used to queue messages to be downloaded
                cb({ Messages: ['1.fast5'] });
            },
            getQueueAttributes: function (opts, cb) {
                cb(null, {
                    Attributes: {
                        ApproximateNumberOfMessages: 0
                    }
                });
            },
            sendMessage: function (opts, cb) {
                cb();
            },
            getQueueUrl: function (opts, cb) {
                cb(null, { QueueUrl: "queue-url" });
            },
            deleteMessage: function (opts, cb) {
                cb();
            }
        }
    },
    S3: function () { // s3 object constructor
        // Key s3 mock: https://github.com/jubos/fake-s3
        // fakes3 -r /mnt/fakes3_root -p 4567

        var config = {
            s3ForcePathStyle: true,
            accessKeyId: 'ACCESS_KEY_ID',
            secretAccessKey: 'SECRET_ACCESS_KEY',
            endpoint: new AWS.Endpoint('http://localhost:' + fakeS3port) // fake-s3 server
        };

        return new AWS.S3(config);
    }
};
*/
