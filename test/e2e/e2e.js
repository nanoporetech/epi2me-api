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
var api_key        = "XXX";
var workflowID     = 486;
var TEST_TIMEOUT   = 200 * 1000;
var fileCount      = 1000 * 1000;
var serviceUrl     = 'https://epi2me-dev.nanoporetech.com';
var fileExp        = new RegExp('fastq$');
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
    S3: function () {
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
    'request' : requestProxy,
    'graceful-fs' : {
        stat: function (cb) {
            cb(null, { size: 0 });
        }
    }
});

var Metrichor = proxyquire('../lib/metrichor', {
    'aws-sdk' : awsProxy
});


// This is to ensure that we clean up the tmp folder...
let closed = false;

const onClose = () => {

    if (!closed) {
        closed = true;
        if (tmpInputDir) tmpInputDir.removeCallback();
        if (tmpS3Dir) tmpS3Dir.removeCallback();
        if (tmpOutputDir) tmpOutputDir.removeCallback();
    };

    setTimeout(function () {
        process.exit(0);
    }, 3000);

    process.removeListener('exit', onClose);
    process.removeListener('close', onClose);
};

process.on('exit', onClose);
process.on('close', onClose);
process.on('sigterm', onClose);


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
                //console.log(msg)
            },
            debug: function (msg) {
                //console.log(msg)
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
            // Generating 300 empty .fastq files
            // 100 in root, 100 in batch_1, 100 in batch_2
            let k = 0;
            for (var i = 0; i < fileCount; i++) {
                fileQ.defer(function (done) {
                    setTimeout(function () {
                        //console.log("Created new file: ", path.join(tmpInputDir.name, 'batch_1', k++ + '.fastq'))
                        fs.closeSync(fs.openSync(path.join(tmpInputDir.name, 'batch_1', (k++) +'.fastq'), 'w'));
                        var fn = path.join(tmpS3Dir.name, (k++) + '-download.fastq');
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
                        fs.closeSync(fs.openSync(fn, 'w'));
                        setTimeout(done);
                    })
                });
            }
            fileQ.awaitAll(function () {
                console.log("created " + fileCount + "files in " + tmpInputDir.name);
            })
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
                fileCheckInterval: 0.1,
                downloadCheckInterval: 1,
                initDelay: 100,
                downloadMode: "data+telemetry",
                filetype: '.fastq',
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
                    console.log("Up: ", client.stats("upload").success, '\t\t\tDown:', client.stats("download").success);
                    if (client.stats("download").success === fileCount && client.stats("upload").success === fileCount) {
                        clearTimeout(test_timeout);
                        clearInterval(test_interval);
                        run();
                    }
                }, 1000);
            });
        });
    });
});
