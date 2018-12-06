import REST from "../../lib/rest";
import * as utils from "../../lib/utils";

const proxyquire = require('proxyquire');
const assert     = require("assert");
const sinon      = require("sinon");

describe('start_workflow', () => {

    it('should start a workflow_instance', () => {
        var client = new REST({
	    "url"    : "http://metrichor.test:8080",
            "apikey" : "FooBar02"
        });

	let stub = sinon.stub(utils, "_post").callsFake((uri, obj, options, cb) => {
	    assert.equal(uri, "workflow_instance");
            assert.equal(options.apikey, "FooBar02");
            assert.equal(obj.id_workflow, "test");
            cb(null, {"id_workflow_instance":"1","id_user":"1"});
        });

	assert.doesNotThrow(() => {
            client.start_workflow({id_workflow: 'test'}, (err, obj) => {
		assert.equal(err, null, 'no error reported');
		assert.deepEqual(obj, {"id_workflow_instance":"1","id_user":"1"}, 'workflow_instance start response');
            });
	});

	stub.restore();
    });
});
