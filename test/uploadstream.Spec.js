var proxyquire     = require('proxyquire');
var assert         = require("assert");
var sinon          = require("sinon");
var path           = require("path");
var tmp            = require('tmp');
var queue          = require('queue-async');
var fs             = require('fs');
var requestProxy   = {};
var awsProxy   = {};
var fsProxy        = {};
var mkdirpProxy    = {};
var Metrichor      = proxyquire('../lib/metrichor', {
    'aws-sdk'     : awsProxy,
    'request'     : requestProxy,
    'graceful-fs' : fsProxy,
    'mkdirp'      : mkdirpProxy
});

describe('.uploadHandler method', function () {

    var tmpfile = 'tmpfile.txt', tmpdir, readStream;

    function stub(client) {
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
        delete fsProxy.createWriteStream;
        tmpdir ? tmpdir.removeCallback() : null;
    });

    it('should open readStream', function (done) {
        var client = new Metrichor({
            inputFolder: tmpdir.name
        });
        stub(client);
        client.sessionedS3 = function (cb) {
            cb(null, {
                upload: function (params, options, cb) {
                    cb();
                    assert(params)
                }
            });
        };
        client.uploadComplete = function (objectId, item, successCb) {
            successCb();
        };
        client.uploadHandler(tmpfile, function (msg) {
            assert(typeof msg === 'undefined', 'success');
            done();
        });

    });

    it('should handle s3 error', function (done) {
        var client = new Metrichor({
            inputFolder: tmpdir.name
        });
        stub(client);
        client.sessionedS3 = function (cb) {
            cb("error");
        };
        client.uploadHandler(tmpfile, function (msg) {
            assert(client.log.warn.calledOnce, "should log error message");
            assert(typeof msg !== 'undefined', 'failure');
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
        client.sessionedS3 = function (cb) {
            cb(null, {
                upload: function (params, options, cb) {
                    cb();
                }
            });
        };
        client.uploadHandler(tmpfile, function (msg) {
            assert.equal(msg, "upload exception", 'failure');
            setTimeout(done, 10);
        });
        readStream.emit("error");

    });

    it('should handle bad file name - ENOENT', function (done) {
        var client = new Metrichor({
            inputFolder: tmpdir.name
        });
        stub(client);
        client.sessionedS3 = function (cb) {
            cb();
        };
        client.uploadHandler('bad file name', function (msg) {
            assert(typeof msg !== 'undefined', 'failure');
            done();
        });
    });
});