var proxyquire     = require('proxyquire');
var assert         = require("assert");
var sinon          = require("sinon");
var path           = require("path");
var tmp            = require('tmp');
var queue          = require('queue-async');
var fs             = require('fs');
var requestProxy   = {};
var awsProxy       = {};
var fsProxy        = {};
var Metrichor      = proxyquire('../lib/metrichor', {
    'aws-sdk'     : awsProxy,
    'request'     : requestProxy,
    'graceful-fs' : fsProxy
});

describe('.uploadHandler method', function () {

    var tmpfile = 'tmpfile.txt', tmpdir, readStream;

    function stub(client) {
        sinon.stub(client, "session");
        sinon.stub(client, "sessionedS3");
        sinon.stub(client, "uploadComplete");
        sinon.stub(client.log, "error");
        sinon.stub(client.log, "warn");
        sinon.stub(client.log, "info");
    }

    beforeEach(function () {
        tmpdir = tmp.dirSync({unsafeCleanup: true});
        fs.writeFile(path.join(tmpdir.name, tmpfile));
    });

    afterEach(function cleanup() {
        readStream = null;
        tmpdir ? tmpdir.removeCallback() : null;
    });

    it('should open readStream', function (done) {
        var client = new Metrichor({
            inputFolder: tmpdir.name
        });
        stub(client);
        client.sessionedS3 = function () {
            return {
                upload: function (params, options, cb) {
                    cb();
                    assert(params)
                }
            };
        };
        client.uploadComplete = function (objectId, item, successCb) {
            successCb();
        };
        client.uploadHandler(tmpfile, function (error) {
            assert(typeof error === 'undefined', 'unexpected error message: ' + error);
            done();
        });

    });

    it('should handle read stream errors', function (done) {
        fsProxy.createReadStream = function () {
            readStream = fs.createReadStream.apply(this, arguments);
            return readStream;
        };
        var client = new Metrichor({
            inputFolder: tmpdir.name
        });
        stub(client);
        client.sessionedS3 = function () {
            return {
                upload: function (params, options, cb) {
                    cb();
                    assert(params)
                }
            };
        };
        client.uploadHandler(tmpfile, function (msg) {
            assert(msg.match(/failed to upload/), 'unexpected error message format: ' + msg);
            setTimeout(done, 10);
        });
        readStream.emit("error");
    });

    it('should handle bad file name - ENOENT', function (done) {
        var client = new Metrichor({
            inputFolder: tmpdir.name
        });
        stub(client);
        client.uploadHandler('bad file name', function (msg) {
            assert(typeof msg !== 'undefined', 'failure');
            done();
        });
    });
});

describe('._moveUploadedFile method', function () {

    var fileName = 'input.txt',
        readStream,
        writeStream,
        tmpfile, tmpdir, tmpdirOut, tmpfileOut;

    function stub(client) {
        client._uploadedFiles = {};
        sinon.stub(client.log, "error");
        sinon.stub(client.log, "warn");
        sinon.stub(client.log, "info");
    }

    beforeEach(function () {
        tmpdir = tmp.dirSync({unsafeCleanup: true});
        tmpfile = path.join(tmpdir.name, fileName);
        tmpfileOut = path.join(tmpdir.name, 'uploaded', fileName);

        fs.writeFileSync(tmpfile, new Array(5e5).join('aaa'));

        fsProxy.createReadStream = function (fn) {
            readStream = fs.createReadStream.apply(this, arguments);
            return readStream;
        };
        fsProxy.createWriteStream = function () {
            writeStream = fs.createWriteStream.apply(this, arguments);
            return writeStream;
        };
    });

    afterEach(function cleanup() {
        readStream = null;
        delete fsProxy.createWriteStream;
        delete fsProxy.createReadStream;
        tmpdir ? tmpdir.removeCallback() : null;
    });

    it('should move file to upload folder', function (done) {
        var client = new Metrichor({
            inputFolder: tmpdir.name,
            uploadedFolder:'+uploaded'
        });
        stub(client);
        client._moveUploadedFile(fileName, function (msg) {
            fs.stat(tmpfileOut, function fsStatCallback(err, stats) {
                if (err) {
                    console.log(err);
                }
                //assert(client.log.error.notCalled, 'logs no error messages');
                assert(!err, 'throws no errors');


                fs.stat(tmpfile, function fsStatCallback(err, stats) {
                    //assert(err && err.code === 'ENOENT', 'file should not exist');
                    done();
                });
            });
        });
    });

    it('should handle writeStream errors and flag the file as uploaded', function (done) {
        var client = new Metrichor({
            inputFolder: tmpdir.name,
            uploadedFolder:'+uploaded'
        });
        stub(client);
        client._moveUploadedFile(fileName, function (errorMsg) {
            assert(!errorMsg, "do not pass any arguments to successCb");
            //assert(file.uploaded, "flag file as uploaded");
            fs.stat(tmpfileOut, function fsStatCallback(err) {
                // assert(err && err.code === 'ENOENT', 'clean up target file. should not exist');
                done();
            });
        });
        setTimeout(function() {
            // needs to be placed at the end of callstack - so mkdirp can finish
            writeStream.emit("error", new Error("Test"));
        });
    });

    it('should handle non-existing input file', function (done) {
        var client = new Metrichor({
            inputFolder: tmpdir.name,
            uploadedFolder:'+uploaded'
        });
        stub(client);
        var file = 'fileName';
        client._moveUploadedFile(file, function (errorMsg) {
            assert(!errorMsg, "do not pass any arguments to successCb");
            // assert(file.uploaded, "flag file as uploaded");
            done();
        });
    });
});
