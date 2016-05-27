
# LocalDirectory. Best thought of as a service on the input directory. This represents the root directory of the filesystem where the .fast5 files are placed from the device. This is tasked with batching up the files in this directory (lots of files!), uploading the batches, and generally moving files around between its various subdirectories.

MetrichorAPI = require './MetrichorAPI'
mv = require 'mv'
mkdirp = require 'mkdirp'
fs = require 'fs.extra'
path = require 'path'
chokidar = require 'chokidar'
async = require 'async'
s3 = require 's3'

AWS = require 'aws-sdk'

class LocalDirectory
  constructor: (@options) ->
    @metrichorAPI = new MetrichorAPI @options
    @stats = success: 0, fail: 0, failure: {}, queueLength: 0, totalSize: 0
    @location = @options.localDirectoryLocation
    @subdirectories = ['pending', 'uploaded', 'upload_failed']




  # Reset the directory and get ready to start. After stopping the service if it's already running, get all files from all subdirectories back into root if they are not already and remove all of the empty batch directories.

  reset: (done) ->
    @stop =>
      rootWalker = fs.walk @location
      rootWalker.on "file", (root, stat, next) =>
        source = path.join root, stat.name
        destination = "#{@location}/#{stat.name}"
        mv source, destination, next
      rootWalker.on 'end', =>
        pendingWalker = fs.walk "#{@location}/pending"
        pendingWalker.on "directory", (root, stat, next) =>
          fs.rmdir path.join root, stat.name
          next()

        # And once we have returned everything to root, we ensure the correct subdirectories are present: /pending, /uploaded, /upload_failed.

        pendingWalker.on 'end', =>
          for subdirectory in @subdirectories
            source = "#{@location}/#{subdirectory}"
            fs.rmdir source if fs.existsSync source
          done() if done




  # After creating (or confirming existance of) the required subdirectories, we batch up the files in the root directory and set a watcher for new files. When a new file arrives we try to create a new batch (we disable the watcher while this happens so that the batcher isn't hit multiple times at once). When the directory is fully batched we start the uploader loop so that the uploader can start looking for batches of files to upload (uploadScan will call itself in a loop until it is stopped).

  start: (id, done) ->
    mkdirp "#{@location}/#{subdirectory}" for subdirectory in @subdirectories
    @createBatches yes, =>
      @uploadScan()
      @watcher = chokidar.watch @location, { depth: 0, ignoreInitial: yes }
      @watcher.on 'add', (path) =>
        @watcher.unwatch @location
        @createBatches yes, =>
          @watcher.add @location




  # This is the batcher. It's job is to search for files in the input directory and group them into batches in the input/pending directory. enforceBatchSize allows us to create batches even if they do not meet the specified batch size. This is great if there are not enough files for a full batch but there are still outstanding items in the input folder.

  createBatches: (enforceBatchSize, done) ->
    batchSize = 5
    fs.readdir @location, (error, files) =>
      files = files.filter (item) -> return item.slice(-6) is '.fast5'
      batches = (files.splice(0, batchSize) while files.length)
      if enforceBatchSize
        batches.pop() if batches[batches.length - 1]?.length < batchSize
        return (done() if done) if batches.length is 0

      # Here we actually turn the files into batches. These async operations use setImmidate to stop the stack from building up and throwing an overflow.

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




  # Once uploadScan is called it will continue to call itself in a loop when it either fails to find something or finishes uploading something. Calling killUploadScan

  nextUploadScan: (delay) ->
    return if @scannerKilled
    return @uploadScan() if not delay
    @nextScanTimer = setTimeout ( => @uploadScan() ), 5000

  killUploadScan: ->
    @scannerKilled = yes
    clearTimeout @nextScanTimer

  uploadScan: ->
    @scannerKilled = no
    fs.readdir "#{@location}/pending", (error, batches) =>
      batches = batches?.filter (item) -> return item.slice(0, 6) is 'batch_'
        .filter (item) -> return item.slice(-11) isnt '.processing'

      # If no batches are found, exit. But do try and create a batch from leftover unbatched files in the input root. These will then be picked up by the next uploadScan.

      if not batches?.length
        return fs.readdir @location, (error, files) =>
          files = files.filter (item) -> return item.slice(-6) is '.fast5'
          @createBatches no if files.length isnt 0
          @nextUploadScan yes

      # If we are running and we found a batch, append .processing to the subdirectory name and start the upload. Once complete, timeout or error, call the uplaader again.

      source = "#{@location}/pending/#{batches[0]}"
      mv source, "#{source}.processing", { mkdirp: yes }, (error) =>
        @upload batches[0]




  # We found a batch, let's upload it.

  upload: (batch) ->

    @instance =
      inputQueueName: null
      inputQueueURL: null
      outputQueueName: null
      outputQueueURL: null
      _discoverQueueCache: {}
      id_workflow_instance: @options.id_workflow_instance or null
      bucket: null
      bucketFolder: null
      remote_addr: null
      chain: null
      awssettings: region: options.region or 'eu-west-1'

    metrichorAPI.postToken @options.id_workflow_instance, (error, token) ->
      AWS.config.update token
      client = s3.createClient s3Client: new AWS.S3()

      uploader = client.uploadDir
        localFDir: batch
        s3Params:
          Prefix: ''
          Bucket: 's3 bucket name'

      uploader.on 'error', (err) ->
        console.error "unable to sync:", err.stack

      uploader.on 'progress', ->
        console.log "progress", uploader.progressAmount, uploader.progressTotal

      uploader.on 'end', ->
        console.log "#{batch} finished uploading"
        @uploadComplete(batch)




  # When an upload is complete, move the files from pending into uploaded and delete the batch.

  uploadComplete: (batch) ->
    source = "#{@location}/pending/#{batch}.processing"
    destination = "#{@location}/uploaded"

    moveFile = (file, next) =>
      mv "#{source}/#{file}", "#{destination}/#{file}", (error) =>
        async.setImmediate next

    fs.readdir source, (error, batch) =>
      async.eachSeries batch, moveFile, (error) =>
        fs.rmdir source if fs.existsSync source
        @nextUploadScan()




  # When the localDirectory is stopped, we kill the filewatcher so that the batcher doesn't run and also disable the uploader loop.

  stop: (done) ->
    @killUploadScan()
    @watcher.unwatch(@location).close() if @watcher

    # If a batch is in the middle of being processed we mark it as no longer being processed. We find some way to cancel the upload and then we negate @isUploading so the uploadScanner doesn't get stuck.

    fs.readdir "#{@location}/pending", (error, batches) =>
      batches = batches?.filter (item)-> return item.slice(-11) is '.processing'
      return (done() if done) if not batches?.length
      batch = batches[0]
      source = "#{@location}/pending/#{batch.slice(0, -11)}"
      mv "#{source}.processing", source, { mkdirp: yes }, (error) =>
        done() if done




# Export

module.exports = LocalDirectory
