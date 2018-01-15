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

describe('start_workflow', () => {

    it('should start a workflow_instance', () => {
        var client = new EPI2ME({
            "url"    : "http://metrichor.local:8080",
            "apikey" : "FooBar02"
        });

        requestProxy.post = function(obj, cb) {
            assert.equal(obj.uri,    "http://metrichor.local:8080/workflow_instance.js");
            assert.equal(obj.headers['X-EPI2ME-ApiKey'], "FooBar02");
            assert.equal(JSON.parse(obj.form.json).id_workflow, "test");
            cb(null, null, '{"id_workflow_instance":"1","id_user":"1"}');
            delete requestProxy.post;
        };

        client.start_workflow({id_workflow: 'test'}, function(err, obj) {
            assert.equal(err, null, 'no error reported');
            assert.deepEqual(obj, {"id_workflow_instance":"1","id_user":"1"}, 'workflow_instance start response');
        });
    });
});
