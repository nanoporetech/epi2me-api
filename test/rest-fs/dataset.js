import REST from "../../lib/rest-fs";

const sinon  = require("sinon");
const assert = require("assert");
const bunyan = require("bunyan");

describe("rest-fs.dataset", () => {
    it("must invoke read with id", () => {
	let ringbuf    = new bunyan.RingBuffer({ limit: 100 });
        let log        = bunyan.createLogger({ name: "log", stream: ringbuf });
	let stub = sinon.stub(REST.prototype, "_read").callsFake((type, id, cb) => {
	    assert.equal(type, "dataset", "type passed");
	    assert.equal(id, 27, "id passed");
	    cb();
	});
	let fake = sinon.fake();
	let rest = new REST({log: log});
	assert.doesNotThrow(() => {
	    rest.dataset(27, fake);
	});
	assert(fake.calledOnce, "callback invoked");
	stub.restore();
    });
});
