
# LocalDirectory. Best thought of as a service on the input directory. This represents the root directory of the filesystem where the .fast5 files are placed from the device. This is tasked with batching up the files in this directory (lots of files!), uploading the batches, and moving completed files.

MetrichorAPI = require './MetrichorAPI'
mv = require 'mv'
mkdirp = require 'mkdirp'
fs = require 'fs.extra'
path = require 'path'
chokidar = require 'chokidar'
async = require 'async'

class LocalDirectory
  constructor: (@options) ->
    @metrichorAPI = new MetrichorAPI @options
    @stats = success: 0, fail: 0, failure: {}, queueLength: 0, totalSize: 0
    @location = @options.localDirectoryLocation

    # The uploader is a constantly running process. Even when the localDirectory service is not running it will call itself in a loop awaiting the isRunning flag. This prevents it from ever being called twice.

    @uploader()




  # Get things ready to start. First let's get all files from all subdirectories back into root if they are not already.

  reset: (done) ->
    @stop =>
      rootWalker = fs.walk @location
      rootWalker.on "file", (root, stat, next) =>
        source = path.join root, stat.name
        destination = "#{@location}/#{stat.name}"
        mv source, destination, (error) ->
          next()
      rootWalker.on 'end', =>
        pendingWalker = fs.walk "#{@location}/pending"
        pendingWalker.on "directory", (root, stat, next) =>
          fs.rmdir path.join root, stat.name
          next()
        pendingWalker.on 'end', =>

          # Once we have returned everything to root, we then ensure the correct subdirectories are present and empty: /pending, /uploaded, /upload_failed.

          for subdirectory in ['pending', 'uploaded', 'upload_failed']
            source = "#{@location}/#{subdirectory}"
            fs.rmdir source if fs.existsSync source
          console.log 'localDirectory Reset. Restore input directory.'
          done() if done




  # When the localDirectory service has been started, we batch the root directory and set a watcher for new files. We also trip the isRunning flag so that the uploader can actually get stuff done.

  start: (id, done) ->
    console.log 'localDirectory Start. Batch files and watch for new ones.'
    subdirectories = ['pending', 'uploaded', 'upload_failed']
    mkdirp "#{@location}/#{subdirectory}" for subdirectory in subdirectories
    @createBatches yes, =>
      @isRunning = yes
      @watcher = chokidar.watch @location,
        usePolling: yes
        depth: 0
        ignoreInitial: yes

      # When a file is added we call createBatches but we disable the watcher while this happens so that createBatches doesn't get hit multiple times at once.

      @watcher.on 'add', (path) =>
        console.log "#{path} added"
        @watcher.unwatch @location
        @createBatches yes, =>
          @watcher.add @location

  # When the localDirectory is stopped, we kill the filewatcher so that the batcher doesn't run and also disable the isRunning flag so that the uploader doesn't run.

  stop: (done) ->
    console.log 'localDirectory Stop. Kill all batching and uploading.'
    @isRunning = no
    if @watcher
      @watcher.unwatch @location
      @watcher.close()
    done() if done




  # This is the batcher. It will get called upon start (Which may be a fairly intensive process because there may be loads of files), and it will also get called when a new file arrives.

  createBatches: (enforceBatchSize, done) ->
    batchSize = 5
    fs.readdir @location, (error, files) =>
      files = files.filter (item) -> return item.slice(-6) is '.fast5'
      batches = (files.splice(0, batchSize) while files.length)
      if enforceBatchSize
        batches.pop() if batches[batches.length - 1]?.length < batchSize
        return (done() if done) if batches.length is 0

      # Actually turning the files into batches. These async operations use setImmidate to stop the stack from building up and throwing an overflow.

      moveFile = (file, next) =>
        mv file.source, file.destination, { mkdirp: yes }, (error) =>
          async.setImmediate next

      createBatch = (batch, next) =>
        batch = batch.map (file) => return file =
          source: "#{@location}/#{file}"
          destination: "#{@location}/pending/batch_#{Date.now()}/#{file}"
        async.eachSeries batch, moveFile, (error) ->
          async.setImmediate next

      async.eachSeries batches, createBatch, (error) ->
        console.log "Batched #{batchSize * batches.length} items"
        done() if done

  # We can also throw a new test file into the input folder.

  testFile: ->
    fs.writeFile "#{@location}/test_#{Date.now()}.fast5", 'test', (error) =>
      console.log "File added"




  # The uploader is called once upon instantiation and then calls itself. It can (and must) only be called from inside itself and then only ever once. If the localDirectory instance isn't running, just keep checking over and over until it is.

  uploader: ->
    return @uploaderSleep 5 if not @isRunning
    fs.readdir "#{@location}/pending", (error, batches) =>
      batches = batches
        .filter (item) -> return item.slice(0, 6) is 'batch_'
        .filter (item) -> return item.slice(-11) isnt '.processing'

      # If we are running, but no batches are found, try and create a batch from leftover unbatched files in the input root. If none of those are found either, just sleep for a while.

      if not batches?.length
        fs.readdir @location, (error, files) =>
          files = files.filter (item) -> return item.slice(-6) is '.fast5'
          return @createBatches no, (=> @uploader()) if files.length > 0
          console.log "No Files found to upload. Try again in 30 seconds"
          return @uploaderSleep 30

      # If we are running and we found a batch, append .processing to the subdirectory name and start the upload. Once complete, timeout or error, call the uplaader again.

      batch = batches[0]
      source = "#{@location}/pending/#{batch}"
      mv source, "#{source}.processing", { mkdirp: yes }, (error) =>
        console.log "Upload #{batch}"
        @uploadComplete_sleep batch, =>
          @uploader()

  # Call uploader again with a delay after it has finished.

  uploaderSleep: (seconds) -> setTimeout (=> @uploader()), 1000 * seconds




  # When an upload is complete, move the files from pending into uploaded and delete the batch.

  uploadComplete: (batch, done) ->
    source = "#{@location}/pending/#{batch}.processing"
    destination = "#{@location}/uploaded"

    moveFile = (file, next) =>
      mv "#{source}/#{file}", "#{destination}/#{file}", (error) =>
        async.setImmediate next

    fs.readdir source, (error, batch) =>
      async.eachSeries batch, moveFile, (error) ->
        fs.rmdir source if fs.existsSync source
        done() if done

  uploadComplete_sleep: (batch, done) ->
    setTimeout (=> @uploadComplete(batch, done)), 15000






# Export

module.exports = LocalDirectory
