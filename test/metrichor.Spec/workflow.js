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
var EPI2ME;

describe('metrichor api', () => {

    beforeEach(() => {
        EPI2ME = proxyquire('../../lib/metrichor.js', {
            'aws-sdk'     : awsProxy,
            'graceful-fs' : fsProxy,
            'mkdirp'      : mkdirpProxy
        });
    });

    it('should update a workflow', () => {
        var client = new EPI2ME({
            "url"    : "http://metrichor.local:8080",
            "apikey" : "FooBar02"
        });

        requestProxy.post = function(obj, cb) {
            assert.equal(obj.uri,    "http://metrichor.local:8080/workflow/test.js");
            assert.equal(obj.headers['X-EPI2ME-ApiKey'], "FooBar02");
            assert.deepEqual(JSON.parse(obj.form.json), {"description":"test workflow", "rev":"1.1"});
            cb(null, null, '{"description":"a workflow","rev":"1.0"}');
            delete requestProxy.post;
        };

        client.workflow('test', {"description":"test workflow", "rev":"1.1"}, function(err, obj) {
            assert.equal(err, null, 'no error reported');
            assert.deepEqual(obj, {"description":"a workflow","rev":"1.0"}, 'workflow read');
        });
    });

    it('should read a workflow', () => {
        var client = new EPI2ME({
            "url"    : "http://metrichor.local:8080",
            "apikey" : "FooBar02"
        });

        requestProxy.get = function(obj, cb) {
            assert.equal(obj.uri, 'http://metrichor.local:8080/workflow/test.js');
            assert.equal(obj.headers['X-EPI2ME-ApiKey'], 'FooBar02');
            cb(null, null, '{"description":"a workflow","rev":"1.0"}');
            delete requestProxy.get;
        };

        assert.doesNotThrow(() => {
            client.workflow('test', function(e, o) {
                assert.equal(e,      null, 'no error reported');
                assert.deepEqual(o, {"description":"a workflow","rev":"1.0"}, 'workflow read');
            });
        });
    });
});
