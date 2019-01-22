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

    it("should callback immediately if null queued", () => {
	let client = clientFactory();
	let callback = sinon.stub();
	let downloadAvailable = sinon.stub(client, "downloadAvailable");

	assert.doesNotThrow(() => {
	    client.downloadWork(null, callback);
	});
	assert(callback.calledOnce, "callback fired");
	assert(downloadAvailable.notCalled, "downloadAvailable not fired");
    });

    it("should callback immediately if undefined queued", () => {
	let client = clientFactory();
	let callback = sinon.stub();
	let downloadAvailable = sinon.stub(client, "downloadAvailable");

	assert.doesNotThrow(() => {
	    client.downloadWork(undefined, callback);
	});
	assert(callback.calledOnce, "callback fired");
	assert(downloadAvailable.notCalled, "downloadAvailable not fired");
    });

    it("should callback immediately if nothing queued", () => {
	let client = clientFactory();
	let callback = sinon.stub();
	let downloadAvailable = sinon.stub(client, "downloadAvailable");

	assert.doesNotThrow(() => {
	    client.downloadWork(0, callback);
	});
	assert(callback.calledOnce, "callback fired");
	assert(downloadAvailable.notCalled, "downloadAvailable not fired");
    });

    it("should continue if no callback supplied", () => {
	let client = clientFactory();
	let downloadAvailable = sinon.stub(client, "downloadAvailable").callsFake((callback) => {
	    assert.equal(callback(), undefined, "function return value"); // very limited value here
	    assert.ok(callback instanceof Function, "function provided"); // can't really test the contents
	});

	assert.doesNotThrow(() => {
	    client.downloadWork(1);
	});

	assert(downloadAvailable.calledOnce, "downloadAvailable not fired");
    });

});
