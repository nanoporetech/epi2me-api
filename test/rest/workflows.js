import fs        from "fs-extra";
import sinon     from "sinon";
import assert    from "assert";
import bunyan    from "bunyan";
import tmp       from "tmp";
import path      from "path";
import { merge } from "lodash";
import REST      from "../../src/rest";

describe('rest.workflow', () => {
    const restFactory = (opts) => {
	let ringbuf = new bunyan.RingBuffer({ limit: 100 });
        let log     = bunyan.createLogger({ name: "log", stream: ringbuf });
	return new REST(merge({log: log}, opts));
    };

    it("must invoke list with options", () => {
	let rest = restFactory();
	let stub = sinon.stub(rest, "_list").callsFake((uri, cb) => {
	    assert.equal(uri, "workflow", "url passed");
	    cb();
	});

	let fake = sinon.fake();
	assert.doesNotThrow(() => {
	    rest.workflows(fake);
	});
	assert(fake.calledOnce, "callback invoked");
    });
});
