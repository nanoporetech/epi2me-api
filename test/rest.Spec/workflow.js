import REST from "../../lib/rest";
import utils from "../../lib/utils";
import fs from "fs-extra";

const sinon  = require("sinon");
const assert = require("assert");
const bunyan = require("bunyan");
const tmp    = require("tmp");
const path   = require("path");

describe('rest.workflow', () => {
    process.on('unhandledRejection', (reason, promise) => { console.log("[workflow.js] UNHANDLED PROMISE REJECTION", reason, promise); });

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
	let dir     = tmp.dirSync({unsafeCleanup: true}).name;

	fs.mkdirpSync(path.join(dir, "workflows", "12345"));
	fs.writeFileSync(path.join(dir, "workflows", "12345", "workflow.json"), JSON.stringify({id_workflow: 12345, name: "test", description: "test workflow 12345"}));

	let fake = sinon.fake();
	let rest = new REST({log: log, url: dir, local: true});
	assert.doesNotThrow(() => {
	    rest.workflow("12345", fake);
	});
	assert(fake.calledOnce, "callback invoked");
	sinon.assert.calledWith(fake, null, {id_workflow: 12345, name: "test", description: "test workflow 12345"});
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

    it("must invoke get then fetch config with workflow missing params", () => {
	let ringbuf = new bunyan.RingBuffer({ limit: 100 });
        let log     = bunyan.createLogger({ name: "log", stream: ringbuf });

	let stub1   = sinon.stub(REST.prototype, "_read").callsFake((uri, id, cb) => {
	    assert.deepEqual(id, "12345", "id passed");
	    assert.equal(uri, "workflow", "url passed");
	    cb(null, {id_workflow:12345, description: "a workflow"});
	});

	let stub2   = sinon.stub(utils, "_get").callsFake((uri, options, cb) => {
	    if(uri === "workflow/config/12345") {
		return cb(null, {});
	    }
	    throw new Error("unhandled test url" + uri);
	});

	let fake = sinon.fake();
	let rest = new REST({log: log, url: "http://metrichor.local:8080"});

	new Promise((accept, reject) => {
	    rest.workflow("12345", (err, data) => {
		if(err) reject(fake(err));
		accept(fake(null, data));
	    });
	})
	    .then(() => {
		assert(fake.calledOnce, "callback invoked");
		sinon.assert.calledWith(fake, null, {description: "a workflow", id_workflow: 12345, params: {  } });
	    });

	stub1.restore();
	stub2.restore();
    });

    it("must invoke get then fetch config with null workflow", () => {
	let ringbuf = new bunyan.RingBuffer({ limit: 100 });
        let log     = bunyan.createLogger({ name: "log", stream: ringbuf });

	let stub1   = sinon.stub(REST.prototype, "_read").callsFake((uri, id, cb) => {
	    assert.deepEqual(id, "12345", "id passed");
	    assert.equal(uri, "workflow", "url passed");
	    cb(null, null); // null workflow
	});

	let stub2   = sinon.stub(utils, "_get").callsFake((uri, options, cb) => {
	    if(uri === "workflow/config/12345") {
		return cb(null, {});
	    }
	    throw new Error("unhandled test url" + uri);
	});

	let fake = sinon.fake();
	let rest = new REST({log: log, url: "http://metrichor.local:8080"});

	new Promise((accept, reject) => {
	    rest.workflow("12345", (err, data) => {
		if(err) reject(fake(err));
		accept(fake(null, data));
	    });
	})
	    .then(() => {
		assert(fake.calledOnce, "callback invoked");
		sinon.assert.calledWith(fake, null, { params: {  } });
	    }); // catch block after this seems ineffective - even asserting(false) doesn't make the test fail

	stub1.restore();
	stub2.restore();
    });

    it("must invoke get then fetch config with workflow including params", () => {
	let ringbuf = new bunyan.RingBuffer({ limit: 100 });
        let log     = bunyan.createLogger({ name: "log", stream: ringbuf });

	let stub1   = sinon.stub(REST.prototype, "_read").callsFake((uri, id, cb) => {
	    assert.deepEqual(id, "12345", "id passed");
	    assert.equal(uri, "workflow", "url passed");
	    cb(null, {
		id_workflow:12345,
		description: "a workflow",
		params: [{
		    widget: "ajax_dropdown",
		    values: { data_root: "data_root", source: "test_params", items: {label_key:"label_key",value_key:"value_key"}}
		}]
	    });
	});

	let stub2   = sinon.stub(utils, "_get").callsFake((uri, options, cb) => {
	    if(uri === "workflow/config/12345") {
		return cb(null, {});
	    }
	    if(uri === "test_params") {
		return cb(null, {
		    "data_root":[
			{ label_key:"foo",value_key:1 },
			{ label_key:"bar",value_key:2 },
			{ label_key:"baz",value_key:3 }
		    ]});
	    }

	    throw new Error("unhandled test url" + uri);
	});

	let fake = sinon.fake();
	let rest = new REST({log: log, url: "http://metrichor.local:8080"});

	new Promise((accept, reject) => {
	    rest.workflow("12345", (err, data) => {
		if(err) reject(fake(err));
		accept(fake(null, data));
	    });
	})
	    .then(() => {
		assert(fake.calledOnce, "callback invoked");
		sinon.assert.calledWith(fake, null, {
		    description: "a workflow",
		    id_workflow: 12345,
		    params: [{
			values: [{ label: "foo", value: 1 }, { label: "bar", value: 2 }, { label: "baz", value: 3 }],
			widget: "ajax_dropdown"
		    }]
		} );
	    });

	stub1.restore();
	stub2.restore();
    });

    it("must invoke get then fetch config with workflow including params and skip handling of data_root", () => {
	let ringbuf = new bunyan.RingBuffer({ limit: 100 });
        let log     = bunyan.createLogger({ name: "log", stream: ringbuf });

	let stub1   = sinon.stub(REST.prototype, "_read").callsFake((uri, id, cb) => {
	    assert.deepEqual(id, "12345", "id passed");
	    assert.equal(uri, "workflow", "url passed");
	    cb(null, {
		id_workflow:12345,
		description: "a workflow",
		params: [{
		    widget: "ajax_dropdown",
		    values: { source: "test_params", items: {label_key:"label_key",value_key:"value_key"}}
		}]
	    });
	});

	let stub2   = sinon.stub(utils, "_get").callsFake((uri, options, cb) => {
	    if(uri === "workflow/config/12345") {
		return cb(null, {});
	    }
	    if(uri === "test_params") {
		return cb(null, {
		    "data_root":[
			{ label_key:"foo",value_key:1 },
			{ label_key:"bar",value_key:2 },
			{ label_key:"baz",value_key:3 }
		    ]});
	    }

	    throw new Error("unhandled test url" + uri);
	});

	let fake = sinon.fake();
	let rest = new REST({log: log, url: "http://metrichor.local:8080"});

	new Promise((accept, reject) => {
	    rest.workflow("12345", (err, data) => {
		if(err) reject(fake(err));
		accept(fake(null, data));
	    });
	})
	    .then(() => {
		assert(fake.calledOnce, "callback invoked");
		sinon.assert.calledWith(fake, null, {
		    description: "a workflow",
		    id_workflow: 12345,
		    params: [{
			values: {
			    items: { label_key: "label_key", value_key: "value_key" },
			    source: "test_params"
			},
			widget: "ajax_dropdown"
		    }]
		} );
	    });

	stub1.restore();
	stub2.restore();
    });

    it("must handle failure during config fetch", () => {
	let ringbuf = new bunyan.RingBuffer({ limit: 100 });
        let log     = bunyan.createLogger({ name: "log", stream: ringbuf });

	let stub1   = sinon.stub(REST.prototype, "_read").callsFake((uri, id, cb) => {
	    assert.deepEqual(id, "12345", "id passed");
	    assert.equal(uri, "workflow", "url passed");
	    cb(null, {
		id_workflow:12345,
		description: "a workflow",
		params: [{
		    widget: "ajax_dropdown",
		    values: { data_root: "data_root", source: "test_params", items: {label_key:"label_key",value_key:"value_key"}}
		}]
	    });
	});

	let stub2   = sinon.stub(utils, "_get").callsFake((uri, options, cb) => {
	    if(uri === "workflow/config/12345") {
		return cb({"error": "forbidden"});
	    }
	    if(uri === "test_params") {
		return cb(null, {
		    "data_root":[
			{ label_key:"foo",value_key:1 },
			{ label_key:"bar",value_key:2 },
			{ label_key:"baz",value_key:3 }
		    ]});
	    }

	    throw new Error("unhandled test url" + uri);
	});

	let fake = sinon.fake();
	let rest = new REST({log: log, url: "http://metrichor.local:8080"});

	new Promise((accept, reject) => {
	    rest.workflow("12345", (err, data) => {
		if(err) reject(fake(err));
		accept(fake(null, data));
	    });
	})
	    .then(() => {
		assert(fake.called, "callback invoked with error");
		sinon.assert.calledWith(fake, null, {
		    description: "a workflow",
		    id_workflow: 12345,
		    params: [{
			values: [{ label: "foo", value: 1 }, { label: "bar", value: 2 }, { label: "baz", value: 3 }],
			widget: "ajax_dropdown"
		    }]
		} );
	    });

	stub1.restore();
	stub2.restore();
    });

    it("must handle failure during parameter fetch", () => {
	let ringbuf = new bunyan.RingBuffer({ limit: 100 });
        let log     = bunyan.createLogger({ name: "log", stream: ringbuf });

	let stub1   = sinon.stub(REST.prototype, "_read").callsFake((uri, id, cb) => {
	    assert.deepEqual(id, "12345", "id passed");
	    assert.equal(uri, "workflow", "url passed");
	    cb(null, {
		id_workflow:12345,
		description: "a workflow",
		params: [{
		    widget: "ajax_dropdown",
		    values: { data_root: "data_root", source: "test_params", items: {label_key:"label_key",value_key:"value_key"}}
		}]
	    });
	});

	let stub2   = sinon.stub(utils, "_get").callsFake((uri, options, cb) => {
	    if(uri === "workflow/config/12345") {
		return cb(null, {});
	    }
	    if(uri === "test_params") {
		return cb({"error":"forbidden"});
	    }

	    throw new Error("unhandled test url" + uri);
	});

	let fake = sinon.fake();
	let rest = new REST({log: log, url: "http://metrichor.local:8080"});

	new Promise((accept, reject) => {
	    rest.workflow("12345", (err, data) => {
		if(err) reject(fake(err));
		accept(fake(null, data));
	    });
	})
	    .then(() => {
		assert(fake.called, "callback invoked with error");
		sinon.assert.calledWith(fake, null, {
		    description: "a workflow",
		    id_workflow: 12345,
		    params: [{
			values: [{ label: "foo", value: 1 }, { label: "bar", value: 2 }, { label: "baz", value: 3 }],
			widget: "ajax_dropdown"
		    }]
		} );
	    });

	stub1.restore();
	stub2.restore();
    });
});
