import REST from "../../lib/rest";
import utils from "../../lib/utils";
import fs from "fs-extra";

const sinon  = require("sinon");
const assert = require("assert");
const bunyan = require("bunyan");

describe('rest.workflow', () => {

    it("must invoke put with options", () => {
	let ringbuf = new bunyan.RingBuffer({ limit: 100 });
        let log     = bunyan.createLogger({ name: "log", stream: ringbuf });
	let stub    = sinon.stub(utils, "_put").callsFake((uri, id, obj, options, cb) => {
	    assert.deepEqual(id, "12345", "id passed");
	    assert.deepEqual(obj, {"description":"a workflow","rev":"1.0"}, "object passed");
	    assert.deepEqual(options, { log: log, url: "http://metrichor.local:8080" }, "options passed");
	    assert.equal(uri, "workflow", "url passed");
	    cb();
	});

	let fake = sinon.fake();
	let rest = new REST({log: log, url: "http://metrichor.local:8080"});
	assert.doesNotThrow(() => {
	    rest.workflow("12345", {"description":"a workflow","rev":"1.0"}, fake);
	});
	assert(fake.calledOnce, "callback invoked");
	stub.restore();
    });

    it("must invoke post with options", () => {
	let ringbuf = new bunyan.RingBuffer({ limit: 100 });
        let log     = bunyan.createLogger({ name: "log", stream: ringbuf });
	let stub    = sinon.stub(utils, "_post").callsFake((uri, obj, options, cb) => {
	    assert.deepEqual(obj, {"description":"a workflow","rev":"1.0"}, "object passed");
	    assert.deepEqual(options, { log: log, url: "http://metrichor.local:8080" }, "options passed");
	    assert.equal(uri, "workflow", "url passed");
	    cb();
	});

	let fake = sinon.fake();
	let rest = new REST({log: log, url: "http://metrichor.local:8080"});
	assert.doesNotThrow(() => {
	    rest.workflow({"description":"a workflow","rev":"1.0"}, fake);
	});
	assert(fake.calledOnce, "callback invoked");
	stub.restore();
    });

    it("must throw if missing id", () => {
	let ringbuf = new bunyan.RingBuffer({ limit: 100 });
        let log     = bunyan.createLogger({ name: "log", stream: ringbuf });
	let stub    = sinon.stub(utils, "_put").callsFake((uri, id, obj, options, cb) => {
	    cb();
	});

	let fake = sinon.fake();
	let rest = new REST({log: log, url: "http://metrichor.local:8080"});
	assert.doesNotThrow(() => {
	    rest.workflow(null, fake);
	});
	assert(fake.calledOnce, "callback invoked");
	assert(fake.firstCall.args[0] instanceof Error);
	stub.restore();
    });

    it("must invoke read workflow from filesystem", () => {
	let ringbuf = new bunyan.RingBuffer({ limit: 100 });
        let log     = bunyan.createLogger({ name: "log", stream: ringbuf });
	let stub    = sinon.stub(fs, "readFileSync").callsFake((filename) => {
	    assert.deepEqual(filename, "/path/to/workflows/12345/workflow.json", "id passed");
	    return JSON.stringify({id_workflow: 12345, name: "test", description: "test workflow 12345"});
	});

	let fake = sinon.fake();
	let rest = new REST({log: log, url: "/path/to/", local: true});
	assert.doesNotThrow(() => {
	    rest.workflow("12345", fake);
	});
	assert(fake.calledOnce, "callback invoked");
	sinon.assert.calledWith(fake, null, {id_workflow: 12345, name: "test", description: "test workflow 12345"});
	stub.restore();
    });

    it("must catch a read-workflow exception from filesystem", () => {
	let ringbuf = new bunyan.RingBuffer({ limit: 100 });
        let log     = bunyan.createLogger({ name: "log", stream: ringbuf });
	let stub    = sinon.stub(fs, "readFileSync").callsFake((filename) => {
	    throw new Error("no such file or directory");
	});

	let fake = sinon.fake();
	let rest = new REST({log: log, url: "/path/to/", local: true});
	assert.doesNotThrow(() => {
	    rest.workflow("12345", fake);
	});
	assert(fake.calledOnce, "callback invoked");
	assert(fake.firstCall.args[0] instanceof Error);
	stub.restore();
    });
});
