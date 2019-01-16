import REST from "../../lib/rest-fs";
import utils from "../../lib/utils";

const sinon  = require("sinon");
const assert = require("assert");
const bunyan = require("bunyan");

describe("rest-fs.bundle_workflow", () => {
    it("must invoke pipe with options", () => {
	let ringbuf = new bunyan.RingBuffer({ limit: 100 });
        let log     = bunyan.createLogger({ name: "log", stream: ringbuf });
	let stub    = sinon.stub(utils, "_pipe").callsFake((uri, filepath, options, cb, progressCb) => {
	    assert.deepEqual(options, { log: log }, "options passed");
	    assert.equal(uri, "workflow/bundle/1234.tar.gz", "url passed");
	    progressCb(0.5);
	    progressCb(1);
	    cb();
	});

	let fake = sinon.fake();
	let progress = sinon.fake();
	let rest = new REST({log: log});
	assert.doesNotThrow(() => {
	    rest.bundle_workflow("1234", "/path/to/1234", fake, progress);
	});
	assert(fake.calledOnce, "callback invoked");
	assert(progress.calledTwice, "progress callback invoked");
	stub.restore();
    });
});
