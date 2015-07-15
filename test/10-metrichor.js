var proxyquire     = require('proxyquire');
var assert         = require("assert");
var requestProxy   = {};
var Metrichor      = proxyquire('../lib/metrichor', { 'request' : requestProxy });

describe('Array', function(){
    describe('metrichor', function(){

        it('should create a metrichor from constructor with defaults and allow overwriting', function() {
            var client;
            assert.doesNotThrow( function () {
                client = new Metrichor();
            }, Error, 'client obtained');

            assert.equal(client.url(),     'https://metrichor.com', 'default url');
            assert.equal(client.apikey(),  null, 'default apikey');
            //assert.equal(client.url('http://metrichor.local:90'), 'http://metrichor.local:90', 'accessor overwrites url');
            //assert.equal(client.apikey('FooBar01'),               'FooBar01',                  'accessor overwrites apikey');
        });

        it('should create a metrichor from constructor with defaults and allow overwriting', function() {
            var client;
            assert.doesNotThrow( function () {
                client = new Metrichor({
                    url : ''
                });
		        delete requestProxy.get;
            }, Error, 'client obtained');

            assert.equal(client.url(),     'https://metrichor.com', 'url set as empty string');
        });

        it('should get and overwrite config properties', function() {
            var client;
            assert.doesNotThrow( function () {
                client = new Metrichor({
                    url : 'initial'
                });
		        delete requestProxy.get;
            }, Error, 'client obtained');

            assert.equal(client.attr('url'), 'initial');
            client.attr('url', 'test');
            assert.equal(client.attr('url'), 'test');
        });

        it('should create a metrichor with opts', function() {
            var client;
            assert.doesNotThrow( function () {
                client = new Metrichor({
                    url:     'https://metrichor.local:8000',
                    apikey:  'FooBar02'
                });
		delete requestProxy.get;
            }, Error, 'client obtained');
            assert.equal(client.url(),    'https://metrichor.local:8000', 'url built from constructor');
            assert.equal(client.apikey(), 'FooBar02',                     'apikey built from constructor');
        });

        it('should list workflows', function() {
            var uri, err, obj,
		client = new Metrichor({
                    "url"    : "http://metrichor.local:8080",
                    "apikey" : "FooBar02"
		});

            requestProxy.get = function(o, cb) {
                uri = o.uri;
                cb(null, null, '{"workflows":[{"description":"a workflow"}]}');
		delete requestProxy.get;
            };

	    assert.doesNotThrow(function () {
		client.workflows(function(e, o) {
		    err = e;
		    obj = o;
		});
	    });

	    assert.equal(uri,     "http://metrichor.local:8080/workflow.js?apikey=FooBar02");
            assert.equal(err,     null, 'no error reported');
            assert.deepEqual(obj, [{"description":"a workflow"}], 'workflow list');
        });

        it('should list workflows and include agent_version', function() {
            var obj1, obj2, err, client = new Metrichor({
                "url"           : "http://metrichor.local:8080",
                "apikey"        : "FooBar02",
                "agent_version" : "0.18.12345",
            });

            requestProxy.get = function(o, cb) {
		        obj1 = o.uri;
                cb(null, null, '{"workflows":[{"description":"a workflow"}]}');
		        delete requestProxy.get;
            };

            assert.doesNotThrow(function () {
                client.workflows(function(e, o) {
                    err = e;
                    obj2 = o;
                });
                delete requestProxy.get;
            });

            assert.equal(obj1,     "http://metrichor.local:8080/workflow.js?apikey=FooBar02;agent_version=0.18.12345");
            assert.equal(err,      null, 'no error reported');
            assert.deepEqual(obj2, [{"description":"a workflow"}], 'workflow list');
        });

        it('should update a workflow', function() {
            var client = new Metrichor({
                "url"    : "http://metrichor.local:8080",
                "apikey" : "FooBar02"
            });

            requestProxy.post = function(obj, cb) {
                assert.equal(obj.uri,    "http://metrichor.local:8080/workflow/test.js");
                assert.equal(obj.form.apikey, "FooBar02");
                assert.deepEqual(JSON.parse(obj.form.json), {"description":"test workflow", "rev":"1.1"});
                cb(null, null, '{"description":"a workflow","rev":"1.0"}');
		        delete requestProxy.post;
            };

            client.workflow('test', {"description":"test workflow", "rev":"1.1"}, function(err, obj) {
                assert.equal(err, null, 'no error reported');
                assert.deepEqual(obj, {"description":"a workflow","rev":"1.0"}, 'workflow read');
            });
        });

        it('should start a workflow_instance', function() {
            var client = new Metrichor({
                "url"    : "http://metrichor.local:8080",
                "apikey" : "FooBar02"
            });

            requestProxy.post = function(obj, cb) {
                assert.equal(obj.uri,    "http://metrichor.local:8080/workflow_instance.js");
                assert.equal(obj.form.apikey, "FooBar02");
                assert.equal(JSON.parse(obj.form.json).workflow, "test");
                cb(null, null, '{"id_workflow_instance":"1","id_user":"1"}');
		        delete requestProxy.post;
            };

            client.start_workflow('test', function(err, obj) {
                assert.equal(err, null, 'no error reported');
                assert.deepEqual(obj, {"id_workflow_instance":"1","id_user":"1"}, 'workflow_instance start response');
            });
        });

        it('should stop a workflow_instance', function() {
            var client = new Metrichor({
                "url"    : "http://metrichor.local:8080",
                "apikey" : "FooBar02"
            });

            requestProxy.put = function(obj, cb) {
                assert.equal(obj.uri,    "http://metrichor.local:8080/workflow_instance/stop/test.js");
                assert.equal(obj.form.apikey, "FooBar02");
                cb(null, null, '{"id_workflow_instance":"1","id_user":"1","stop_requested_date":"2013-09-03 15:17:00"}');
		        delete requestProxy.get;
            };

            client.stop_workflow('test', function(err, obj) {
                assert.equal(err, null, 'no error reported');
                assert.deepEqual(obj, {"id_workflow_instance":"1","id_user":"1","stop_requested_date":"2013-09-03 15:17:00"}, 'workflow_instance stop response');
            });
        });

        it('should list workflow_instances', function() {
            var client = new Metrichor({
                "url"    : "http://metrichor.local:8080",
                "apikey" : "FooBar02"
            });

            requestProxy.get = function(obj, cb) {
                assert.equal(obj.uri, "http://metrichor.local:8080/workflow_instance.js?apikey=FooBar02");
                cb(null, null, '{"workflow_instances":[{"id_workflow_instance":"149","state":"running","workflow_filename":"DNA_Sequencing.js","start_requested_date":"2013-09-16 09:25:15","stop_requested_date":"2013-09-16 09:26:04","start_date":"2013-09-16 09:25:17","stop_date":"2013-09-16 09:26:11","control_url":"127.0.0.1:8001","data_url":"localhost:3006"}]}');
            };

            client.workflow_instances(function(err, obj) {
                assert.equal(err, null, 'no error reported');
                assert.deepEqual(obj, [{"id_workflow_instance":"149","state":"running","workflow_filename":"DNA_Sequencing.js","start_requested_date":"2013-09-16 09:25:15","stop_requested_date":"2013-09-16 09:26:04","start_date":"2013-09-16 09:25:17","stop_date":"2013-09-16 09:26:11","control_url":"127.0.0.1:8001","data_url":"localhost:3006"}], 'workflow instance list');
            });
        });

        it('should read a workflow_instance', function() {
            var client = new Metrichor({
                "url"    : "http://metrichor.local:8080",
                "apikey" : "FooBar02"
            });

            requestProxy.get = function(obj, cb) {
                assert.equal(obj.uri, "http://metrichor.local:8080/workflow_instance/149.js?apikey=FooBar02");
                cb(null, null, '{"id_workflow_instance":"149","state":"running","workflow_filename":"DNA_Sequencing.js","start_requested_date":"2013-09-16 09:25:15","stop_requested_date":"2013-09-16 09:26:04","start_date":"2013-09-16 09:25:17","stop_date":"2013-09-16 09:26:11","control_url":"127.0.0.1:8001","data_url":"localhost:3006"}');
		        delete requestProxy.get;
            };

            client.workflow_instance(149, function(err, obj) {
                assert.equal(err, null, 'no error reported');
                assert.deepEqual(obj, {"id_workflow_instance":"149","state":"running","workflow_filename":"DNA_Sequencing.js","start_requested_date":"2013-09-16 09:25:15","stop_requested_date":"2013-09-16 09:26:04","start_date":"2013-09-16 09:25:17","stop_date":"2013-09-16 09:26:11","control_url":"127.0.0.1:8001","data_url":"localhost:3006"}, 'workflow read');
            });
        });

        it('should post telemetry', function() {
            var client = new Metrichor({
                    "url"    : "http://metrichor.local:8080",
                    "apikey" : "FooBar02"
            });

            requestProxy.post = function(obj, cb) {
                assert.equal(obj.uri,         "http://metrichor.local:8080/workflow_instance/telemetry/150.js");
                assert.equal(obj.form.apikey, "FooBar02");
                cb(null, null, '{"tracers":{}, "packets":{}}');
		        delete requestProxy.post;
            };

            client.telemetry(150, {"tracers":{}, "packets":{}}, function(err, obj) {
                assert.equal(err, null, 'no error reported');
                assert.deepEqual(obj, {"tracers":{}, "packets":{}}, 'telemetry returned');
            });
        });

        it('should post telemetry with agent_version', function() {
            var client = new Metrichor({
                "url"           : "http://metrichor.local:8080",
                "apikey"        : "FooBar02",
                "agent_version" : "0.18.23456"
            });

            requestProxy.post = function(obj, cb) {
                assert.equal(obj.uri,                "http://metrichor.local:8080/workflow_instance/telemetry/150.js");
                assert.equal(obj.form.apikey,        "FooBar02");
                assert.equal(obj.form.agent_version, "0.18.23456");
                cb(null, null, '{"tracers":{}, "packets":{}}');
		        delete requestProxy.post;
            };

            client.telemetry(150, {"tracers":{}, "packets":{}}, function(err, obj) {
                assert.equal(err,     null, 'no error reported');
                assert.deepEqual(obj, {"tracers":{}, "packets":{}}, 'telemetry returned');
            });
        });

        it('should read a workflow', function() {
            var obj1, obj2, err, client = new Metrichor({
                "url"    : "http://metrichor.local:8080",
                "apikey" : "FooBar02"
            });

            requestProxy.get = function(o, cb) {
		        obj1 = o.uri;
                cb(null, null, '{"description":"a workflow","rev":"1.0"}');
		        delete requestProxy.get;
            };

	    assert.doesNotThrow(function () {
            client.workflow('test', function(e, o) {
                err  = e;
                obj2 = o;
            });
	    });

	    assert.equal(obj1,     "http://metrichor.local:8080/workflow/test.js?apikey=FooBar02");
            assert.equal(err,      null, 'no error reported');
            assert.deepEqual(obj2, {"description":"a workflow","rev":"1.0"}, 'workflow read');
        });
    });
});
