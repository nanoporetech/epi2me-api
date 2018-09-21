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
/*
    it("must list from filesystem", () => {
	let ringbuf = new bunyan.RingBuffer({ limit: 100 });
        let log     = bunyan.createLogger({ name: "log", stream: ringbuf });
	let stub1   = sinon.stub(fs, "readdir").callsFake((dir) => {
	    assert.equal(dir, "/path/to/workflows", "dir passed");
	    return Promise.resolve(["12345", "23456", "34567"]);
	});
	let stub2   = sinon.stub(fs, "statSync").callsFake((filepath) => {
	    return {
		"12345": { is_Directory: () => { return true;  } },
		"23456": { is_Directory: () => { return false; } },
		"34567": { is_Directory: () => { return true;  } },
	    }[filepath];
	});

	let stub3   = sinon.stub(fs, "readFileSync").callsFake((filepath) => {
	    return JSON.stringify({
		"12345": {id_workflow: 12345},
		"23456": {id_workflow: 23456},
		"34567": {id_workflow: 34567},
	    }[filepath]);
	});

	let fake = sinon.fake();
	let rest = new REST({log: log, local: true, url: "/path/to"});
//	assert.doesNotThrow(() => {
	    rest.workflows(fake);
//	});
	assert(fake.calledOnce, "callback invoked");
	console.log(fake.firstCall.args);
	stub1.restore();
	stub2.restore();
	stub3.restore();
    });*/
});
