"use strict";
const proxyquire   = require('proxyquire');
const assert       = require("assert");
const sinon        = require("sinon");
const path         = require("path");
const _            = require("lodash");
const tmp          = require('tmp');
const queue        = require('queue-async');
const fs           = require('fs');
let utilsProxy     = {};
let fsProxy        = {};
let mkdirpProxy    = {};
let awsProxy       = {};
var EPI2ME         = proxyquire('../../lib/metrichor.js', {
    'aws-sdk'     : awsProxy,
    'graceful-fs' : fsProxy,
    'mkdirp'      : mkdirpProxy,
    './utils'     : utilsProxy,
});

describe('start_workflow', () => {

    it('should start a workflow_instance', () => {
        var client = new EPI2ME({
	    "url"    : "http://metrichor.test:8080",
            "apikey" : "FooBar02"
        });

        utilsProxy._post = (uri, id, obj, options, cb) => {
	    assert.equal(uri, "workflow_instance");
            assert.equal(id,  null);
            assert.equal(options.apikey, "FooBar02");
            assert.equal(obj.id_workflow, "test");
            cb(null, {"id_workflow_instance":"1","id_user":"1"});
            delete utilsProxy._post;
        };

        client.start_workflow({id_workflow: 'test'}, (err, obj) => {
            assert.equal(err, null, 'no error reported');
            assert.deepEqual(obj, {"id_workflow_instance":"1","id_user":"1"}, 'workflow_instance start response');
        });
    });
});
