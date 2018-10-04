import REST from "../../lib/rest";
import utils from "../../lib/utils";

const sinon  = require("sinon");
const assert = require("assert");
const bunyan = require("bunyan");

describe("rest.instance_token", () => {
    it("must invoke post with options", () => {
	let ringbuf    = new bunyan.RingBuffer({ limit: 100 });
        let log        = bunyan.createLogger({ name: "log", stream: ringbuf });
	let stub = sinon.stub(utils, "_post").callsFake((uri, obj, options, cb) => {
	    assert.deepEqual(obj, { id_workflow_instance: "12345" }, "obj passed");
	    assert.deepEqual(options, { log: log, legacy_form: true }, "options passed");
	    assert.equal(uri, "token", "url passed");
	    cb();
	});

	let fake = sinon.fake();
	let rest = new REST({log: log});
	assert.doesNotThrow(() => {
	    rest.instance_token("12345", fake);
	});
	assert(fake.calledOnce, "callback invoked");
	stub.restore();
    });
});
