import EPI2ME from "../../lib/epi2me";
import utils from "../../lib/utils";

const assert = require("assert");
const sinon  = require("sinon");
const bunyan = require("bunyan");
const tmp    = require("tmp");
const fs     = require("fs-extra");
const path   = require("path");

describe('epi2me-api', () => {

    describe('processMessage', () => {
        it('should handle bad message json', (done) => {
            let ringbuf = new bunyan.RingBuffer({ limit: 100 });
	    let log     = bunyan.createLogger({ name: "log", stream: ringbuf });
            let client  = new EPI2ME({log: log, downloadMode: "telemetry"});
            let stub    = sinon.stub(client, "deleteMessage");
            let msg     = { Body: '{message: body}' };

	    sinon.spy(log, "error");
	    assert.doesNotThrow(() => {
		client.processMessage(msg, () => {});
	    });

            sinon.assert.calledWith(stub, msg);
            assert(log.error.calledOnce);
	    stub.restore();
	    done();
        });

        it('should parse message json', (done) => {
            let ringbuf = new bunyan.RingBuffer({ limit: 100 });
	    let log     = bunyan.createLogger({ name: "log", stream: ringbuf });
            let client  = new EPI2ME({log: log, downloadMode: "telemetry"});

	    sinon.spy(log, "warn");
            let stub = sinon.stub(client,"sessionedS3").callsFake((cb) => {
                cb('error message'); // hmm. this is invalid!
            });

	    assert.doesNotThrow(() => {
		client.processMessage({
                    Body: '{"message": "body"}'
		}, () => {});
	    });
            assert(log.warn.calledOnce); // No path
	    done();
        });

	it('should not double-prepend drive letters MC-6850', (done) => {
            let ringbuf = new bunyan.RingBuffer({ limit: 100 });
	    let log     = bunyan.createLogger({ name: "log", stream: ringbuf });
	    let tmpDir  = tmp.dirSync();
            let client  = new EPI2ME({
		log: log,
		filter: "on",
		downloadMode: "data+telemetry",
		outputFolder: tmpDir.name
	    });
            let stub = sinon.stub(client,"sessionedS3").callsFake(() => {
                return 's3 object';
            });

	    let stub2 = sinon.stub(client, "_initiateDownloadStream").callsFake((s3, messageBody, message, outputFile, completeCb) => {
		completeCb();
	    });

            let stub3 = sinon.stub(fs, "mkdirpSync").callsFake();

	    assert.doesNotThrow(() => {
		client.processMessage({
                    Body: JSON.stringify({
			path: "OUTPUT-UUID/INPUT-UUID/9999/999999/component-2/OK/pass/CLASSIFIED/fastq_runid_shasum_15.fastq/fastq_runid_shasum_15.fastq",
			telemetry: {
			    hints: {
				folder: "OK/pass/CLASSIFIED",
			    }
			}
		    })
		}, () => {});
	    });

	    assert.equal(stub2.args[0][3], path.join(tmpDir.name, "OK/PASS/CLASSIFIED/fastq_runid_shasum_15.fastq"));
	    tmpDir.removeCallback();
	    stub.restore();
	    stub2.restore();
	    stub3.restore();
	    done();
	});

	it('should retain output folder when no telemetry', (done) => {
            let ringbuf = new bunyan.RingBuffer({ limit: 100 });
	    let log     = bunyan.createLogger({ name: "log", stream: ringbuf });
	    let tmpDir  = tmp.dirSync();
            let client  = new EPI2ME({
		log: log,
		filter: "on",
		downloadMode: "data+telemetry",
		outputFolder: tmpDir.name
	    });
            let stub = sinon.stub(client,"sessionedS3").callsFake(() => {
                return 's3 object';
            });

	    let stub2 = sinon.stub(client, "_initiateDownloadStream").callsFake((s3, messageBody, message, outputFile, completeCb) => {
		completeCb();
	    });

            let stub3 = sinon.stub(fs, "mkdirpSync").callsFake();

	    assert.doesNotThrow(() => {
		client.processMessage({
                    Body: JSON.stringify({
			path: "OUTPUT-UUID/INPUT-UUID/9999/999999/component-2/OK/pass/CLASSIFIED/fastq_runid_shasum_15.fastq/fastq_runid_shasum_15.fastq",
		    })
		}, () => {});
	    });

	    assert.equal(stub2.args[0][3], path.join(tmpDir.name, "fastq_runid_shasum_15.fastq"));
	    tmpDir.removeCallback();
	    stub.restore();
	    stub2.restore();
	    stub3.restore();
	    done();
	});

    	it('should retain output folder when filtering off', (done) => {
            let ringbuf = new bunyan.RingBuffer({ limit: 100 });
	    let log     = bunyan.createLogger({ name: "log", stream: ringbuf });
	    let tmpDir  = tmp.dirSync();
            let client  = new EPI2ME({
		log: log,
		filter: "off",
		downloadMode: "data+telemetry",
		outputFolder: tmpDir.name
	    });
            let stub = sinon.stub(client,"sessionedS3").callsFake(() => {
                return 's3 object';
            });

	    let stub2 = sinon.stub(client, "_initiateDownloadStream").callsFake((s3, messageBody, message, outputFile, completeCb) => {
		completeCb();
	    });

            let stub3 = sinon.stub(fs, "mkdirpSync").callsFake();

	    assert.doesNotThrow(() => {
		client.processMessage({
                    Body: JSON.stringify({
			path: "OUTPUT-UUID/INPUT-UUID/9999/999999/component-2/OK/pass/CLASSIFIED/fastq_runid_shasum_15.fastq/fastq_runid_shasum_15.fastq",
			telemetry: {
			    hints: {
				folder: "OK/pass/CLASSIFIED",
			    }
			}
		    })
		}, () => {});
	    });

	    assert.equal(stub2.args[0][3], path.join(tmpDir.name, "fastq_runid_shasum_15.fastq"));
	    tmpDir.removeCallback();
	    stub.restore();
	    stub2.restore();
	    stub3.restore();
	    done();
	});

    	it('should handle fast5 filetype behaviour', (done) => {
            let ringbuf = new bunyan.RingBuffer({ limit: 100 });
	    let log     = bunyan.createLogger({ name: "log", stream: ringbuf });
	    let tmpDir  = tmp.dirSync();
            let client  = new EPI2ME({
		log: log,
		filter: "off",
		downloadMode: "data+telemetry",
		outputFolder: tmpDir.name,
		filetype: ".fast5"
	    });
            let stub = sinon.stub(client,"sessionedS3").callsFake(() => {
                return 's3 object';
            });

	    let stub2 = sinon.stub(client, "_initiateDownloadStream").callsFake((s3, messageBody, message, outputFile, completeCb) => {
		completeCb();
	    });

            let stub3 = sinon.stub(fs, "mkdirpSync").callsFake();

	    let stub4 = sinon.stub(utils, "findSuitableBatchIn").callsFake((folder_in) => {
		return "/folder_out";
	    });

	    assert.doesNotThrow(() => {
		client.processMessage({
                    Body: JSON.stringify({
			path: "OUTPUT-UUID/INPUT-UUID/9999/999999/component-2/OK/pass/CLASSIFIED/fastq_runid_shasum_15.fastq/fastq_runid_shasum_15.fastq",
			telemetry: {
			    hints: {
				folder: "OK/pass/CLASSIFIED",
			    }
			}
		    })
		}, () => {});
	    });

	    assert.equal(stub2.args[0][3], path.join("/folder_out", "fastq_runid_shasum_15.fastq"));
	    tmpDir.removeCallback();
	    stub.restore();
	    stub2.restore();
	    stub3.restore();
	    stub4.restore();
	    done();
	});
    });
});
