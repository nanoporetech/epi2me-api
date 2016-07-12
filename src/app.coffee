
# MetrichorAPI. This main script just does basic routing. Most of the application logic happens in the class files. So, we Import and create a single instance of each of our three classes, these classes will last the lifetime of the application. We also watch for events here. Fatal, fatal will stop the instance, reset the local directory and send a message to the agent.

EventEmitter = require('events').EventEmitter
MetrichorAPI = require './Classes/MetrichorAPI'
SSD = require './Classes/SSD'
AWS = require './Classes/AWS'

path = require 'path'
fs = require 'fs'
os = require 'os'

class MetrichorSync extends EventEmitter
  constructor: (@options) ->
    return new Error 'No Options' if not @options
    if not @options.outputFolder
      @options.outputFolder = path.join @options.inputFolder, 'downloads'
    @api = new MetrichorAPI @options
    @ssd = new SSD @options
    @aws = new AWS @options, @api, @ssd
    @aws.on 'progress', @stats
    @ssd.on 'progress', @stats
    @aws.on 'status', (message) => @status "AWS: #{message}"
    @ssd.on 'status', (message) => @status "SSD: #{message}"
    @aws.on 'fatal', (fatalMessage) =>
      if @onFatal
        @pause (error) =>
          @resetLocalDirectory (error) =>
            @onFatal fatalMessage, no




  # Handle a status message

  status: (message) =>
    @emit 'status', message
    id = @api.instance.id
    return if not id
    if not @logStream
      log = path.join @options.outputFolder, "agent-#{id}.log"
      return if not fs.existsSync log
      @logStream = fs.createWriteStream log, {flags: "a"}
    @logStream.write "[#{new Date().toISOString()}] #{message} #{os.EOL}"




  # Collate the stats from the local and AWS directories into upload and download properties which are structured to be compatable with the existing agent. This is not the most optimal way of doing things.

  stats: (key) =>
    @emit 'progress', @latestStats =
      instance: @api.instance.id
      upload:
        success: @ssd.stats?.uploaded or 0
        totalSize: @ssd.stats?.uploaded or 0
        total: @ssd.stats?.total or 0
      download:
        success: @ssd.stats?.downloaded
        totalSize: @ssd.stats?.downloaded
      all:
        ssd: @ssd.stats
        aws: @aws.stats

    return @latestStats[key] if key
    return @latestStats




  # Create a new App Instance or join an existing one. The api will remember the new instance after it's been created or joined. We can then start the two directories and we're ready to go. If {manualSync: true} was passed into the initial options, we will not start the two directories, we will instead wait for a 'resume' command to be issued before starting the directories.

  create: (config, done) ->
    @api.createNewInstance config, (error, instanceID) =>
      return done? error if error
      @emit 'status', "Created Instance #{instanceID}"
      @join instanceID, done

  join: (instanceID, done) ->
    @api.loadInstance instanceID, (error, instance) =>
      return done? error if error
      @emit 'status', "Joined Instance #{@api.instance.id}"
      return done? no, instanceID if @options.manualSync
      @resume done




  # Stop the current instance. When a stop command is issued, first stop the two directories and then stop the running App Instance when requested. resetLocalDirectory is a command which restores the localDirectory back to its original state before it was batched.

  stop: (done) ->
    @pause =>
      loadedInstance = @api.instance.id
      @latestStats = {}
      @api.stopLoadedInstance (error, response) =>
        return done? error if error
        @emit 'status', "Stopped Instance #{loadedInstance}"
        done? no

  resetLocalDirectory: (done) ->
    @ssd.reset (error) =>
      return done? error if error
      @emit 'status', "Local Directory Reset"
      done?()




  # Pause and Resume the current instance. These functions just stop and resume the Local and Remote directories. They stop uploading, downloading and batching without killing the instance.

  # We need to talk about onFatal. onFatal hangs onto the completion handler for resume. At any point we can pass an error in and the agent will display it as if there was an error connecting. This is not a good pattern and should be scrapped as soon as the agent can be re-written to accomodate runtime errors more elegantly.

  pause: (done) ->
    return done? new Error 'No App Instance Running' if not @api.instance.id
    @ssd.stop (error) =>
      return done? error if error
      @aws.stop (error) =>
        return done? error if error
        @emit 'status', "Instance #{@api.instance.id} Paused"
        done? no

  resume: (done) ->
    @onFatal = (error) -> done error, no
    return done? new Error 'No App Instance Found' if not @api.instance.id
    @ssd.freeSpace (error) =>
      return done? error if error
      @ssd.createSubdirectories (error) =>
        return done? error if error
        @ssd.checkPermissions (error) =>
          return done? error if error
          @ssd.createTelemetry @api.instance.id, (error) =>
            return done? error if error
            @ssd.start (error) =>
              return (@pause -> done? error) if error
              @aws.start (error) =>
                return (@pause -> done? error) if error
                @emit 'status', "Instance #{@api.instance.id} Syncing"
                @stats()
                done? no, id_workflow_instance: @api.instance.id




  # Redefine some legacy method names, add a few coninience methods expected by agent, export the project.

  url: -> @options.url
  apikey: -> @options.apikey
  attr: (key, value) -> @options[key] = (value or @options[key])
  autoStart: (config, done) -> @create config, done
  autoJoin: (id, done) -> @join id, done
  stop_everything: (done) -> @stop done
  workflows: (done) -> @api.listApps done
  workflow_instances: (done) -> @api.listInstances done
  workflow_config: (id, done) -> @api.getAppConfig id, done
  workflow: (id, done) -> @api.getApp id, done

module.exports.version = '2.50.0'
module.exports = MetrichorSync
