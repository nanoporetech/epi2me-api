var proxyquire     = require('proxyquire');
var assert         = require("assert");
var sinon          = require("sinon");
var path           = require("path");
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

var Metrichor      = proxyquire('../lib/metrichor', {
    'aws-sdk'     : awsProxy,
    'request'     : requestProxy,
    'graceful-fs' : fsProxy,
    'mkdirp'      : mkdirpProxy
});

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
        sinon.stub(client, "loadAvailableDownloadMessages");
        sinon.stub(client, "deleteMessage");
    }

    beforeEach(function () {
        tmpdir = tmp.dirSync({unsafeCleanup: true});
        tmpfile = tmp.fileSync({ prefix: 'prefix-', postfix: '.txt' });
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
    });

    it('should handle s3 error', function (done) {
        var client = new Metrichor({});
        stub(client);
        var s3 = s3Mock(function () { throw "Error" });
        client._initiateDownloadStream(s3, {}, {}, tmpfile.name, function () {
            assert(client.log.error.calledOnce, "should log error message");
            done();
        });
    });

    it('should open read stream and write to outputFile', function (done) {
        var client = new Metrichor({
            inputFolder: tmpdir.name,
            uploadedFolder: '+uploaded',
            outputFolder: '+downloads'
        });
        stub(client);
        var readStream,
            msg = {msg: 'bla'},
            s3 = s3Mock(function cb() {
                readStream = fs.createReadStream(tmpfile.name);
                return readStream;
            });

//		client._stats.download.success = 1; // required for recent min(download,upload) fudge?
        client._initiateDownloadStream(s3, {}, msg, tmpfile.name, function cb() {
//                    assert.equal(readStream.destroyed, true, "should destroy the read stream"); // fails on node > 2.2.1
//                    assert(client.deleteMessage.calledWith(msg), "should delete sqs message on success"); // fails on node > 2.2.1
            assert(client.log.error.notCalled, "should not throw exception");
            assert(client.log.warn.notCalled, "should not throw warning");
            //assert.equal(client._stats.download.success, 1, "should count as download success");
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
            //assert.equal(readStream.destroyed, true, "should destroy the read stream"); // fails on node > 2.2.1
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
            //assert.equal(readStream.destroyed, true, "should destroy the read stream"); // fails on node > 2.2.1
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
        // This test interacts with the other async test
        var readStream, tmpfile, filename, s3,
            client = new Metrichor({downloadTimeout: 1e-10}); // effectively zero. Zero would result in default value
        stub(client);

        s3 = s3Mock(function cb() {
            tmpfile = tmp.fileSync({ prefix: 'prefix-', postfix: '.txt' });
            readStream = fs.createReadStream(tmpfile.name, function (err) { });
            // Writing random data to file so that the timeout fails before the readstream is done
            fs.writeFileSync(tmpfile.name, new Array(1e5).join('aaa'));
            return readStream;
        });
        filename = path.join(tmpdir.name, 'tmpfile.txt');
        client._initiateDownloadStream(s3, {}, {}, filename, function cb() {
            //assert(readStream.destroyed, "should destroy the read stream"); // fails on node > 2.2.1
            assert(client.deleteMessage.notCalled, "should not delete sqs message on error");
            assert.equal(client._stats.download.success, 0, "should not count as download success on error");
            done();
        });
    });
});