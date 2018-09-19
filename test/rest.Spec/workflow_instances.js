"use strict";
const proxyquire = require('proxyquire');
const assert     = require("assert");
const sinon      = require("sinon");

let utilsProxy   = {};

let REST = proxyquire('../../lib/rest', {
    './utils'  : utilsProxy,
}).default;

describe('workflow_instances', () => {

    it('should list workflow_instances', () => {
        let client = new REST({
            "url"    : "http://metrichor.local:8080",
            "apikey" : "FooBar02"
        });

	let data = {
	    workflow_instances: [
		{
		    id_workflow_instance:"149",
		    state:"running",
		    workflow_filename:"DNA_Sequencing.js",
		    start_requested_date:"2013-09-16 09:25:15",
		    stop_requested_date:"2013-09-16 09:26:04",
		    start_date:"2013-09-16 09:25:17",
		    stop_date:"2013-09-16 09:26:11",
		    control_url:"127.0.0.1:8001",
		    data_url:"localhost:3006"
		}
	    ]
	};

        utilsProxy._get = (uri, options, cb) => {
            assert.equal(uri, "workflow_instance");
            assert.equal(options.apikey, "FooBar02");
            cb(null, data);
        };

        client.workflow_instances((err, obj) => {
            assert.equal(err, null, 'no error reported');
            assert.deepEqual(obj, data.workflow_instances, 'workflow instance list');
        });
    });
});
