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


Constructor options:

```
{
    agent_version
    agent_address                           // Geo location and ip
    apikey
    proxy
    url
    user_agent
    region
    retention
    telemetryCb
    dataCb
    sessionGrace
    remoteShutdownCb                        // callback for remote shutdown of

    awsAcceleration                         // Use AWS Acceleration - boosts download / upload speeds
    inputFolder
    inputFormat
    sortInputFiles                          // MC-2535 - sort files to be uploaded
    uploadPoolSize                          // Parallelism of upload queue
    uploadTimeout                           // upload stream timeout after 300s
    uploadBatchSize                         // Size of each batch upload
    fileCheckInterval                       // Seconds between loadUploadFiles()
    downloadCheckInterval                   // Seconds between loadAvailableMessages()
    stateCheckInterval                      // Seconds between instance state is checked in metrichor
    initDelay                               // Seconds between loadAvailableMessages()

    outputFolder
    uploadedFolder                          // folder where files are placed once uploaded
    inFlightDelay                           // wait 5 mins before resub
    waitTimeSeconds                         // long-poll wait 20 seconds for messages
    waitTokenError                          // wait 30 seconds if token fetch threw an error
    downloadTimeout                         // download stream timeout after 300s
    downloadPoolSize                        // MC-505 how many things to download at once
    filter
    filterByChannel                         // MC-508 filter downloads by channel
    downloadMode
    deleteOnComplete                        // MC-212
}
```