import REST from "../../lib/rest";

const sinon  = require("sinon");
const assert = require("assert");
const bunyan = require("bunyan");

describe("rest.attributes", () => {
    it("must invoke list", () => {
	let ringbuf    = new bunyan.RingBuffer({ limit: 100 });
        let log        = bunyan.createLogger({ name: "log", stream: ringbuf });
	let stub = sinon.stub(REST.prototype, "_list").callsFake((uri, cb) => {
	    assert.equal(uri, "attribute", "default uri");
	    cb();
	});

	let fake = sinon.fake();
	let rest = new REST({log: log});
	assert.doesNotThrow(() => {
	    rest.attributes(fake);
	});
	assert(fake.calledOnce, "callback invoked");
	stub.restore();
    });
});
