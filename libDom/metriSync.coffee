
# metriSync. We create the directory singleton; this will attempt to tame the directory into batches for uploading upon autoStart. We also define the metrichorAPI module which will handle API requests. Reference each module's stats object.

MetrichorAPI = require './Classes/MetrichorAPI'
LocalDirectory = require './Classes/LocalDirectory'
RemoteDirectory = require './Classes/RemoteDirectory'

class metriSync
  constructor: (options) ->
    @metrichorAPI = new MetrichorAPI options
    @localDirectory = new LocalDirectory options
    @remoteDirectory = new RemoteDirectory options

    @stats =
      upload: @localDirectory.stats
      download: @remoteDirectory.stats




  # Start an experiment. This will call the autoJoin function above with no ID in order to start a new instance.

  autoStart: (config, done) ->
    @localDirectory.reset (error) =>
      @metrichorAPI.start_workflow config, (error, instance) =>
        return done new Error error if error
        if id and instance.state is 'stopped'
          return done new Error "#{id} not running"

        @localDirectory.start id, (error) =>
          @remoteDirectory.start id, (error) =>
            console.log "Started workflow #{instance}"
            return done no




  # Resume an experiment. This will pass the id to the metrichor API in order to get the instance. In the absense of an ID, this will start a new instance.

  autoJoin: (id, done) ->
    @metrichorAPI.workflow_instance id, (error, instance) =>
      return done new Error error if error
      if id and instance.state is 'stopped'
        return done new Error "#{id} not running"

      @localDirectory.start id, (error) =>
        @remoteDirectory.start id, (error) =>
          console.log "Joined workflow #{instance}"
          return done no




# Export the API. Create a little project to test things.

module.exports.version = '2.40.0'
module.exports = metriSync

app = require('express')().listen 3000
sync = new metriSync
  localDirectoryLocation: '/Users/dvinyard/Documents/Dev/api/libDom/input'

process.stdin.resume().setEncoding('utf8').on 'data', (text) ->
  function_name = text.replace '\n', ''
  sync.localDirectory[function_name]() if sync.localDirectory[function_name]
