metrichor

Metrichor Portal API

var metrichor = require('metrichor-api');

var MetAPI = new metrichor();

This sets up a metrichor service client with the default URL.

These can be set on creation (suggested) or modified once built

var MetAPI = new metrichor({
  url: "https://metrichor.com/"
});

MetAPI.url('http://localhost:8080/');

methods:

MetAPI.workflows(callback);
MetAPI.read_workflow(workflow_id, callback);
instance_id = MetAPI.start_workflow(workflow_id);
MetAPI.stop_workflow(instance_id);

File-backed api

You may give a file url instead of a portal url, in which case the api acts in read-only mode drawing protocol workflows based on the url given. (This is determined by the url having http at the start or not)

You may give the full path to one protocol workflow file, or a directory.

If one is given, then workflows returns an array of one, and workflow does not need an id provided

If a directory is given, then workflows returns all files in that directory, and then one of these can be selected for the id to workflow

As this is readonly, if workflow receives and object, it immediately returns the cb with that object;

If any other methods are called, then they populate the error argument to the callback with a message.
