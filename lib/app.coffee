
EventEmitter = require('events').EventEmitter
API = require './Classes/MetrichorAPI'
LocalDirectory = require './Classes/LocalDirectory'
RemoteDirectory = require './Classes/RemoteDirectory'




# MetrichorAPI. This main script just does basic routing. Most of the application logic happens in the class files. So, we Import and create a single instance of each of our three classes, these classes will last the lifetime of the application. The api gets created first and passed into the two directory classes which means they can share the instance and token persistance stuff that the API stores and manages. We also bind progress listeners onto the two directory classes so they can send us status updates.

class MetrichorAPI extends EventEmitter
  constructor: (options) ->
    @manualSync = options.manualSync

    @api = new API options
    @localDirectory = new LocalDirectory options.inputFolder, @api
    @remoteDirectory = new RemoteDirectory options, @api

    @localDirectory.on 'progress', => @stats()
    @remoteDirectory.on 'progress', => @stats()




  # Collate stats from our class instances. If some stats are requested (either by an event emitter or directly by someone using this module) we collate them together here.

  stats: ->
    return if not (@localDirectory.stats and @remoteDirectory.stats)
    @emit 'progress', stats =
      instance: @api.currentInstance.id
      upload: @localDirectory.stats
      download: @remoteDirectory.stats




  # Create a new App Instance or join an existing one. The api will remember the new instance after it's been created or joined. We can then start the two directories and we're ready to go. If {manualSync: true} was passed into the initial options, we will not start the two directories, we will instead wait for a 'resume' command to be issued.

  create: (config, done) ->
    @api.createInstance config, (error, instance) =>
      return done? new Error error if error
      @emit 'status', "Created Instance #{@api.currentInstance.id}"
      @join @api.currentInstance.id, done

  join: (instance_id, done) ->
    @api.loadInstance instance_id, (error) =>
      return done? error if error
      @emit 'status', "Joined Instance #{@api.currentInstance.id}"
      return done? no if @manualSync
      @localDirectory.start (error) =>
        return done? error if error
        @remoteDirectory.start (error) =>
          return done? error if error
          done? no




  # Stop the current instance. When a stop command is issued, first stop the two directories and then stop the running App Instance when requested. Reset is a command which restores the localDirectory back to its original state.

  stop: (done) ->
    @localDirectory.stop (error) =>
      @remoteDirectory.stop (error) =>
        current_instance = @api.currentInstance.id
        @api.stopCurrentInstance (error, response) =>
          return done? error if error
          @emit 'status', "Stopped Instance #{current_instance}"
          done? no

  resetLocalDirectory: (done) ->
    @localDirectory.reset (error) =>
      return done? error if error
      @emit 'status', "Local Directory Reset"
      done?()




  # Pause and Resume the current instance. These functions just call their counterparts on both the Local and Remote directories. They stop uploading, downloading and batching without killing the instance.

  pause: (done) ->
    return done? new Error 'No App Instance Running' if not @api.currentInstance
    @localDirectory.stop (error) =>
      @remoteDirectory.stop (error) =>
        @emit 'status', "Instance #{@api.currentInstance.id} Paused"
        done? no

  resume: (done) ->
    return done? new Error 'No App Instance Found' if not @api.currentInstance
    @localDirectory.start (error) =>
      @remoteDirectory.start (error) =>
        @emit 'status', "Instance #{@api.currentInstance.id} Resumed"
        done? no




  # Redefine some legacy method names and Export the project.

  autoStart: (config, done) -> @create config, done
  autoJoin: (id, done) -> @join id, done
  stop_everything: (done) -> @stop done
  workflows: (done) -> @api.listApps done
  workflow_instances: (done) -> @api.listInstances done
  workflow_config: (id, done) -> @api.getAppConfig id, done
  workflow: (id, done) -> @api.getApp id, done

module.exports.version = '2.50.0'
module.exports = MetrichorAPI
