
EventEmitter = require('events').EventEmitter
MetrichorAPI = require './Classes/MetrichorAPI'
LocalDirectory = require './Classes/LocalDirectory'
AWSDirectory = require './Classes/AWSDirectory'




# MetrichorAPI. This main script just does basic routing. Most of the application logic happens in the class files. So, we Import and create a single instance of each of our three classes, these classes will last the lifetime of the application.

class MetrichorSync extends EventEmitter
  constructor: (@options) ->
    @api = new MetrichorAPI @options
    @localDirectory = new LocalDirectory @options
    @awsDirectory = new AWSDirectory @api
    @watchEvents()




  # Watch and emit events. Here we echo the progress from each of the two directories and also bind events so that the two directories can communicate for file transfers.

  watchEvents: ->
    @awsDirectory.on 'progress', => @stats()
    @localDirectory.on 'progress', => @stats()

    @localDirectory.on 'uploadFile', (file, done) =>
      @awsDirectory.uploadFile file, done
    @awsDirectory.on 'saveDownloadedFile', (stream, filename, done) =>
      @localDirectory.saveFile stream, filename, done




  # Collate the stats from the local and AWS directories.

  stats: ->
    return if not (@localDirectory.stats and @awsDirectory.stats?.sqs)
    local = @localDirectory.stats
    aws = @awsDirectory.stats
    @emit 'progress', stats =
      instance: @api.loadedInstance
      progress:
        files: local.total
        uploaded: local.downloaded + aws.sqs.output.visible
        downloaded: local.downloaded
      transfer:
        uploading: aws.uploading + aws.sqs.input.visible
        processing: aws.sqs.input.flight
        downloading: aws.downloading




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
      @awsDirectory.instance = instance
      @resume done




  # Stop the current instance. When a stop command is issued, first stop the two directories and then stop the running App Instance when requested. resetLocalDirectory is a command which restores the localDirectory back to its original state before it was batched.

  stop: (done) ->
    @localDirectory.stop (error) =>
      return done? error if error
      @awsDirectory.stop (error) =>
        return done? error if error
        loadedInstance = @api.loadedInstance
        @awsDirectory.instance = no
        @api.stopLoadedInstance (error, response) =>
          return done? error if error
          @emit 'status', "Stopped Instance #{loadedInstance}"
          done? no

  resetLocalDirectory: (done) ->
    @localDirectory.reset (error) =>
      return done? error if error
      @emit 'status', "Local Directory Reset"
      done?()




  # Pause and Resume the current instance. These functions just stop and resume the Local and Remote directories. They stop uploading, downloading and batching without killing the instance.

  pause: (done) ->
    return done? new Error 'No App Instance Running' if not @api.loadedInstance
    @localDirectory.stop (error) =>
      return done? error if error
      @awsDirectory.stop (error) =>
        return done? error if error
        @emit 'status', "Instance #{@api.loadedInstance} Paused"
        done? no

  resume: (done) ->
    return done? new Error 'No App Instance Found' if not @api.loadedInstance
    @localDirectory.start (error) =>
      return done? error if error
      @awsDirectory.start @awsDirectory.instance, (error) =>
        return done? error if error
        @emit 'status', "Instance #{@api.loadedInstance} Syncing"
        done? no, @api.loadedInstance




  # Redefine some legacy method names and Export the project.

  autoStart: (config, done) -> @create config, done
  autoJoin: (id, done) -> @join id, done
  stop_everything: (done) -> @stop done
  workflows: (done) -> @api.listApps done
  workflow_instances: (done) -> @api.listInstances done
  workflow_config: (id, done) -> @api.getAppConfig id, done
  workflow: (id, done) -> @api.getApp id, done

module.exports.version = '2.50.0'
module.exports = MetrichorSync
