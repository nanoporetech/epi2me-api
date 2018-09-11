"use strict";
const proxyquire   = require('proxyquire');
const assert       = require("assert");
const sinon        = require("sinon");
const path         = require("path");
const _            = require("lodash");
const tmp          = require('tmp');
const queue        = require('queue-async');
const fs           = require('fs');
let requestProxy   = {};
let fsProxy        = {};
let mkdirpProxy    = {};
let awsProxy       = {};
let utilsProxy     = {};
let EPI2ME         = proxyquire('../../lib/epi2me.js', {
    'aws-sdk'     : awsProxy,
    'fs-extra' : fsProxy,
    'mkdirp'      : mkdirpProxy,
    './utils.js'       : utilsProxy,
});

describe('workflows', () => {
    it('should list workflows', () => {
        let client = new EPI2ME({
            url           : "http://metrichor.local:8080",
            apikey        : "FooBar02",
	    agent_version : "0.18.12345"
        });

        utilsProxy._get = (uri, options, cb) => {
	    assert.equal(uri,                   "workflow");
	    assert.equal(options.url,           "http://metrichor.local:8080");
	    assert.equal(options.agent_version, '0.18.12345');
	    assert.equal(options.apikey,        'FooBar02');
	    assert.equal(options.user_agent,    'EPI2ME API');
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
