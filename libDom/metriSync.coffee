
# metriSync. We create the directory singleton; this will attempt to tame the directory into batches for uploading upon autoStart. We also define the metrichorAPI module which will handle API requests. Reference each module's stats object.

MetrichorAPI = require './Classes/MetrichorAPI'
LocalDirectory = require './Classes/LocalDirectory'
RemoteDirectory = require './Classes/RemoteDirectory'

console.log 'class'

class metriSync
  constructor: (options) ->
    console.log 'inst'
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
        console.log instance
        return (done(new Error error) if done)
        if id and instance.state is 'stopped'
          return (done(new Error "#{id} not running") if done)

        @localDirectory.start id, (error) =>
          @remoteDirectory.start id, (error) =>
            console.log "Started workflow #{instance}"
            return (done() if done) no




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




    stop_everything: (done) ->
      that = this
      if _config.instance.id_workflow_instance
        that.stop_workflow _config.instance.id_workflow_instance, ->
          that.log.info 'workflow instance ' + _config.instance.id_workflow_instance + ' stopped'
          return
      if that._downloadCheckInterval
        that.log.info 'clearing _downloadCheckInterval interval'
        clearInterval that._downloadCheckInterval
        that._downloadCheckInterval = null
      if that._stateCheckInterval
        that.log.info 'clearing stateCheckInterval interval'
        clearInterval that._stateCheckInterval
        that._stateCheckInterval = null
      if that._fileCheckInterval
        that.log.info 'clearing _fileCheckInterval interval'
        clearInterval that._fileCheckInterval
        that._fileCheckInterval = null
      if that.uploadWorkerPool
        that.log.info 'clearing uploadWorkerPool'
        that.uploadWorkerPool.drain()
        that.uploadWorkerPool = null
      if that.downloadWorkerPool
        that.log.info 'clearing downloadWorkerPool'
        that.downloadWorkerPool.drain()
        that.downloadWorkerPool = null
      done() if done





# Export the API. Create a little project server to test things.

module.exports.version = '2.40.0'
module.exports = metriSync

app = require('express')().listen 3000
sync = new metriSync
  localDirectoryLocation: '/Users/dvinyard/Documents/Dev/api/libDom/input'

process.stdin.resume().setEncoding('utf8').on 'data', (text) ->
  command = text.replace '\n', ''

  if command is 'start'
    sync.autoStart
      localDirectoryLocation: '/Users/dvinyard/Documents/Dev/api/libDom/input'
      id_workflow_instance: no
