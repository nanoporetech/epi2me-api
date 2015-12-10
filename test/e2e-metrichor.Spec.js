/**
 * E2E integration test of the metrichor api
 *
 * Requires 'fasts3' to be installed (https://github.com/jubos/fake-s3)
 *
 * on OSX: gem install fakes3
 *
 */

// if (require('os').type() !== 'Darwin') {
if (require('os').type() !== 'Darwin' || process.env.NODE_ENV !== 'development') {
    console.log('WARNING: e2e tests only configured for OSX');
    return;
}

var proxyquire     = require('proxyquire');
var assert         = require("assert");
var sinon          = require("sinon");
var path           = require("path");
var tmp            = require('tmp');
var queue          = require('queue-async');
var exec           = require('child_process').exec;
var AWS            = require('aws-sdk');
var fs             = require('fs');
var fsProxy        = {};

/**
 * TODO:
 * generate a lot of files
 * upload: get readStream and stream to tmp directory
 * download: provide readStream
 * throw random errors
 */

var cp,
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

var Metrichor      = proxyquire('../lib/metrichor', {
    'aws-sdk'     : awsProxy,
    'request'     : fakeS3,
    'graceful-fs' : fsProxy
});

describe('metrichor api', function () {

    after(function () {
        fakeS3process.stop();
    });

    before(function (done) {
        this.timeout(3000);
        fakeS3process.exec();
        setTimeout(done, 500);
    });

    function logging() {
        return {
            warn: function () {},
            error: function () {},
            info: function () {}
        }
    };

    describe('uploading', function () {

        var tmpInputDir, tmpOutputDir, client;
        beforeEach(function () {
            tmpInputDir = tmp.dirSync({unsafeCleanup: true});
            tmpOutputDir = tmp.dirSync({unsafeCleanup: true});

            // Generating 100 empty .fast5 files
            for (var i = 0; i<100; i++) {
                fs.writeFile(path.join(tmpInputDir.name, i + '.fast5'));
            }
        });

        afterEach(function cleanup() {
            tmpInputDir ? tmpInputDir.removeCallback() : null;
            tmpOutputDir ? tmpOutputDir.removeCallback() : null;
        });

        it('should initiate and upload files', function (done) {
            this.timeout(3000);
            client = new Metrichor({
                log: logging(),
                fileCheckInterval: 1,
                initDelay: 100,
                inputFolder:  tmpInputDir.name,
                outputFolder: tmpOutputDir.name
            });
            client.autoStart("123", function (err, state) {
                setTimeout(function () {
                    client.stop_everything();
                    client.stop_everything();
                    setTimeout(done, 800);
                }, 2000);
            });
        });

        it('should initiate and upload files', function (done) {
            this.timeout(3000);
            client = new Metrichor({
                fileCheckInterval: 1,
                initDelay: 100,
                filter: "off",
                log: logging(),
                downloadMode: "telemetry",
                inputFolder:  tmpInputDir.name,
                outputFolder: tmpOutputDir.name
            });
            client.autoStart("123", function (err, state) {
                setTimeout(function () {
                    client.stop_everything();
                    setTimeout(done, 800);
                }, 2000);
            });
        });

        it('should join workflow and upload files', function (done) {
            this.timeout(3000);
            client = new Metrichor({
                fileCheckInterval: 1,
                initDelay: 100,
                log: logging(),
                inputFolder:  tmpInputDir.name,
                outputFolder: tmpOutputDir.name
            });
            client.autoJoin("123", function (err, state) {
                setTimeout(function () {
                    client.stop_everything();
                    setTimeout(done, 800);
                }, 2000);
            });
        });
    });
});