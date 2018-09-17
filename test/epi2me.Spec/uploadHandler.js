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
let EPI2ME = proxyquire('../../lib/epi2me', {
    'aws-sdk'     : awsProxy,
    'request'     : requestProxy,
    'fs-extra' : fsProxy
}).default;

describe('uploadHandler', function () {

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
	    readStream = null;
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

	setTimeout(() => { readStream.emit("error"); }, 10); // fire a readstream error at some point after the readstream created

        client.uploadHandler({ name: tmpfile }, function (msg) {
//	    console.log("ERROR HANDLER FIRED", msg);
            assert(msg.match(/error in upload readstream/), 'unexpected error message format: ' + msg);
            done();
        });
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
