import REST from "../../lib/rest";
import utils from "../../lib/utils";
import fs from "fs-extra";

const sinon  = require("sinon");
const assert = require("assert");
const bunyan = require("bunyan");

describe('rest.workflows', () => {
    it("must invoke get with options", () => {
	let ringbuf    = new bunyan.RingBuffer({ limit: 100 });
        let log        = bunyan.createLogger({ name: "log", stream: ringbuf });
	let stub = sinon.stub(utils, "_get").callsFake((uri, options, cb) => {
	    assert.deepEqual(options, { log: log });
	    assert.equal(uri, "thing", "url passed");
	    cb(null, {"things":[{"foo":"id"}]});
	});

	let fake = sinon.fake();
	let rest = new REST({log: log});
	assert.doesNotThrow(() => {
	    rest._list("thing", fake);
	});
	assert(fake.calledOnce, "callback invoked");
	sinon.assert.calledWith(fake, null, [{"foo":"id"}]);
	stub.restore();
    });

    it("must catch request failure with structured error", () => {
	let ringbuf    = new bunyan.RingBuffer({ limit: 100 });
        let log        = bunyan.createLogger({ name: "log", stream: ringbuf });
	let stub = sinon.stub(utils, "_get").callsFake((uri, options, cb) => {
	    assert.deepEqual(options, { log: log });
	    assert.equal(uri, "thing", "url passed");
	    cb({error: "request failure"});
	});

	let fake = sinon.fake();
	let rest = new REST({log: log});
	assert.doesNotThrow(() => {
	    rest._list("thing", fake);
	});
	assert(fake.calledOnce, "callback invoked");
	sinon.assert.calledWith(fake, "request failure");
	stub.restore();
    });

    it("must catch request failure with unstructured", () => {
	let ringbuf    = new bunyan.RingBuffer({ limit: 100 });
        let log        = bunyan.createLogger({ name: "log", stream: ringbuf });
	let stub = sinon.stub(utils, "_get").callsFake((uri, options, cb) => {
	    assert.deepEqual(options, { log: log });
	    assert.equal(uri, "thing", "url passed");
	    cb("request failure");
	});

	let fake = sinon.fake();
	let rest = new REST({log: log});
	assert.doesNotThrow(() => {
	    rest._list("thing", fake);
	});
	assert(fake.calledOnce, "callback invoked");
	sinon.assert.calledWith(fake, "request failure");
	stub.restore();
    });
});
