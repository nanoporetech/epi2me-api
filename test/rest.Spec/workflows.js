import REST from "../../lib/rest";
import utils from "../../lib/utils";
import fs from "fs-extra";

const sinon  = require("sinon");
const assert = require("assert");
const bunyan = require("bunyan");
const tmp    = require("tmp");
const path   = require("path");

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
	let dir     = tmp.dirSync({unsafeCleanup: true}).name;

	fs.mkdirpSync(path.join(dir, "workflows", "12345"));
	fs.mkdirpSync(path.join(dir, "workflows", "34567"));

	fs.writeFileSync(path.join(dir, "workflows", "12345", "workflow.json"), JSON.stringify({id_workflow: 12345}));
	fs.writeFileSync(path.join(dir, "workflows", "34567", "workflow.json"), JSON.stringify({id_workflow: 34567}));

	let rest = new REST({log: log, local: true, url: dir});
	let fake = sinon.fake();

	assert.doesNotThrow(async () => {
	    await rest.workflows(fake);
	    sinon.assert.calledOnce(fake);
	    sinon.assert.calledWith(fake, null, [ { id_workflow: 12345 }, { id_workflow: 34567 }]);
	});
    });
});
