import assert from "assert";
import sinon  from "sinon";
import utils  from "../../src/utils";
import REST   from "../../src/rest";

describe('epi2me.start_workflow', () => {
    let client;

    beforeEach(() => {
	client = new REST({
            "url"    : "http://metrichor.local:8080",
            "apikey" : "FooBar02"
        });
    });

    it('should start a workflow_instance', () => {

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
