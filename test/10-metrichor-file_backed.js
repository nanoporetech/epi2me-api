var assert         = require("assert")
var metrichor      = require('../lib/ONT/metrichor');
var fs = require('fs');

var cwd = process.cwd();

console.log(cwd);

describe('Array', function(){
  describe('metrichor', function(){

	  it('should create a metrichor from constructor with file url', function() {
	    var Client;
	    assert.doesNotThrow( function () {
		    Client = new metrichor( {
		      url : cwd + '/test/data/workflows/Load.js'
		    } );
	    }, Error, 'Client obtained');

	    assert.equal(Client.file_backed, true, 'file backed');
      Client.workflows(function(err, arr) {
        assert.equal(err, null, 'no error');
        assert.equal(arr[0].filename, 'Load.js', 'file url arr[0].filename');
        assert.equal(arr[0].description, 'Load.js', 'file url arr[0].description');
        assert.equal(arr.length, 1, 'only one returned');

      })

      Client.workflow( function (err, body) {
        assert.equal(body.description, 'Load', 'loaded ok - cb in id space');
        assert.equal(body.rev, '1.0', 'loaded ok - cb in id space');
      } );

      Client.workflow( null, function (err, body) {
        assert.equal(body.description, 'Load', 'loaded ok - cb in obj space - no id');
        assert.equal(body.rev, '1.0', 'loaded ok - cb in obj space - no id');
      } );

      Client.workflow( 'Load.js', function (err, body) {
        assert.equal(body.description, 'Load', 'loaded ok - cb in obj space - id matched url');
      } );

      Client.workflow( 'Unload.js', function (err, body) {
        assert.equal(err, "id's don't match", 'error - cb in obj space - id does not match url');
      } );

      Client.workflow( 'Load.js', {}, function (err, body) {
        assert.deepEqual(body, {}, 'workflow - id matches url with object');
      } );

      Client.workflow( null, {}, function (err, body) {
        assert.equal(err, "No id", "workflow - no id with object");
      } );

      Client.workflow( 'Unload.js', {}, function (err, body) {
        assert.equal(err, "id's don't match", "workflow - id doesn't match url with object");
      } );

	  });

	  it('should create a metrichor from constructor with file url starting file:///', function() {
	    var Client;
	    assert.doesNotThrow( function () {
		    Client = new metrichor( {
		      url : 'file://'+cwd + '/test/data/workflows/Load.js'
		    } );
	    }, Error, 'Client obtained');

	    assert.equal(Client.file_backed, true, 'file backed');
	    assert.equal(Client._url, cwd + '/test/data/workflows/Load.js', 'file:/// based url - sorted correctly');
      Client.workflows(function(err, arr) {
        assert.equal(err, null, 'no error');
        assert.equal(arr[0].filename, 'Load.js', 'file url arr[0].filename');
        assert.equal(arr.length, 1, 'only one returned');
      })

      Client.workflow( null, function (err, body) {
        assert.equal(body.description, 'Load', 'loaded ok - cb in obj space - file:/// based url');
        assert.equal(body.rev, '1.0', 'loaded ok - cb in obj space - file:/// based url');
      } );

    });

	  it('should create a metrichor from constructor with dir url', function() {
	    var Client;
	    assert.doesNotThrow( function () {
		    Client = new metrichor( {
		      url : cwd + '/test/data/workflows'
		    } );
	    }, Error, 'Client obtained');

	    assert.equal(Client.file_backed, true, 'file backed');
      Client.workflows(function(err, arr) {
        assert.equal(err, null, 'no error');
        assert.equal(arr[0].filename, 'Load.js', 'file url arr.filename');
        assert.equal(arr[0].description, 'Load.js', 'file url arr.description');
        assert.equal(arr[1].filename, 'Unload.js', 'file url arr.filename');
        assert.equal(arr[1].description, 'Unload.js', 'file url arr.description');
        assert.equal(arr.length, 2, 'two returned');
      })

      Client.workflow( 'Unload.js', function (err, body) {
        assert.equal(body.description, 'Unload', 'loaded ok - cb in obj space with id');
        assert.equal(body.rev, '1.0', 'loaded ok - cb in obj space with id');
      } );
    });
	  it('should create handle a windows url', function() {
	    var Client;
	    assert.doesNotThrow( function () {
		    Client = new metrichor( {
		      url : 'C:\\test\\data\\workflows'
		    } );
	    }, Error, 'Client obtained');
      assert.equal(Client._url, 'C:/test/data/workflows', 'Windows url converted ok');
    })

    it('should fill in error of callback if not applicable for file_backed (offline)', function () {
	    var Client;
	    assert.doesNotThrow( function () {
		    Client = new metrichor( {
		      url : cwd + '/test/data/workflows'
		    } );
	    }, Error, 'Client obtained');
      Client.start_workflow( 'Load.js', function (err, body) {
        assert.equal(err, 'start_workflow not applicable to file_backed resource (offline)', 'no start_workflow when offline');
      });
      Client.stop_workflow( 'Load.js', function (err, body) {
        assert.equal(err, 'stop_workflow not applicable to file_backed resource (offline)', 'no stop_workflow when offline');
      });
      Client.workflow_instances( function (err, body) {
        assert.equal(err, 'workflow_instances not applicable to file_backed resource (offline)', 'no workflow_instances when offline');
      });
      Client.workflow_instance( 'Load.js', function (err, body) {
        assert.equal(err, 'workflow_instance not applicable to file_backed resource (offline)', 'no workflow_instance when offline');
      } );
      Client.component_vitals( 'Load.js', {}, function (err, body) {
        assert.equal(err, 'component_vitals not applicable to file_backed resource (offline)', 'no workflow_instance when offline');
      } );
    });

  })
});