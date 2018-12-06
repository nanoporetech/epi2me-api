import REST from "../../lib/rest-fs";
import * as utils from "../../lib/utils";

const sinon  = require("sinon");
const assert = require("assert");
const bunyan = require("bunyan");

describe('rest-fs._list', () => {
    let stubs = [];
    let ringbuf;
    let log;
    beforeEach(() => {
	ringbuf = new bunyan.RingBuffer({ limit: 100 });
        log     = bunyan.createLogger({ name: "log", stream: ringbuf });
    });
    afterEach(() => {
	stubs.forEach((o) => { o.restore(); });
    });

    it("must invoke get with options", () => {
	let stub = sinon.stub(utils, "_get").callsFake((uri, options, cb) => {
	    assert.deepEqual(options, { log: log });
	    assert.equal(uri, "thing", "url passed");
	    cb(null, {"things":[{"foo":"id"}]});
	});

	stubs.push(stub);
	let fake = sinon.fake();
	let rest = new REST({log: log});
	assert.doesNotThrow(() => {
	    rest._list("thing", fake);
	}, Error);
	assert(fake.calledOnce, "callback invoked");
	sinon.assert.calledWith(fake, null, [{"foo":"id"}]);
    });

    it("must catch request failure with structured error", () => {
	let stub = sinon.stub(utils, "_get").callsFake((uri, options, cb) => {
	    assert.deepEqual(options, { log: log });
	    assert.equal(uri, "thing", "url passed");
	    cb({error: "request failure"});
	});
	stubs.push(stub);

	let fake = sinon.fake();
	let rest = new REST({log: log});
	assert.doesNotThrow(() => {
	    rest._list("thing", fake);
	});
	assert(fake.calledOnce, "callback invoked");
	sinon.assert.calledWith(fake, "request failure");
    });

    it("must catch request failure with unstructured", () => {
	let stub = sinon.stub(utils, "_get").callsFake((uri, options, cb) => {
	    assert.deepEqual(options, { log: log });
	    assert.equal(uri, "thing", "url passed");
	    cb("request failure");
	});
	stubs.push(stub);

	let fake = sinon.fake();
	let rest = new REST({log: log});
	assert.doesNotThrow(() => {
	    rest._list("thing", fake);
	});
	assert(fake.calledOnce, "callback invoked");
	sinon.assert.calledWith(fake, "request failure");
    });
});
