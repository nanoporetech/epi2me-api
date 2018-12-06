import REST from "../../lib/rest-fs";
import * as utils from "../../lib/utils";

const sinon  = require("sinon");
const assert = require("assert");
const bunyan = require("bunyan");

describe("rest-fs.user", () => {
    it("must invoke get with options", () => {
	let ringbuf    = new bunyan.RingBuffer({ limit: 100 });
        let log        = bunyan.createLogger({ name: "log", stream: ringbuf });
	let stub = sinon.stub(utils, "_get").callsFake((uri, options, cb) => {
	    assert.deepEqual(options, { log: log }, "options passed");
	    assert.equal(uri, "user", "url passed");
	    cb();
	});

	let fake = sinon.fake();
	let rest = new REST({log: log});
	assert.doesNotThrow(() => {
	    rest.user(fake);
	});
	assert(fake.calledOnce, "callback invoked");
	stub.restore();
    });

    it("must yield fake local user", () => {
	let ringbuf    = new bunyan.RingBuffer({ limit: 100 });
        let log        = bunyan.createLogger({ name: "log", stream: ringbuf });
	let stub = sinon.stub(utils, "_get").callsFake((uri, options, cb) => {
	    assert.deepEqual(options, { log: log }, "options passed");
	    assert.equal(uri, "user", "url passed");
	    cb();
	});

	let fake = sinon.fake();
	let rest = new REST({log: log, local: true});
	assert.doesNotThrow(() => {
	    rest.user(fake);
	});
	assert(fake.calledOnce, "callback invoked");
	sinon.assert.calledWith(fake, null, {"accounts": [{ id_user_account: "none", number: "NONE", name: "None"}]});
	stub.restore();
    });
});
