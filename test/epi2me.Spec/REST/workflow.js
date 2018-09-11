"use strict";
const proxyquire   = require('proxyquire');
const assert       = require("assert");

let utilsProxy     = {};
let fsProxy        = {};
let mkdirpProxy    = {};
let awsProxy       = {};
let REST         = proxyquire('../../../build/lib/rest', {
    './utils'  : utilsProxy,
}).default;

describe('workflow', () => {

    it('should update a workflow', () => {
        var client = new REST({
            "url"    : "http://metrichor.local:8080",
            "apikey" : "FooBar02"
        });

        utilsProxy._post = function(uri, id, obj, options, cb) {
            assert.equal(uri,            "workflow");
	    assert.equal(id,             "test");
            assert.equal(options.apikey, "FooBar02");
            assert.deepEqual(obj,        {"description":"test workflow", "rev":"1.1"});
            cb(null, {"description":"a workflow","rev":"1.0"});
            delete utilsProxy._post;
        };

        client.workflow('test', {"description":"test workflow", "rev":"1.1"}, function(err, obj) {
            assert.equal(err, null, 'no error reported');
            assert.deepEqual(obj, {"description":"a workflow","rev":"1.0"}, 'workflow read');
        });
    });

    it('should read a workflow', () => {
        var client = new REST({
            "url"    : "http://metrichor.local:8080",
            "apikey" : "FooBar02"
        });

        utilsProxy._get = function(uri, options, cb) {
            assert.ok(uri === 'workflow/test' || uri === 'workflow/config/test');
            assert.equal(options.apikey, 'FooBar02');
            cb(null, {"description":"a workflow","rev":"1.0"});
            delete utilsProxy._get;
        };

        assert.doesNotThrow(() => {
            client.workflow('test', function(e, o) {
                assert.equal(e,      null, 'no error reported');
                assert.deepEqual(o, {"description":"a workflow","rev":"1.0"}, 'workflow read');
            });
        });
    });
});
