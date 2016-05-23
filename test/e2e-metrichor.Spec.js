/**
 * E2E test of the metrichor api
 */
var underscore     = require('underscore');
var proxyquire     = require('proxyquire');
var assert         = require("assert");
var sinon          = require("sinon");
var path           = require("path");
var tmp            = require('tmp');
var queue          = require('queue-async');
var fs             = require('fs');
var fsProxy        = {};
var api_key        = "XXX";
var workflowID     = 486;
var timeout        = 10000;
var fileCount      = 1;
var fileCheckInterval      = 0.5;
var serviceUrl     = 'https://dev.metrichor.com';
var fileExp        = new RegExp('fast5$');

var requestProxy = {
    get: function (opts, cb) {
        if (opts.uri && opts.uri.match("workflow_instance")) {
            cb(null, { statusCode: 200 }, JSON.stringify({
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
            cb(null, { statusCode: 200 }, JSON.stringify(ret));
        } else if (opts.uri && opts.uri.match("token")) {
            cb(null, { statusCode: 200 }, JSON.stringify({expiration: new Date(1e13)}));
        } else {
            cb("ERROR. Invalid POST arguments");
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
        /*
        // Key s3 mock: https://github.com/jubos/fake-s3
        // fakes3 -r /mnt/fakes3_root -p 4567
        var config = {
            s3ForcePathStyle: true,
            accessKeyId: 'ACCESS_KEY_ID',
            secretAccessKey: 'SECRET_ACCESS_KEY',
            endpoint: new AWS.Endpoint('http://localhost:' + fakeS3port) // fake-s3 server
        };
        return new AWS.S3(config);
         */

        return {
            deleteObject: function (cnf, cb) {
                if (cb && cnf) {
                    cb();
                }
            },
            upload: function (params, options, cb) {
                if (cb && params && options) {
                    cb();
                }
            }
        };


    }
};

// it's a singleton
// proxyquire lib/utils once to make sure the requestProxy is used
proxyquire('../lib/utils', {
    'request' : requestProxy
});

var Metrichor = proxyquire('../lib/metrichor', {
    'graceful-fs' : fsProxy,
    'aws-sdk' : awsProxy
});

describe('metrichor api end-to-end test', function () {

    before(function (done) {
        this.timeout(timeout);
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

    describe('startWorkflow', function () {

        var tmpInputDir, tmpOutputDir, client;
        beforeEach(function () {
            tmpInputDir = tmp.dirSync({unsafeCleanup: true});
            tmpOutputDir = tmp.dirSync({unsafeCleanup: true});
            // Generating 100 empty .fast5 files
            for (var i = 0; i<fileCount; i++) {
                fs.writeFile(path.join(tmpInputDir.name, i + '.fast5'), "HELLO");
            }
        });

        afterEach(function cleanup() {
            tmpInputDir ? tmpInputDir.removeCallback() : null;
            tmpOutputDir ? tmpOutputDir.removeCallback() : null;
        });

        function runTests(client, uploadDir, downloadDir, done) {

            var ustats = client.stats("upload");
            assert.equal(ustats.success, fileCount, 'upload all files. fileCount = ' + fileCount + ' ustats.success = ' + ustats.success);
            assert.equal(underscore.every(client._inputFiles, { uploaded: true, enqueued: false, in_flight: false }), true);
            // assert.equal(client._stats.upload.failure.length, 0, 'no files failed to upload. ' + JSON.stringify(client._stats.upload.failure));
            // var dstats = client.stats("download");
            // assert.equal(dstats.success, fileCount, 'download all files');
            queue()
                .defer(function (cb) {
                    fs.readdir(uploadDir, function (err, files) {
                        if (err) {
                            console.log(err);
                        }
                        var filtered = files.filter(function (f) { return f.match(fileExp); });
                        assert.equal(filtered.length, 0, 'move all uploaded files from the upload folder');
                        cb();
                    });
                })
                .defer(function (cb) {
                    fs.readdir(path.join(uploadDir, 'uploaded'), function (err, files) {
                        assert(files && files.length, 'no files found in uploaded folder');
                        var filtered = files.filter(function (f) { return f.match(fileExp); });
                        assert.equal(filtered.length, fileCount, 'move all uploaded files to +uploaded');
                        cb();
                    });
                })
                /*.defer(function (cb) {
                    fs.readdir(path.join(downloadDir, 'fail'), function (err, files) {
                        var filtered = files.filter(function (f) { return f.match(fileExp); });
                        assert.equal(filtered.length, fileCount, 'move all downloaded files to the downloadDir/fail');
                        cb();
                    });
                })*/
                .awaitAll(done);
        }

        it('should initiate and upload files', function (done) {
            this.timeout(timeout);
            client = new Metrichor({
                apikey: api_key,
                url: serviceUrl,
                agent_version: '10000.0.0',
                log: logging(),
                fileCheckInterval: fileCheckInterval,
                initDelay: 100,
                downloadMode: "data+telemetry",
                inputFolder:  tmpInputDir.name,
                outputFolder: tmpOutputDir.name
            });

            client.autoStart(workflowID, function (err, state) {

                function run() {
                    client.stop_everything();
                    setTimeout(function () {
                        runTests(client, tmpInputDir.name, tmpOutputDir.name, done);
                    }, 800);
                }

                // assert no errors
                var test_timeout = setTimeout(run, 0.8 * timeout);

                // Exit early if all files have been uploaded
                var test_interval = setInterval(function () {
                    if (client.stats("upload").success === fileCount) {
                        clearTimeout(test_timeout);
                        clearInterval(test_interval);
                        run();
                    }
                }, 500);
            });
        });
    });
});