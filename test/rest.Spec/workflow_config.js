import REST from "../../lib/rest";
import utils from "../../lib/utils";

const sinon  = require("sinon");
const assert = require("assert");
const bunyan = require("bunyan");

describe("rest.workflow_config", () => {
    it("must invoke get with options", () => {
	let ringbuf    = new bunyan.RingBuffer({ limit: 100 });
        let log        = bunyan.createLogger({ name: "log", stream: ringbuf });
	let stub = sinon.stub(utils, "_get").callsFake((uri, options, cb) => {
	    assert.deepEqual(options, { log: log }, "options passed");
	    assert.equal(uri, "workflow/config/1234", "url passed");
	    cb();
	});

	let fake = sinon.fake();
	let rest = new REST({log: log});
	assert.doesNotThrow(() => {
	    rest.workflow_config("1234", fake);
	});
	assert(fake.calledOnce, "callback invoked");
	stub.restore();
    });
});
