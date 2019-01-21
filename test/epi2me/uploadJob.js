import assert    from "assert";
import sinon     from "sinon";
import bunyan    from "bunyan";
import queue     from "queue-async";
import fs        from "fs-extra";
import { merge } from "lodash";
import AWS       from "aws-sdk";
import EPI2ME    from "../../lib/epi2me";

describe('epi2me.uploadJob', () => {

    const clientFactory = (opts) => {
	return new EPI2ME(merge({
	    url: "https://epi2me-test.local",
	    log: {
		debug: sinon.stub(),
		info:  sinon.stub(),
		warn:  sinon.stub(),
		error: sinon.stub(),
	    }
	}, opts));
    };

    it("should handle bad file object", () => {
	let client = clientFactory();

	sinon.stub(client, "_moveSkippedFile");
	sinon.stub(client, "uploadHandler");

	assert.doesNotThrow(() => {
	    let x = {};
	    x.x = x; // circular
	    client.uploadJob(x);
	});
	assert(client.log.error.args[0][0].match(/could not stringify/));
	assert(client.uploadHandler.calledOnce);
    });

    it("should handle file object with skip and no readCount", () => {
	let client   = clientFactory();
	let callback = sinon.stub();

	sinon.stub(client, "_moveSkippedFile").callsFake((file, cb) => {
	    assert.deepEqual(file, { skip: true });
	    cb();
	});
	sinon.stub(client, "uploadHandler");
	client._stats.upload.enqueued = 10;

	assert.doesNotThrow(() => {
	    let x = { skip: true};
	    client.uploadJob(x, callback);
	});

	assert(callback.calledOnce);
	assert(client._moveSkippedFile.calledOnce);
	assert.equal(client._stats.upload.enqueued, 9);
        assert.equal(client._stats.upload.queueLength, 0);
    });

    it("should handle file object with skip and readCount", () => {
	let client   = clientFactory();
	let callback = sinon.stub();

	sinon.stub(client, "_moveSkippedFile").callsFake((file, cb) => {
	    assert.deepEqual(file, { skip: true, readCount: 5 });
	    cb();
	});
	sinon.stub(client, "uploadHandler");
	client._stats.upload.enqueued = 10;

	assert.doesNotThrow(() => {
	    let x = { skip: true, readCount: 5};
	    client.uploadJob(x, callback);
	});

	assert(callback.calledOnce);
	assert(client._moveSkippedFile.calledOnce);
	assert.equal(client._stats.upload.enqueued, 5);
        assert.equal(client._stats.upload.queueLength, 0);
    });

    it("should handle file object with skip and queueLength", () => {
	let client   = clientFactory();
	let callback = sinon.stub();

	sinon.stub(client, "_moveSkippedFile").callsFake((file, cb) => {
	    assert.deepEqual(file, { skip: true, readCount: 5 });
	    cb();
	});
	sinon.stub(client, "uploadHandler");
	client._stats.upload.enqueued = 10;
	client._stats.upload.queueLength = 10;

	assert.doesNotThrow(() => {
	    let x = { skip: true, readCount: 5};
	    client.uploadJob(x, callback);
	});

	assert(callback.calledOnce);
	assert(client._moveSkippedFile.calledOnce);
	assert.equal(client._stats.upload.enqueued, 5);
        assert.equal(client._stats.upload.queueLength, 5);
    });

    it("should handle callback with error and no tally", () => {
	let clock    = sinon.useFakeTimers();
	let client   = clientFactory();
	let callback = sinon.stub();

	sinon.stub(client, "uploadHandler").callsFake((file, callback) => {
	    callback(new Error("uploadHandler failed"), file);
	});
	delete client._stats.upload.failure;

	assert.doesNotThrow(() => {
	    let x = { id: 72 };
	    client.uploadJob(x, callback);
	    clock.tick(1000);
	});
	assert(client.log.info.args[1][0].match(/uploadHandler failed/), "error message propagated");
	assert(callback.calledOnce, "completion callback fired");

	clock.restore();
    });

    it("should handle callback with error and empty tally", () => {
	let clock    = sinon.useFakeTimers();
	let client   = clientFactory();
	let callback = sinon.stub();

	sinon.stub(client, "uploadHandler").callsFake((file, callback) => {
	    callback(new Error("uploadHandler failed"), file);
	});
	client._stats.upload.failure = {}; // empty error tally

	assert.doesNotThrow(() => {
	    let x = { id: 72 };
	    client.uploadJob(x, callback);
	    clock.tick(1000);
	});
	assert(client.log.info.args[1][0].match(/uploadHandler failed/), "error message propagated");
	assert(callback.calledOnce, "completion callback fired");
	assert.deepEqual(client._stats.upload.failure, {"Error: uploadHandler failed": 1}, "error counted");

	clock.restore();
    });

    it("should handle callback with error and initialised tally", () => {
	let clock    = sinon.useFakeTimers();
	let client   = clientFactory();
	let callback = sinon.stub();

	sinon.stub(client, "uploadHandler").callsFake((file, callback) => {
	    callback(new Error("uploadHandler failed"), file);
	});
	client._stats.upload.failure = {"Error: uploadHandler failed": 7}; // empty error tally

	assert.doesNotThrow(() => {
	    let x = { id: 72 };
	    client.uploadJob(x, callback);
	    clock.tick(1000);
	});
	assert(client.log.info.args[1][0].match(/uploadHandler failed/), "error message propagated");
	assert(callback.calledOnce, "completion callback fired");
	assert.deepEqual(client._stats.upload.failure, {"Error: uploadHandler failed": 8}, "error counted");

	clock.restore();
    });

    it("should handle callback without error", () => {
	let clock    = sinon.useFakeTimers();
	let client   = clientFactory();
	let callback = sinon.stub();

	sinon.stub(client, "uploadHandler").callsFake((file, callback) => {
	    callback(null, file);
	});

	assert.doesNotThrow(() => {
	    let x = { id: 72 };
	    client.uploadJob(x, callback);
	    clock.tick(1000);
	});
	assert(client.log.info.args[1][0].match(/completely done/), "completion info message");
	assert(callback.calledOnce, "completion callback fired");

	clock.restore();
    });

    it("should handle callback without error and with counts", () => {
	let clock    = sinon.useFakeTimers();
	let client   = clientFactory();
	let callback = sinon.stub();

	sinon.stub(client, "uploadHandler").callsFake((file, callback) => {
	    callback(null, file);
	});

	client._stats.upload.queueLength = 8192;
	client._stats.upload.success     = 25;

	assert.doesNotThrow(() => {
	    let x = { id: 72, readCount: 4096 };
	    client.uploadJob(x, callback);
	    clock.tick(1000);
	});
	assert(client.log.info.args[1][0].match(/completely done/), "completion info message");
	assert(callback.calledOnce, "completion callback fired");
	assert.deepEqual(client._stats, {
	    "download": {
		"fail": 0,
		"failure": {},
		"queueLength": 0,
		"success": 0,
		"totalSize": 0,
	    },
	    "upload": {
		"enqueued": -4096,
		"failure": {},
		"queueLength": 4096,
		"success": 4121,
		"totalSize": 0,
	    },
	    "warnings": []
	}, "stats tallied");
	clock.restore();
    });
});
