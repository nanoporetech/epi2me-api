/**
 * E2E test of the metrichor api
 */
const proxyquire   = require('proxyquire');
const assert       = require("assert");
const path         = require("path");
const tmp          = require('tmp');
const queue        = require('queue-async');
const fs           = require('fs');
const mkdirp       = require('mkdirp');
const readdir      = require('recursive-readdir') // handle batching
var fsProxy        = {};
var api_key        = "XXX";
var workflowID     = 486;
var TEST_TIMEOUT   = 20 * 1000;
var fileCount      = 300;
var fileCheckInterval      = 0.5;
var serviceUrl     = 'https://epi2me-dev.nanoporetech.com';
var fileExp        = new RegExp('fast5$');
var uploadedFiles  = [];

var requestProxy = {
    get: function (opts, cb) {
        if (opts.uri && opts.uri.match("workflow_instance")) {
            cb(null, { statusCode: 200 }, JSON.stringify({
                id_workflow_instance : "id_workflow_instance",
                chain : null,
                remote_addr : "remote_addr",
                bucket : "bucket",
                inputqueue : "input-queue",
                outputqueue : "output-queue",
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
            ret.inputqueue = "input-queue";
            ret.outputqueue = "output-queue";
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
                cb(null, { Messages: uploadedFiles.splice(0, 10) });
            },
            getQueueAttributes: function (opts, cb) {
                cb(null, {
                    Attributes: {
                        ApproximateNumberOfMessages: uploadedFiles.length
                    }
                });
            },
            sendMessage: function (opts, cb) {
                cb();
            },
            getQueueUrl: function (opts, cb) {
                cb(null, { QueueUrl: opts.QueueName + "-url" });
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
            },
            getObject: function (opts) {
                return {
                    createReadStream: function () {
                        return fs.createReadStream(opts.Key);
                    }
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
    this.timeout(TEST_TIMEOUT);
    before(function (done) {
        this.timeout(TEST_TIMEOUT);
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
                // console.log(msg)
            }
        }
    };

    describe('startWorkflow', function () {
        this.timeout(TEST_TIMEOUT);
        var tmpInputDir, tmpS3Dir, tmpOutputDir, client;
        beforeEach(function () {
            tmpInputDir = tmp.dirSync({unsafeCleanup: true});
            tmpS3Dir = tmp.dirSync({unsafeCleanup: true});
            tmpOutputDir = tmp.dirSync({unsafeCleanup: true});
            // Creating two empty batches for testing
            var fileQ = queue(1);
            mkdirp.sync(path.join(tmpInputDir.name, 'batch_1'));
            mkdirp.sync(path.join(tmpInputDir.name, 'batch_2'));
            // Generating 300 empty .fast5 files
            // 100 in root, 100 in batch_1, 100 in batch_2
            for (var i = 0; i < fileCount; i++) {
                fileQ.defer(function (done) {
                    // fs.writeFile(path.join(), "DATA STRING");
                    let batch = (i < 100) ? '' : (i < 200) ? 'batch_1' : 'batch_2'
                    fs.closeSync(fs.openSync(path.join(tmpInputDir.name, batch, i + '.fast5'), 'w'));

                    var fn = path.join(tmpS3Dir.name, i + '-download.fast5');
                    var message = {
                        Body: JSON.stringify({
                            telemetry: {
                                json: {
                                    exit_status: 'S_OK'
                                },
                                hints: {
                                    folder: 'pass'
                                }
                            },
                            path: fn
                        })
                    };
                    uploadedFiles.push(message);
                    // fs.writeFile(fn, "DATA STRING");
                    fs.closeSync(fs.openSync(fn, 'w'));
                    done();
                });
            }
        });

        afterEach(function cleanup() {
            // tmpInputDir ? tmpInputDir.removeCallback() : null;
            // tmpS3Dir ? tmpS3Dir.removeCallback() : null;
            // tmpOutputDir ? tmpOutputDir.removeCallback() : null;
        });

        function runTests(client, uploadDir, downloadDir, done) {
            var ustats = client.stats("upload");
            assert.equal(ustats.success, fileCount, 'upload all files. fileCount = ' + fileCount + ' ustats.success = ' + ustats.success);
            assert(!client._uploadedFiles.length, "_uploadedFiles array should be empty");

            for (var key in client._stats.upload.failure) {
                assert.equal(typeof client._stats.upload.failure[key], 'undefined', 'no files failed to upload. ' + JSON.stringify(key, client._stats.upload.failure[key]));
            }
            for (var key in client._stats.download.failure) {
                assert.equal(typeof client._stats.download.failure[key], 'undefined', 'no files failed to upload. ' + JSON.stringify(key, client._stats.download.failure[key]));
            }
            var dstats = client.stats("download");
            assert.equal(dstats.success, fileCount, 'download all files');
            queue()
            .defer(function (cb) {
                fs.readdir(uploadDir, function (err, files) {
                    if (err) { console.log(err); }
                    var filtered = files.filter(function (f) { return f.match(fileExp); });
                    assert.equal(filtered.length, 0, 'move all uploaded files from the upload folder');
                    cb();
                });
            })
            .defer(function (cb) {
                readdir(path.join(uploadDir, 'uploaded'), function (err, files) {
                    assert(files && files.length, 'no files found in uploaded folder');
                    var filtered = files.filter(function (f) { return f.match(fileExp); });
                    assert.equal(filtered.length, fileCount, 'move all uploaded files to +uploaded');
                    cb();
                });
            })
            .defer(function (cb) {
                readdir(path.join(downloadDir), function (err, files) {
                    if (err) {
                        console.log(err);
                    }
                    var filtered = files.filter(function (f) { return f.match(fileExp); });
                    assert.equal(filtered.length, fileCount, 'move all downloaded files to the downloadDir/fail');
                    cb();
                });
            })
            .awaitAll(done);
        }

        it('should initiate and upload files', function (done) {
            this.timeout(TEST_TIMEOUT);
            client = new Metrichor({
                apikey: api_key,
                url: serviceUrl,
                agent_version: '10000.0.0',
                log: logging(),
                fileCheckInterval: fileCheckInterval,
                downloadCheckInterval: 1,
                initDelay: 100,
                downloadMode: "data+telemetry",
                filetype: '.fast5',
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
                var test_timeout = setTimeout(run, 0.8 * TEST_TIMEOUT);

                // Exit early if all files have been uploaded
                var test_interval = setInterval(function () {
                    if (client.stats("download").success === fileCount && client.stats("upload").success === fileCount) {
                        clearTimeout(test_timeout);
                        clearInterval(test_interval);
                        run();
                    }
                }, 500);
            });
        });
    });
});
