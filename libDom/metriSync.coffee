
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




  # Start an experiment. This will create a new instance

  autoStart: (config, done) ->
    @localDirectory.reset (error) =>
      @metrichorAPI.start_workflow config, (error, instance) =>
        return (done(new Error error) if done) if error
        if instance.state is 'stopped'
          return (done(new Error "Workflow didn't start") if done)

        @localDirectory.start instance, (error) =>
          @remoteDirectory.start instance, (error) =>
            console.log "Started workflow #{instance.id_workflow_instance}"
            return (done() if done) no




  # Resume an experiment. This will pass the id to the metrichor API in order to get the instance. In the absense of an ID, this will start a new instance.

  autoJoin: (id, done) ->
    @metrichorAPI.workflow_instance id, (error, instance) =>
      return done new Error error if error
      if instance.state is 'stopped'
        return (done(new Error "Workflow didn't start") if done)
      console.log "Joined workflow #{instance.id_workflow_instance}"
      @localDirectory.start instance, (error) =>
        @remoteDirectory.start instance, (error) =>
          return done no




  stop_everything: (done) ->
    @localDirectory.stop()
    done() if done





# Export the API. Create a little project server to test things.

module.exports.version = '2.40.0'
module.exports = metriSync

app = require('express')().listen 3000
sync = new metriSync
  agent_address:
    geo:
      lat: '50'
      lng: '0'
      remote_addr: '193.240.53.18'
  agent_version: "2.40.16"
  apikey: "bb23e4e9dbb55468b058331b42d6178c3abbb041"
  downloadMode: "data+telemetry"
  filter: "on"
  inputFolder: "/Users/dvinyard/Documents/Dev/api/input"
  outputFolder: "/Users/dvinyard/Documents/Dev/api/output"
  sortInputFiles: no
  uploadedFolder: "+uploaded"
  url: "https://metrichor.com"

test = ->
  hi = 'hi'
  console.log hi

process.stdin.resume().setEncoding('utf8').on 'data', (text) ->
  command = text.replace '\n', ''
  sync.autoStart workflow: 627 if command is 'start'
  sync.localDirectory.reset() if command is 'reset'
  test() if command is 'hi'
