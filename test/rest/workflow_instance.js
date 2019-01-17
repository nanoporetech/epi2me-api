import assert from "assert";
import sinon  from "sinon";
import utils  from "../../lib/utils";
import REST   from "../../lib/rest";

describe("epi2me.workflow_instance", () => {
    let client;

    beforeEach(() => {
	client = new REST({
            "url"    : "http://metrichor.local:8080",
            "apikey" : "FooBar02"
        });
    });

    it('should read a workflow_instance', () => {

        let stub = sinon.stub(utils, "_get").callsFake((uri, options, cb) => {
            assert.equal(uri, "workflow_instance/149");
            assert.equal(options.apikey, "FooBar02");
            cb(null, {"id_workflow_instance":"149","state":"running","workflow_filename":"DNA_Sequencing.js","start_requested_date":"2013-09-16 09:25:15","stop_requested_date":"2013-09-16 09:26:04","start_date":"2013-09-16 09:25:17","stop_date":"2013-09-16 09:26:11","control_url":"127.0.0.1:8001","data_url":"localhost:3006"});
        });

        client.workflow_instance(149, (err, obj) => {
            assert.equal(err, null, 'no error reported');
            assert.deepEqual(obj, {"id_workflow_instance":"149","state":"running","workflow_filename":"DNA_Sequencing.js","start_requested_date":"2013-09-16 09:25:15","stop_requested_date":"2013-09-16 09:26:04","start_date":"2013-09-16 09:25:17","stop_date":"2013-09-16 09:26:11","control_url":"127.0.0.1:8001","data_url":"localhost:3006"}, 'workflow read');
        });

	stub.restore();
    });
});
