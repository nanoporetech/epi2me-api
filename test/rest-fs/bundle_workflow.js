import REST   from "../../lib/rest-fs";
import utils  from "../../lib/utils";
import sinon  from "sinon";
import assert from "assert";
import bunyan from "bunyan";
import tmp    from "tmp";

describe("rest-fs.bundle_workflow", () => {
    let rest, log, ringbuf;

    beforeEach(() => {
	ringbuf = new bunyan.RingBuffer({ limit: 100 });
        log     = bunyan.createLogger({ name: "log", stream: ringbuf });
	rest    = new REST({
	    log:   log,
	    local: true,
	    url:   tmp.dirSync().name,
	});
    });

    it("must invoke pipe with options", () => {
	let fake     = sinon.fake();
	let progress = sinon.fake();
	let stub     = sinon.stub(utils, "_pipe").callsFake((uri, filepath, options, cb, progressCb) => {
	    assert.deepEqual(options, rest.options, "options passed");
	    assert.equal(uri, "workflow/bundle/1234.tar.gz", "url passed");
	    progressCb(0.5);
	    progressCb(1);
	    cb();
	});

	assert.doesNotThrow(() => {
	    rest.bundle_workflow("1234", "/path/to/1234", fake, progress);
	});

	assert(fake.calledOnce, "callback invoked");
	assert(progress.calledTwice, "progress callback invoked");
	stub.restore();
    });
});
