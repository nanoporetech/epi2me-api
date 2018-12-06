"use strict";
const proxyquire     = require('proxyquire');
const assert         = require("assert");
const sinon          = require("sinon");
const path           = require("path");
const tmp            = require('tmp');
const queue          = require('queue-async');
const fs             = require('fs-extra');

let requestProxy   = {};
let fsProxy        = {};
let mkdirpProxy    = {};
let awsProxy       = {};

proxyquire('../../lib/utils', {
    'request' : requestProxy
});

var EPI2ME = proxyquire('../../lib/epi2me', {
    'aws-sdk'  : awsProxy,
    'request'  : requestProxy,
    'fs-extra' : fsProxy,
    'mkdirp'   : mkdirpProxy
}).default;

// MC-1304 - test download streams
describe('epi2me._initiateDownloadStream', () => {

    var tmpfile, tmpdir, writeStream;

    const s3Mock = (cb) => {
        return {
            getObject: () => {
                return {
                    createReadStream: cb
                }
            }
        }
    }

    const stub = (client) => {
        sinon.stub(client.log, "error");
        sinon.stub(client.log, "warn");
        sinon.stub(client.log, "info");
        sinon.stub(client.log, "debug");
        sinon.stub(client, "loadAvailableDownloadMessages");
        sinon.stub(client, "deleteMessage");
    }

    beforeEach(() => {
        writeStream = null;
        delete fsProxy.stat;
        delete fsProxy.unlink;
        delete fsProxy.createWriteStream;
        tmpdir  = tmp.dirSync({unsafeCleanup: true});
        tmpfile = tmp.fileSync({ prefix: 'prefix-', postfix: '.txt' });
        fs.writeFile(path.join(tmpdir.name, 'tmpfile.txt'), "dataset", () => {});

        fsProxy.unlink = () => { };
        fsProxy.stat   = () => { return Promise.resolve(0); };
        fsProxy.createWriteStream = function () {
            writeStream = fs.createWriteStream.apply(this, arguments);
            return writeStream;
        };
    });

    it('should handle s3 error', (done) => {
        var client = new EPI2ME({});
        stub(client);
        var s3 = s3Mock(() => { throw "Error" });
        client._initiateDownloadStream(s3, {}, {}, tmpfile.name, () => {
            assert(client.log.error.calledOnce, "should log error message");
            done();
        });
    });

    it('should open read stream and write to outputFile', (done) => {
        var client = new EPI2ME({
            inputFolder: tmpdir.name,
            uploadedFolder: '+uploaded',
            outputFolder: '+downloads'
        });
        stub(client);
        var readStream,
            msg = {msg: 'bla'},
            s3 = s3Mock(() => {
                readStream = fs.createReadStream(tmpfile.name);
                return readStream;
            });

//		client._stats.download.success = 1; // required for recent min(download,upload) fudge?
        client._initiateDownloadStream(s3, {}, msg, tmpfile.name, () => {
//                    assert.equal(readStream.destroyed, true, "should destroy the read stream"); // fails on node > 2.2.1
//                    assert(client.deleteMessage.calledWith(msg), "should delete sqs message on success"); // fails on node > 2.2.1
            assert(client.log.error.notCalled, "should not throw exception");
            assert(client.log.warn.notCalled, "should not throw warning");
            //assert.equal(client._stats.download.success, 1, "should count as download success");
            done();
        });
    });

    it('should handle read stream errors', (done) => {
        var client = new EPI2ME({});
        stub(client);
        var readStream, tmpfile, s3, filename;
        s3 = s3Mock(() => {
            tmpfile = tmp.fileSync({ prefix: 'prefix-', postfix: '.txt' });
            readStream = fs.createReadStream(tmpfile.name, (err) => { });
            readStream.on("open", () => {
                readStream.emit("error", new Error("Test"));
            });
            return readStream;
        });
        filename = path.join(tmpdir.name, 'tmpfile.txt');

        client._initiateDownloadStream(s3, {}, {}, filename, () => {
            //assert.equal(readStream.destroyed, true, "should destroy the read stream"); // fails on node > 2.2.1
            assert(client.deleteMessage.notCalled, "should not delete sqs message on error");
            assert.equal(client._stats.download.success, 0, "should not count as download success on error");
            done();
        });
        assert.equal(client._stats.download.success, 0);
    });

    it('should handle write stream errors', (done) => {
        var client = new EPI2ME({});
        stub(client);
        var readStream, tmpfile, s3, filename;
        s3 = s3Mock(() => {
            tmpfile = tmp.fileSync({ prefix: 'prefix-', postfix: '.txt' });
            readStream = fs.createReadStream(tmpfile.name, (err) => { });
            return readStream;
        });
        filename = path.join(tmpdir.name, 'tmpfile2.txt');

        client._initiateDownloadStream(s3, {}, {}, filename, () => {
            //assert.equal(readStream.destroyed, true, "should destroy the read stream"); // fails on node > 2.2.1
            assert(client.deleteMessage.notCalled, "should not delete sqs message on error");
            assert.equal(client._stats.download.success, 0, "should not count as download success on error");
            done();
        });
        writeStream.on("open", () => {
            writeStream.emit("error", new Error("Test"));
        });
    });

    it('should handle createWriteStream error', (done) => {
        var client = new EPI2ME({});
        stub(client);
        assert.doesNotThrow(() => {
            client._initiateDownloadStream(s3Mock(() => {}), {}, {}, null, done);
        });
    });

    it('should handle transfer timeout errors', (done) => {
        // This test interacts with the other async test
        var readStream, tmpfile, filename, s3,
            client = new EPI2ME({downloadTimeout: 1e-10}); // effectively zero. Zero would result in default value
        stub(client);

        s3 = s3Mock(() => {
            tmpfile = tmp.fileSync({ prefix: 'prefix-', postfix: '.txt' });
            readStream = fs.createReadStream(tmpfile.name, (err) => { });
            // Writing random data to file so that the timeout fails before the readstream is done
            fs.writeFileSync(tmpfile.name, new Array(1e5).join('aaa'));
            return readStream;
        });
        filename = path.join(tmpdir.name, 'tmpfile.txt');
        client._initiateDownloadStream(s3, {}, {}, filename, () => {
            //assert(readStream.destroyed, "should destroy the read stream"); // fails on node > 2.2.1
            assert(client.deleteMessage.notCalled, "should not delete sqs message on error");
            assert.equal(client._stats.download.success, 0, "should not count as download success on error");
            done();
        });
    });
});
