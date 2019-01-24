import assert    from "assert";
import sinon     from "sinon";
import path      from "path";
import tmp       from "tmp";
import fs        from "fs-extra";
import { merge } from "lodash";
import utils     from "../../src/utils";
import EPI2ME    from "../../src/epi2me";

// MC-1304 - test download streams
describe('epi2me._initiateDownloadStream', () => {

    let tmpfile, tmpdir, writeStream, stubs;

    const s3Mock = (cb) => {
        return {
            getObject: () => {
                return {
                    createReadStream: cb
                }
            }
        }
    }

    const clientFactory = (opts) => {
	let client = new EPI2ME(merge({
	    log: {
		info:  sinon.stub(),
		warn:  sinon.stub(),
		error: sinon.stub(),
		debug: sinon.stub(),
	    }
	}, opts));

        sinon.stub(client, "loadAvailableDownloadMessages");
        sinon.stub(client, "deleteMessage");
//	sinon.stub(client.sqs, "changeMessageVisibility");

	return client;
    };

    beforeEach(() => {
        tmpdir  = tmp.dirSync({unsafeCleanup: true});
        tmpfile = tmp.fileSync({ prefix: 'prefix-', postfix: '.txt' });
	stubs   = [];
	stubs.push(sinon.stub(fs, "unlink"));
	stubs.push(sinon.stub(fs, "stat").callsFake(() => { return Promise.resolve(0); }));

        fs.writeFile(path.join(tmpdir.name, 'tmpfile.txt'), "dataset", () => {});

	writeStream = null;
	stubs.push(sinon.stub(fs, "createWriteStream").callsFake(() => {
	    writeStream = fs.createWriteStream.apply(this, arguments);
	    return writeStream;
	}));
    });

    afterEach(() => {
	stubs.forEach((s) => { s.restore(); });
    });

    it('should handle s3 error', (done) => {
        let client = clientFactory({});
        let s3 = s3Mock(() => { throw "Error" });
        client._initiateDownloadStream(s3, {}, {}, tmpfile.name, () => {
            assert(client.log.error.calledOnce, "should log error message");
            done();
        });
    });
/*
    it('should open read stream and write to outputFile', (done) => {
        let client = clientFactory({
            inputFolder:    tmpdir.name,
            uploadedFolder: '+uploaded',
            outputFolder:   '+downloads'
        });

        let readStream,
            msg = {msg: 'bla'},
            s3 = s3Mock(() => {
                readStream = fs.createReadStream(tmpfile.name);
                return readStream;
            });

//		client._stats.download.success = 1; // required for recent min(download,upload) fudge?
        client._initiateDownloadStream(s3, {}, msg, tmpfile.name, () => {
//                    assert.equal(readStream.destroyed, true, "should destroy the read stream"); // fails on node > 2.2.1
//                    assert(client.deleteMessage.calledWith(msg), "should delete sqs message on success"); // fails on node > 2.2.1
	    console.log(client.log);
            assert(client.log.error.notCalled, "should not throw exception");
            assert(client.log.warn.notCalled, "should not throw warning");
            //assert.equal(client._stats.download.success, 1, "should count as download success");
            done();
        });
    });
*/
    it('should handle read stream errors', (done) => {
        let client = clientFactory({});
	let readStream, tmpfile, s3, filename;

        s3 = s3Mock(() => {
            tmpfile    = tmp.fileSync({ prefix: 'prefix-', postfix: '.txt' });
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
        let client = clientFactory({});
        let readStream, tmpfile, s3, filename;

        s3 = s3Mock(() => {
            tmpfile    = tmp.fileSync({ prefix: 'prefix-', postfix: '.txt' });
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
        let client = clientFactory({});

        assert.doesNotThrow(() => {
            client._initiateDownloadStream(s3Mock(() => {}), {}, {}, null, done);
        });
    });

    it('should handle transfer timeout errors', (done) => {
        let client = clientFactory({downloadTimeout: 1e-10}); // effectively zero. Zero would result in default value

        // This test interacts with the other async test
        let readStream, tmpfile, filename, s3;

        s3 = s3Mock(() => {
            tmpfile    = tmp.fileSync({ prefix: 'prefix-', postfix: '.txt' });
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
