import REST from "../../lib/rest";
import utils from "../../lib/utils";
import fs from "fs-extra";

const sinon  = require("sinon");
const assert = require("assert");
const bunyan = require("bunyan");

describe('rest.workflows', () => {
    it("must invoke list with options", () => {
	let ringbuf    = new bunyan.RingBuffer({ limit: 100 });
        let log        = bunyan.createLogger({ name: "log", stream: ringbuf });
	let stub = sinon.stub(REST.prototype, "_list").callsFake((uri, cb) => {
	    assert.equal(uri, "workflow", "url passed");
	    cb();
	});

	let fake = sinon.fake();
	let rest = new REST({log: log});
	assert.doesNotThrow(() => {
	    rest.workflows(fake);
	});
	assert(fake.calledOnce, "callback invoked");
	stub.restore();
    });

    it("must list from filesystem", () => {
	let ringbuf = new bunyan.RingBuffer({ limit: 100 });
        let log     = bunyan.createLogger({ name: "log", stream: ringbuf });
	let stub1   = sinon.stub(fs, "readdir").callsFake((dir) => {
	    assert.equal(dir, "/path/to/workflows", "dir passed");
	    return Promise.resolve(["12345", "23456", "34567"]);
	});
	let stub2   = sinon.stub(fs, "statSync").callsFake((filepath) => {
	    return {
		"/path/to/workflows/12345": { isDirectory: () => { return true;  } },
		"/path/to/workflows/23456": { isDirectory: () => { return false; } },
		"/path/to/workflows/34567": { isDirectory: () => { return true;  } },
	    }[filepath];
	});

	let stub3   = sinon.stub(fs, "readFileSync").callsFake((filepath) => {
	    return JSON.stringify({
		"/path/to/workflows/12345/workflow.json": {id_workflow: 12345},
		"/path/to/workflows/23456/workflow.json": {id_workflow: 23456},
		"/path/to/workflows/34567/workflow.json": {id_workflow: 34567},
	    }[filepath]);
	});

	/* there's a weird, non-obvious, race condition here:
	 * without sinon.fake() the stubs aren't always installed in time
	 * with sinon.fake() the callback isn't used
	 */
	let fake = (...args) => {
	    assert.deepEqual(args, [null, [ { id_workflow: 12345 }, { id_workflow: 34567 } ]]);
	};
	let rest = new REST({log: log, local: true, url: "/path/to"});
	assert.doesNotThrow(() => {
	    rest.workflows(fake); //(...args) => {
	});
	stub1.restore();
	stub2.restore();
	stub3.restore();

    });
});
