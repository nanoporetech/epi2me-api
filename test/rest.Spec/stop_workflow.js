import REST from "../../lib/rest";
import utils from "../../lib/utils";

const sinon  = require("sinon");
const assert = require("assert");
const bunyan = require("bunyan");

describe("rest.stop_workflow", () => {
    it("must invoke put with details", () => {
	let ringbuf    = new bunyan.RingBuffer({ limit: 100 });
        let log        = bunyan.createLogger({ name: "log", stream: ringbuf });
	let stub = sinon.stub(utils, "_put").callsFake((uri, id, payload, options, cb) => {
	    assert.equal(uri, "workflow_instance/stop", "type passed");
	    assert.equal(id, 123456, "id passed");
	    assert.equal(payload, null, "payload passed");
	    assert.ok(options.log instanceof bunyan, "options off");
	    cb();
	});
	let fake = sinon.fake();
	let rest = new REST({log: log});
	assert.doesNotThrow(() => {
	    rest.stop_workflow("123456", fake);
	});
	assert(fake.calledOnce, "callback invoked");
	stub.restore();
    });
});
