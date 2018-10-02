import REST from "../../lib/rest";
import utils from "../../lib/utils";

const sinon  = require("sinon");
const assert = require("assert");
const bunyan = require("bunyan");
const tmp    = require("tmp");
const fs     = require("fs-extra");
const path   = require("path");

describe("rest.workflow_instances", () => {
    it("must invoke list", () => {
	let ringbuf    = new bunyan.RingBuffer({ limit: 100 });
        let log        = bunyan.createLogger({ name: "log", stream: ringbuf });
	let stub = sinon.stub(REST.prototype, "_list").callsFake((uri, cb) => {
	    assert.equal(uri, "workflow_instance", "default uri");
	    cb();
	});

	let fake = sinon.fake();
	let rest = new REST({log: log});
	assert.doesNotThrow(() => {
	    rest.workflow_instances(fake);
	});
	assert(fake.calledOnce, "callback invoked");
	stub.restore();
    });

    it("must invoke get with query", () => {
	let ringbuf    = new bunyan.RingBuffer({ limit: 100 });
        let log        = bunyan.createLogger({ name: "log", stream: ringbuf });
	let stub = sinon.stub(utils, "_get").callsFake((uri, options, cb) => {
	    assert.equal(uri, "workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=abcdefabcdef;", "query uri");
	    cb(null, {data:[{id_ins: 1, id_flo: 2, run_id: "abcdefabcdef", desc: "test wf 2", rev: "0.0.1"}]});
	});

	let fake = sinon.fake();
	let rest = new REST({log: log});
	assert.doesNotThrow(() => {
	    rest.workflow_instances(fake, {run_id:"abcdefabcdef"});
	});
	assert(fake.calledOnce, "callback invoked");
	sinon.assert.calledWith(fake, null, [{id_workflow_instance: 1,
					      id_workflow:2,
					      run_id:"abcdefabcdef",
					      description: "test wf 2",
					      rev:"0.0.1"}]);
	stub.restore();
    });

    it("must list from filesystem", () => {
	let ringbuf = new bunyan.RingBuffer({ limit: 100 });
        let log     = bunyan.createLogger({ name: "log", stream: ringbuf });
	let dir     = tmp.dirSync({unsafeCleanup: true}).name;

	fs.mkdirpSync(path.join(dir, "instances", "2018-09-10T14-31-04.751Z"));
	fs.mkdirpSync(path.join(dir, "instances", "2018-09-10T14-29-48.061Z"));
	fs.mkdirpSync(path.join(dir, "instances", "2018-10-02T12-25-48.061Z"));

	let wf = {id_workflow: 34567, description: "test flow", "rev": "12.34"}
	fs.writeFileSync(path.join(dir, "instances", "2018-09-10T14-31-04.751Z", "workflow.json"), JSON.stringify(wf));
	fs.writeFileSync(path.join(dir, "instances", "2018-09-10T14-29-48.061Z", "workflow.json"), JSON.stringify(wf));
	fs.writeFileSync(path.join(dir, "instances", "2018-10-02T12-25-48.061Z", "workflow.json"), "corrupt json");

	let rest = new REST({log: log, local: true, url: dir});
	let fake = sinon.fake();

	assert.doesNotThrow(async () => {
	    await rest.workflow_instances(fake);
	    sinon.assert.calledOnce(fake);
	    sinon.assert.calledWith(fake, null,
				    [{
  description: "test flow",
  filename: dir+"/instances/2018-09-10T14-29-48.061Z/workflow.json",
  id_workflow: 34567,
  id_workflow_instance: "2018-09-10T14-29-48.061Z",
  rev: "12.34"
}, {
  description: "test flow",
  filename: dir+"/instances/2018-09-10T14-31-04.751Z/workflow.json",
  id_workflow: 34567,
  id_workflow_instance: "2018-09-10T14-31-04.751Z",
  rev: "12.34"
}, {
  description: "-",
  filename: dir+"/instances/2018-10-02T12-25-48.061Z/workflow.json",
  id_workflow: "-",
  id_workflow_instance: "2018-10-02T12-25-48.061Z",
  rev: "0.0"
}]
				    );
	});
    });

    it("must bail when local with query", () => {
        let ringbuf    = new bunyan.RingBuffer({ limit: 100 });
        let log        = bunyan.createLogger({ name: "log", stream: ringbuf });
        let fake = sinon.fake();
        let rest = new REST({log: log, local: true});
        assert.doesNotThrow(() => {
            rest.workflow_instances(fake, "a query");
        });
        assert(fake.calledOnce, "callback invoked");
        assert(fake.firstCall.args[0] instanceof Error);
    });
});
