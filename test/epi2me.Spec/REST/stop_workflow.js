"use strict";
const proxyquire = require('proxyquire');
const assert     = require("assert");
const sinon      = require("sinon");

let utilsProxy   = {};
let REST         = proxyquire('../../../build/lib/rest', {
    './utils'     : utilsProxy,
}).default;

describe('stop_workflow', () => {

    it('should stop a workflow_instance', () => {
        var client = new REST({
            "url"    : "http://metrichor.local:8080",
            "apikey" : "FooBar02"
        });

        utilsProxy._put = (uri, id, obj, options, cb) => {
	    assert.equal(uri, "workflow_instance/stop");
	    assert.equal(id, "test");
	    assert.equal(obj, null);
            assert.equal(options.apikey, "FooBar02");
            cb(null, {"id_workflow_instance":"1","id_user":"1","stop_requested_date":"2013-09-03 15:17:00"});
            delete utilsProxy._put;
        };

        client.stop_workflow('test', (err, obj) => {
            assert.equal(err, null, 'no error reported');
            assert.deepEqual(obj, {"id_workflow_instance":"1","id_user":"1","stop_requested_date":"2013-09-03 15:17:00"}, 'workflow_instance stop response');
        });
    });
});
