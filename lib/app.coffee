
EventEmitter = require('events').EventEmitter
API = require './Classes/MetrichorAPI'
LocalDirectory = require './Classes/LocalDirectory'
RemoteDirectory = require './Classes/RemoteDirectory'




# Start Here. This main script just does basic routing. Most of the application logic happens in the class files. So, we Import and create a single instance of each of our three classes, these classes will last the lifetime of the application. The api gets created first and passed into the two directory classes which means they can share the instance and token persistance stuff that the API manages. We also bind progress listeners onto the two directory classes so they can send us status updates.

class MetrichorAPI extends EventEmitter
  constructor: (options) ->
    @api = new API options
    @localDirectory = new LocalDirectory options.inputFolder, @api
    @remoteDirectory = new RemoteDirectory options, @api

    @localDirectory.on 'progress', => @emit 'progress', @stats()
    @remoteDirectory.on 'progress', => @emit 'progress', @stats()





  # If some stats are requested, (either by an event emitter or directly by someone using this module), we collate them together here and return them.

  stats: ->
    return stats =
      instance: @api.currentInstance.id
      upload: @localDirectory.stats
      download: @remoteDirectory.stats




  # Create a new App Instance or join an existing one. The api will remember the new instance after it's been created or joined (in fact, the api is the only thing that will retain this state). We can then start the two directories and we're ready to go.

  create: (config, done) ->
    @api.createInstance config, (error, instance) =>
      console.log "Created Instance #{@api.currentInstance.id}"
      @join @api.currentInstance.id, done

  join: (instance_id, done) ->
    @api.loadInstance instance_id, (error) =>
      @localDirectory.start (error) =>
        @remoteDirectory.start (error) =>
          console.log "Joined Instance #{@api.currentInstance.id}"
          done? no, @api.currentInstance.id




  # First stop the two directories and then stop the running App Instance when requested. Reset is a command which restores the localDirectory back to its original state.

  stop: (done) ->
    @localDirectory.stop (error) =>
      @remoteDirectory.stop (error) =>
        @api.stopInstance (error, response) =>
          console.log "Stopped Running Instance"
          done? no

  reset: (done) ->
    @localDirectory.reset done




  # Pause and Resume. These functions just call their counterparts on both the Local and Remote directories. They stop uploading, downloading and batching without killing the instance.

  pause: (done) ->
    @localDirectory.pause (error) =>
      @remoteDirectory.pause (error) =>
        done? no

  resume: (done) ->
    @localDirectory.resume (error) =>
      @remoteDirectory.resume (error) =>
        done? no




  # Redefine some legacy method names and Export the project.

  autoStart: (config, done) -> @create config, done
  autoJoin: (id, done) -> @join id, done
  stop_everything: (done) -> @stop done

module.exports.version = '2.50.0'
module.exports = MetrichorAPI
