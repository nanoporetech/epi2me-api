
EventEmitter = require('events').EventEmitter
MetrichorAPI = require './Classes/MetrichorAPI'
SSD = require './Classes/SSD'
AWS = require './Classes/AWS'




# MetrichorAPI. This main script just does basic routing. Most of the application logic happens in the class files. So, we Import and create a single instance of each of our three classes, these classes will last the lifetime of the application. We also watch for events.

class MetrichorSync extends EventEmitter
  constructor: (@options) ->
    return new Error 'No Options' if not @options
    @api = new MetrichorAPI @options
    @ssd = new SSD @options, @api
    @aws = new AWS @options, @api, @ssd
    @aws.on 'progress', @stats
    @ssd.on 'progress', @stats
    @aws.on 'status', (status) => @emit 'status', "AWS: #{status}"
    @ssd.on 'status', (status) => @emit 'status', "SSD: #{status}"
    @aws.on 'fatal', (error) =>
      @onFatal(error, no) if @onFatal
      @pause()




  # Collate the stats from the local and AWS directories into upload and download properties which are structured to be compatable with the existing agent.

  stats: (key) =>
    if @ssd.stats and @aws.stats?.sqs
      processed = @ssd.stats.downloaded + @aws.stats.sqs.output.visible + @aws.stats.sqs.output.flight
    @emit 'progress', @latestStats =
      instance: @api.loadedInstance
      upload:
        success: @ssd.stats?.uploaded or 0
        failure: {} #unused currently
        queueLength: 0
        totalSize: @ssd.stats?.uploaded or 0
        total: @ssd.stats?.total or 0 #including failed
      download:
        success: @ssd.stats?.downloaded
        fail: 0
        failure: {}
        queueLength: 0
        totalSize: @ssd.stats?.downloaded

    # console.log "\n\n\n\n#{JSON.stringify @latestStats, null, 2}"
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
      @emit 'status', "Joined Instance #{@api.loadedInstance}"
      return done? no, instanceID if @options.manualSync
      @aws.instance = instance
      @resume done




  # Stop the current instance. When a stop command is issued, first stop the two directories and then stop the running App Instance when requested. resetLocalDirectory is a command which restores the localDirectory back to its original state before it was batched.

  stop: (done) ->
    @pause =>
      loadedInstance = @api.loadedInstance
      @aws.instance = no
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

  # On Fatal passes a message back to the error handler for the start or resume commands, this should make it show up the agent with the current implementation.

  pause: (done) ->
    return done? new Error 'No App Instance Running' if not @api.loadedInstance
    @ssd.stop (error) =>
      return done? error if error
      @aws.stop (error) =>
        return done? error if error
        @emit 'status', "Instance #{@api.loadedInstance} Paused"
        done? no

  resume: (done) ->
    @onFatal = (error) => done error, no
    return done? new Error 'No App Instance Found' if not @api.loadedInstance
    @ssd.freeSpace (error) =>
      return done? error if error
      @ssd.checkPermissions (error) =>
        return done? error if error
        @ssd.start (error) =>
          return (@pause => done? error) if error
          @aws.start (error) =>
            return (@pause => done? error) if error
            @emit 'status', "Instance #{@api.loadedInstance} Syncing"
            @stats()
            done? no, id_workflow_instance: @api.loadedInstance




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
