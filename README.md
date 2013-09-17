metrichor

Metrichor Portal API

require('path/to/ONT/metrichor');

var Client = new metrichor();

This sets up a Client with the default host (localhost), port (80) and protocol (http)

These can be set on creation (suggested) or modified once built

var Client = new metrichor({
  host:     'localhost',
  port:     8080,
  protocol: 'http'
});

Client.host('localhost');
Client.port(8080);
Client.protocol('http');

Client.host() (and the others) will retrieve the current values as well

methods:

Client.list_workflows(callback);
Client.read_workflow(workflow_id, callback);
instance_id = Client.start_workflow(workflow_id);
Client.stop_workflow(instance_id);

File-backed api

You may give a file url instead of a portal url, in which case the api acts in read-only mode drawing protocol workflows based on the url given. (This is determined by the url having http at the start or not)

You may give the full path to one protocol workflow file, or a directory.

If one is given, then workflows returns an array of one, and workflow does not need an id provided

If a directory is given, then workflows returns all files in that directory, and then one of these can be selected for the id to workflow

As this is readonly, if workflow receives and object, it immediately returns the cb with that object;

If any other methods are called, then they populate the error argument to the callback with a message.
