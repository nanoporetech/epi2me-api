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
