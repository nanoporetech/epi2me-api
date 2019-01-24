import REST from "../../src/rest";
import * as utils from "../../src/utils";

const sinon  = require("sinon");
const assert = require("assert");
const bunyan = require("bunyan");

describe("rest.fetchContent", () => {
    it("must invoke get with options", () => {
	let ringbuf    = new bunyan.RingBuffer({ limit: 100 });
        let log        = bunyan.createLogger({ name: "log", stream: ringbuf });
	let stub = sinon.stub(utils, "_get").callsFake((uri, options, cb) => {
	    assert.deepEqual(options, {skip_url_mangle: true, log: log}, "extended options");
	    assert.equal(uri, "/a/uri", "url passed");
	    cb();
	});

	let fake = sinon.fake();
	let rest = new REST({log: log});
	assert.doesNotThrow(() => {
	    rest.fetchContent("/a/uri", fake);
	});
	assert(fake.calledOnce, "callback invoked");
	stub.restore();
    });
});
