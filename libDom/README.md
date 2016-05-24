
MetrichorSync

# A tool for syncing .fast5 files to the cloud
# and accessing the Metrichor API.




# To get started, simply:

    var metrichor = require('metrichor-api');
    var MetAPI = new metrichor();




# Additionally it is possible to send in custom parameters. These are expected in the following format.

    var MetAPI = new metrichor({
      url: "https://metrichor.com/"
    });




# Where default values exist for these parameters they are shown beside the key in the table below.

    agent_version
    <!-- Description -->

    agent_address
    <!-- Description -->

    apikey
    <!-- Description -->

    dataCb
    <!-- Description -->

    deleteOnComplete: 'off'
    <!-- Description -->

    downloadMode: 'data+telemetry'
    <!-- Determines how much data will be downloaded for the user.
      - 'telemetry' (download only telemetry data)
      - 'data+telemetry' (download telemetry data and all .fast5 files)
      - 'successful+telemetry' (download telemetry data and only .fast5 files which successfully passed) -->

    filter: 'on'
    <!-- Description -->

    filterByChannel: 'off'
    <!-- Description -->

    inFlightDelay: 600
    <!-- Description -->

    initDelay: 10000
    <!-- Description -->

    inputFolder
    <!-- Description -->

    inputFormat: 'fast5'
    <!-- Description -->

    outputFolder
    <!-- Description -->

    proxy
    <!-- Description -->

    remoteShutdownCb
    <!-- Description -->

    sortInputFiles: false
    <!-- Description -->

    telemetryCb
    <!-- Description -->

    uploadQueueThreshold: 500
    <!-- Description -->

    uploadedFolder
    <!-- Description -->

    url: 'https://metrichor.com'
    <!-- Description -->

    user_agent: 'Metrichor API'
    <!-- Description -->

    waitTimeSeconds: 20
    <!-- Description -->

    waitTokenError: 30
    <!-- Description -->




methods:

MetAPI.workflows(callback);
MetAPI.read_workflow(workflow_id, callback);
instance_id = MetAPI.start_workflow(workflow_id);
MetAPI.stop_workflow(instance_id);

File-backed api

You may give a file url instead of a portal url, in which case the api acts in read-only mode drawing protocol workflows based on the url given.

You may give the full path to one protocol workflow file, or a directory.

If one is given, then workflows returns an array of one, and workflow does not need an id provided

If a directory is given, then workflows returns all files in that directory, and then one of these can be selected for the id to workflow

As this is readonly, if workflow receives and object, it immediately returns the cb with that object;

If any other methods are called, then they populate the error argument to the callback with a message.






  setOptions: (options) ->
    throw new Error "Invalid options object" if typeof options isnt 'object'
    options.url = options.url or 'https://metrichor.com'
    options.user_agent = options.user_agent or 'Metrichor API'
    options.uploadQueueThreshold = options.uploadQueueThreshold or 500
    options.initDelay = options.initDelay or 10000
    options.inFlightDelay = options.inFlightDelay or 600
    options.inputFormat = options.inputFormat or 'fast5'
    options.waitTimeSeconds = options.waitTimeSeconds or 20
    options.waitTokenError = options.waitTokenError or 30
    options.filter = options.filter or 'on'
    options.filterByChannel = options.filterByChannel or 'off'
    options.downloadMode = options.downloadMode or 'data+telemetry'
    options.deleteOnComplete = options.deleteOnComplete or 'off'
    return options




upload errors

throw new Error 'invalid chain' if typeof instance.chain isnt 'object'
throw new Error 'inputFolder not set' if not @options.inputFolder
throw new Error 'bucketFolder not set' if not instance.bucketFolder
throw new Error 'inputqueue not set' if not instance.inputqueue
throw new Error 'outputqueue not set' if not instance.outputqueue
