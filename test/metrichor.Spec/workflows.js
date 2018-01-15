"use strict";
const proxyquire     = require('proxyquire');
const assert         = require("assert");
const sinon          = require("sinon");
const path           = require("path");
const _              = require("lodash");
const tmp            = require('tmp');
const queue          = require('queue-async');
const fs             = require('fs');
let requestProxy   = {};
let fsProxy        = {};
let mkdirpProxy    = {};
let awsProxy       = {};
proxyquire('../../lib/utils', {
    'request' : requestProxy
});
var EPI2ME = proxyquire('../../lib/metrichor.js', {
    'aws-sdk'     : awsProxy,
    'graceful-fs' : fsProxy,
    'mkdirp'      : mkdirpProxy
});

describe('workflows', function(){

    it('should list workflows', () => {
        var req,
            client = new EPI2ME({
                url    : "http://metrichor.local:8080",
                apikey : "FooBar02",
		agent_version: "0.18.12345"
            });

        requestProxy.get = function(req, cb) {
	    assert.deepEqual(req, {
		uri: "http://metrichor.local:8080/workflow.js",
		headers: {
		    'X-EPI2ME-ApiKey':  'FooBar02',
		    'X-EPI2ME-Client':  'Metrichor API',
		    'X-EPI2ME-Version': '0.18.12345'
		}});
            cb(null, null, JSON.stringify({"workflows":[{"description":"a workflow"}]}));
            delete requestProxy.get;
        };

        assert.doesNotThrow(() => {
            client.workflows(function(e, o) {
		assert.equal(e,     null, 'no error reported');
		assert.deepEqual(o, [{"description":"a workflow"}], 'workflow list');
            });
        });
    });
});
