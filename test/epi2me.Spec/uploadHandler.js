import EPI2ME from "../../lib/epi2me";

const assert         = require("assert");
const sinon          = require("sinon");
const path           = require("path");
const tmp            = require('tmp');
const queue          = require('queue-async');
const fs             = require('fs-extra');

describe('epi2me.uploadHandler', function () {

    var tmpfile = 'tmpfile.txt', tmpdir;

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
                upload: (params, options, cb) => {
                    cb();
                    assert(params);
		    return {
			on: () => {
			    // support for httpUploadProgress
			}
		    };
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
/*
    it('should handle read stream errors', function (done) {
	let readStream;
	let crso = fs.createReadStream;
        let crs = sinon.stub("fs", "createReadStream").callsFake(() => {
            readStream = crso.apply(this, arguments);
            return readStream;
        });
        var client = new EPI2ME({
            inputFolder: tmpdir.name
        });
        stub(client);
        let ss3 = sinon.stub(client, "sessionedS3").callsFake(() => {
            return {
                upload: (params, options, cb) => {
                    cb();
                    assert(params);
		    return {
			on: () => {
			    // support for httpUploadProgress
			}
		    };
                }
            };
        });

	setTimeout(() => { readStream.emit("error"); }, 10); // fire a readstream error at some point after the readstream created
        client.uploadHandler({ name: tmpfile }, (msg) => {
            assert(msg.match(/error in upload readstream/), 'unexpected error message format: ' + msg);
            done();
        });
	ss3.restore();
	crs.restore();
    });
*/
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
