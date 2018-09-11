"use strict";
const proxyquire = require('proxyquire');
const assert     = require("assert");
const sinon      = require("sinon");

let utilsProxy   = {};
let REST         = proxyquire('../../../build/lib/rest', {
    './utils'  : utilsProxy,
}).default;

describe('workflows', () => {
    it('should list workflows', () => {
        let client = new REST({
            url           : "http://metrichor.local:8080",
            apikey        : "FooBar02",
	    agent_version : "0.18.12345"
        });

        utilsProxy._get = (uri, options, cb) => {
	    assert.equal(uri,                   "workflow");
	    assert.equal(options.url,           "http://metrichor.local:8080");
	    assert.equal(options.agent_version, '0.18.12345');
	    assert.equal(options.apikey,        'FooBar02');
//	    assert.equal(options.user_agent,    'EPI2ME API');
            return cb(null, {workflows: [{"description":"a workflow"}]});
        };

        assert.doesNotThrow(() => {
            client.workflows((e, o) => {
		assert.equal(e,     null, 'no error reported');
		assert.deepEqual(o, [{"description":"a workflow"}], 'workflow list');
            });
        });
    });
});
