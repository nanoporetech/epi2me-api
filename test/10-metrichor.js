var proxyquire     = require('proxyquire');
var assert         = require("assert")
var extRequestStub = {};
var metrichor      = proxyquire('../metrichor', { 'request' : extRequestStub });

describe('Array', function(){
    describe('metrichor', function(){

        it('should create a metrichor from constructor with defaults and allow overwriting', function() {
            var Client;
            assert.doesNotThrow( function () {
                Client = new metrichor();
            }, Error, 'Client obtained');

            assert.equal(Client.url(),     'https://metrichor.com', 'default url');
            assert.equal(Client.apikey(),  null, 'default apikey');
            assert.equal(Client.url('http://metrichor.local:90'), 'http://metrichor.local:90', 'accessor overwrites url');
            assert.equal(Client.apikey('FooBar01'),               'FooBar01',                  'accessor overwrites apikey');
        });
    
        it('should create a metrichor from constructor with defaults and allow overwriting', function() {
            var Client;
            assert.doesNotThrow( function () {
                Client = new metrichor( {
                    url : ''
                } );
            }, Error, 'Client obtained');

            assert.equal(Client.url(),     'https://metrichor.com', 'url set as empty string');
        });
    
        it('should create a metrichor with opts', function() {
            var Client;
            assert.doesNotThrow( function () {
                Client = new metrichor({
                    url:     'https://metrichor.local:8000',
                    apikey:  'FooBar02'
                });
            }, Error, 'Client obtained');
            assert.equal(Client.url(),    'https://metrichor.local:8000', 'url built from constructor');
            assert.equal(Client.apikey(), 'FooBar02',                     'apikey built from constructor');
        });
    
        it('should list workflows', function() {
            var Client = new metrichor({
                "url"    : "http://metrichor.local:8080",
                "apikey" : "FooBar02"
            });

            extRequestStub.get = function(obj, cb) {
                assert.equal(obj.uri, "http://metrichor.local:8080/workflow.js?apikey=FooBar02");
                cb(null, null, '{"workflows":[{"description":"a workflow"}]}');
            };
      
            Client.workflows(function(err, obj) {
                assert.equal(err, null, 'no error reported');
                assert.deepEqual(obj, [{"description":"a workflow"}], 'workflow list');
            });
        });
    
        it('should list workflows and include agent_version', function() {
            var Client = new metrichor({
                "url"           : "http://metrichor.local:8080",
                "apikey"        : "FooBar02",
                "agent_version" : "0.18.12345",
            });

            extRequestStub.get = function(obj, cb) {
                assert.equal(obj.uri, "http://metrichor.local:8080/workflow.js?apikey=FooBar02;agent_version=0.18.12345");
                cb(null, null, '{"workflows":[{"description":"a workflow"}]}');
            };
      
            Client.workflows(function(err, obj) {
                assert.equal(err,     null, 'no error reported');
                assert.deepEqual(obj, [{"description":"a workflow"}], 'workflow list');
            });
        });

        it('should list workflows via a proxy', function() {
            var Client = new metrichor({
                url    : "http://metrichor.local:8080",
                apikey : "FooBar02",
                proxy  : "https://myproxy.com:3128/"
            });

            extRequestStub.get = function(obj, cb) {
                assert.equal(obj.uri, "http://metrichor.local:8080/workflow.js?apikey=FooBar02");
                assert.equal(obj.proxy, "https://myproxy.com:3128/", 'proxy is passed through');
                cb(null, null, '{"workflows":[{"description":"a workflow"}]}');
            };
      
            Client.workflows(function(err, obj) {
                assert.equal(err, null, 'no error reported');
                assert.deepEqual(obj, [{"description":"a workflow"}], 'workflow list');
            });
        });

        it('should read a workflow', function() {
            var Client = new metrichor({
                "url"    : "http://metrichor.local:8080",
                "apikey" : "FooBar02"
            });

            extRequestStub.get = function(obj, cb) {
                assert.equal(obj.uri, "http://metrichor.local:8080/workflow/test.js?apikey=FooBar02");
                cb(null, null, '{"description":"a workflow","rev":"1.0"}');
            };
      
            Client.workflow('test', function(err, obj) {
                assert.equal(err, null, 'no error reported');
                assert.deepEqual(obj, {"description":"a workflow","rev":"1.0"}, 'workflow read');
            });
        });
    
        it('should update a workflow', function() {
            var Client = new metrichor({
                "url"    : "http://metrichor.local:8080",
                "apikey" : "FooBar02"
            });
      
            extRequestStub.post = function(obj, cb) {
                assert.equal(obj.uri,    "http://metrichor.local:8080/workflow/test.js");
                assert.equal(obj.form.apikey, "FooBar02");
                assert.deepEqual(JSON.parse(obj.form.json), {"description":"test workflow", "rev":"1.1"});
                cb(null, null, '{"description":"a workflow","rev":"1.0"}');
            };

            Client.workflow('test', {"description":"test workflow", "rev":"1.1"}, function(err, obj) {
                assert.equal(err, null, 'no error reported');
                assert.deepEqual(obj, {"description":"a workflow","rev":"1.0"}, 'workflow read');
            });
        });

        it('should start a workflow_instance', function() {
            var Client = new metrichor({
                "url"    : "http://metrichor.local:8080",
                "apikey" : "FooBar02"
            });

            extRequestStub.post = function(obj, cb) {
                assert.equal(obj.uri,    "http://metrichor.local:8080/workflow_instance.js");
                assert.equal(obj.form.apikey, "FooBar02");
                assert.equal(JSON.parse(obj.form.json).workflow, "test");
                cb(null, null, '{"id_workflow_instance":"1","id_user":"1"}');
            };

            Client.start_workflow('test', function(err, obj) {
                assert.equal(err, null, 'no error reported');
                assert.deepEqual(obj, {"id_workflow_instance":"1","id_user":"1"}, 'workflow_instance start response');
            });
        });
    
        it('should stop a workflow_instance', function() {
            var Client = new metrichor({
                "url"    : "http://metrichor.local:8080",
                "apikey" : "FooBar02"
            });
      
            extRequestStub.put = function(obj, cb) {
                assert.equal(obj.uri,    "http://metrichor.local:8080/workflow_instance/stop/test.js");
                assert.equal(obj.form.apikey, "FooBar02");
                cb(null, null, '{"id_workflow_instance":"1","id_user":"1","stop_requested_date":"2013-09-03 15:17:00"}');
            };
      
            Client.stop_workflow('test', function(err, obj) {
                assert.equal(err, null, 'no error reported');
                assert.deepEqual(obj, {"id_workflow_instance":"1","id_user":"1","stop_requested_date":"2013-09-03 15:17:00"}, 'workflow_instance stop response');
            });
        });
    
        it('should list workflow_instances', function() {
            var Client = new metrichor({
                "url"    : "http://metrichor.local:8080",
                "apikey" : "FooBar02"
            });
      
            extRequestStub.get = function(obj, cb) {
                assert.equal(obj.uri, "http://metrichor.local:8080/workflow_instance.js?apikey=FooBar02");
                cb(null, null, '{"workflow_instances":[{"id_workflow_instance":"149","state":"running","workflow_filename":"DNA_Sequencing.js","start_requested_date":"2013-09-16 09:25:15","stop_requested_date":"2013-09-16 09:26:04","start_date":"2013-09-16 09:25:17","stop_date":"2013-09-16 09:26:11","control_url":"127.0.0.1:8001","data_url":"localhost:3006"}]}');
            };
      
            Client.workflow_instances(function(err, obj) {
                assert.equal(err, null, 'no error reported');
                assert.deepEqual(obj, [{"id_workflow_instance":"149","state":"running","workflow_filename":"DNA_Sequencing.js","start_requested_date":"2013-09-16 09:25:15","stop_requested_date":"2013-09-16 09:26:04","start_date":"2013-09-16 09:25:17","stop_date":"2013-09-16 09:26:11","control_url":"127.0.0.1:8001","data_url":"localhost:3006"}], 'workflow instance list');
            });
        });

        it('should read a workflow_instance', function() {
            var Client = new metrichor({
                "url"    : "http://metrichor.local:8080",
                "apikey" : "FooBar02"
            });
      
            extRequestStub.get = function(obj, cb) {
                assert.equal(obj.uri, "http://metrichor.local:8080/workflow_instance/149.js?apikey=FooBar02");
                cb(null, null, '{"id_workflow_instance":"149","state":"running","workflow_filename":"DNA_Sequencing.js","start_requested_date":"2013-09-16 09:25:15","stop_requested_date":"2013-09-16 09:26:04","start_date":"2013-09-16 09:25:17","stop_date":"2013-09-16 09:26:11","control_url":"127.0.0.1:8001","data_url":"localhost:3006"}');
            };
      
            Client.workflow_instance(149, function(err, obj) {
                assert.equal(err, null, 'no error reported');
                assert.deepEqual(obj, {"id_workflow_instance":"149","state":"running","workflow_filename":"DNA_Sequencing.js","start_requested_date":"2013-09-16 09:25:15","stop_requested_date":"2013-09-16 09:26:04","start_date":"2013-09-16 09:25:17","stop_date":"2013-09-16 09:26:11","control_url":"127.0.0.1:8001","data_url":"localhost:3006"}, 'workflow read');
            });
        });

        it('should post telemetry', function() {
            var Client = new metrichor({
                    "url"    : "http://metrichor.local:8080",
                    "apikey" : "FooBar02"
            });

            extRequestStub.post = function(obj, cb) {
                assert.equal(obj.uri,         "http://metrichor.local:8080/workflow_instance/telemetry/150.js");
                assert.equal(obj.form.apikey, "FooBar02");
                cb(null, null, '{"tracers":{}, "packets":{}}');
            };

            Client.telemetry(150, {"tracers":{}, "packets":{}}, function(err, obj) {
                assert.equal(err, null, 'no error reported');
                assert.deepEqual(obj, {"tracers":{}, "packets":{}}, 'telemetry returned');
            });
        });

        it('should post telemetry with agent_version', function() {
            var Client = new metrichor({
                "url"           : "http://metrichor.local:8080",
                "apikey"        : "FooBar02",
                "agent_version" : "0.18.23456"
            });

            extRequestStub.post = function(obj, cb) {
                assert.equal(obj.uri,                "http://metrichor.local:8080/workflow_instance/telemetry/150.js");
                assert.equal(obj.form.apikey,        "FooBar02");
                assert.equal(obj.form.agent_version, "0.18.23456");
                cb(null, null, '{"tracers":{}, "packets":{}}');
            };

            Client.telemetry(150, {"tracers":{}, "packets":{}}, function(err, obj) {
                assert.equal(err,     null, 'no error reported');
                assert.deepEqual(obj, {"tracers":{}, "packets":{}}, 'telemetry returned');
            });
        });
    });
});
