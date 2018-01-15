"use strict";
const proxyquire     = require('proxyquire');
const assert         = require("assert");
const sinon          = require("sinon");
const path           = require("path");
const tmp            = require('tmp');
const queue          = require('queue-async');
const fs             = require('fs');
let requestProxy   = {};
let awsProxy       = {};
let fsProxy        = {};
proxyquire('../../lib/utils', {
    'request' : requestProxy
});
let EPI2ME = proxyquire('../../lib/metrichor', {
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
        sinon.stub(client.log, "debug");
    }

    beforeEach(function () {
        tmpdir = tmp.dirSync({unsafeCleanup: true});
        fs.writeFile(path.join(tmpdir.name, tmpfile));
    });

    afterEach(function cleanup() {
        readStream = null;
    });

    it('should open readStream', function (done) {
        var client = new EPI2ME({
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
        client.uploadHandler({name: tmpfile}, function (error) {
            assert(typeof error === 'undefined', 'unexpected error message: ' + error);
            done();
        });

    });

    it('should handle read stream errors', function (done) {
        fsProxy.createReadStream = function () {
            readStream = fs.createReadStream.apply(this, arguments);
            return readStream;
        };
        var client = new EPI2ME({
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
        client.uploadHandler({ name: tmpfile }, function (msg) {
            assert(msg.match(/error in upload readstream/), 'unexpected error message format: ' + msg);
            setTimeout(done, 10);
        });
        readStream.emit("error");
    });

    it('should handle bad file name - ENOENT', function (done) {
        var client = new EPI2ME({
            inputFolder: tmpdir.name,
        });
        stub(client);
        client.uploadHandler({name: 'bad file name'}, function (msg) {
            assert(typeof msg !== 'undefined', 'failure');
            done();
        });
    });
});
