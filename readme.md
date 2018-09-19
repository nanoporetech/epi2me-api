<a href="http://metrichor.com"><img src="https://metrichor.com/gfx/logo_print.png" height="74" align="right"></a>

# Metrichor API

Test Coverage
[![coverage report](https://git.oxfordnanolabs.local/metrichor/api/badges/coverage.svg)]
is hosted on Gitlab-Pages at:
https://metrichor.git.oxfordnanolabs.local/api/


### Getting Started
```js
const API = require('epi2me-api');
let EPI2ME = new API({
    "url": "custom EPI2ME host" || "https://epi2me.nanoporetech.com",
    "apikey": "<your api key>",
    "inputFolder": "<files to upload>",
    "uploadedFolder": "<where to move files after uploading>",
    "outputFolder": "<where to download files>"
})
// list of all options: ./lib/default_options.json

// list all workflows
EPI2ME.workflows(callback);

// list all workflows
EPI2ME.read_workflow(workflow_id, callback);

// start a newEPI2ME instance: callback(error, instance)
EPI2ME.start_workflow(workflow_id, callback);

// stop an instance: callback(error)
EPI2ME.stop_workflow(instance_id);

// stop all current uploads / downloads: callback(error)
EPI2ME.stop_everything();
```
### Constructor options:

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
    stateCheckInterval                      // Seconds between instance state is checked in EPI2ME
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
### File management
Dealing with the large number of read files is a considerable challenge:

##### Step 1: Input:
MinKNOW may batch the files into folders of ~1000. The epi2me-api object will scan the input-folder (including any sub-directories) for .fast5 files. Because of the potential strain the fs.readdir operation puts on the system, it's run as infrequently as possible.
```js
// trigger fs.readdir
EPI2ME_api.loadUploadFiles()
// once done, it pushes a list of new files into uploadWorkerPool
```

Batched folder structure:
```
├── inputFolder
|   ├──  MinKNOW batch1
|   |   ├── *.fast5
|   ├──  ...
|   ├──  MinKNOW batch-n
```

Flat folder structure:
```
├── inputFolder
|   ├── *.fast5
```

The EPI2ME api supports both folder structures as input. If the uploadedFolder or the outputFolder are subdirectories of the input folder, the .fast5 files they contain will be excluded.

##### Step 2: Uploaded
Once a file has been successfully uploaded, it will be moved to the uploadedFolder. The batched folder structure is maintained:
```
├── uploadedFolder
|   ├──  MinKNOW batch1
|   |   ├── *.fast5
|   ├──  ...
|   ├──  MinKNOW batch-n
```

##### Step 3: Download
Once the read has been succesfully processed in the EPI2ME Workflow, a message will appear on the SQS output queue, which is monitored by the epi2me-api. The output file is downloaded to the downloads folder. These files will also be batched into sub-folders whose names are completely arbitrary (and set by the metchor-api). Note that these names are not linked to the batch names created by MinKNOW
```
├── outputFolder
|   ├── fail
|   |   ├──  EPI2ME batch1
|   |   ├──  ...
|   |   ├──  EPI2ME batch-n
|   └── pass
|   |   ├──  EPI2ME batch1
|   |   ├──  ...
|   |   ├──  EPI2ME batch-n
```

###### Notes on EPI2ME Worker Folder Hint
The EPI2ME Worker may pass a specific folder hint in each SQS message (SQS.messageBody.telemetry.hints). If this flag exists, output files will be split according to exit-status into either "pass" or "fail" folders.

There's also the "telemetry.hints.folder" flag, which is used by the Barcoding workflow to split files by barcode:
```
├── outputFolder
|   ├── BC01
|   |   ├── fail
|   |   |   ├──  EPI2ME batch1
|   |   |   ├──  ...
|   |   |   ├──  EPI2ME batch-n
|   |   └── pass
|   |   |   ├──  EPI2ME batch1
|   |   |   ├──  ...
|   |   |   ├──  EPI2ME batch-n
|   ├── BC02
|   ...
```

### File-backed api

You may give a file url instead of a portal url, in which case the api acts in read-only mode drawing protocol workflows based on the url given. (This is determined by the url having http at the start or not)

You may give the full path to one protocol workflow file, or a directory.

If one is given, then workflows returns an array of one, and workflow does not need an id provided

If a directory is given, then workflows returns all files in that directory, and then one of these can be selected for the id to workflow

As this is readonly, if workflow receives and object, it immediately returns the cb with that object;

If any other methods are called, then they populate the error argument to the callback with a message.
