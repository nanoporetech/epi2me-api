
mv = require 'mv'
mkdirp = require 'mkdirp'
fs = require 'fs.extra'
path = require 'path'
chokidar = require 'chokidar'
async = require 'async'
AWS = require 'aws-sdk'
EventEmitter = require('events').EventEmitter




# LocalDirectory. This represents the root directory of the filesystem where the .fast5 files are placed from the device. This is tasked with batching up the files in this directory (lots of files!), uploading the batches, and moving files around between various subdirectories once uploaded.

# The batch size determines the amount we break up the files for upload. We also extend ourselves as an EventEmitter so we can emit progress updates.

class LocalDirectory extends EventEmitter
  constructor: (@root, @api) ->
    @batchSize = 4




  # Reset the directory and get ready to start (after stopping the service if it's already running). Get all files from all subdirectories back into root if they are not already and remove all of the empty batch_ directories.

  reset: (done) ->
    if @isRunning
      return done? new Error "Cannot reset while instance is running"
    @stop =>
      rootWalker = fs.walk @root
      rootWalker.on "file", (directory, stat, next) =>
        mv path.join(directory, stat.name), path.join(@root, stat.name), next
      rootWalker.on 'end', =>
        pendingWalker = fs.walk path.join(@root, 'pending')
        pendingWalker.on "directory", (directory, stat, next) =>
          fs.rmdir path.join(directory, stat.name), next
        pendingWalker.on 'end', => done? no




  # Start the local directory. If we have an instance to connect to, ensure the required subdirectories are present, do an initial batching process and set a watcher on new files. Do the first uploadScan.

  start: (done) ->
    return done? new Error "Directory already started" if @isRunning
    for sub in ['pending', 'uploaded', 'upload_failed']
      mkdirp path.join(@root, sub)
    @makeStats =>
      @initialBatching =>
        @watcher = chokidar.watch @root, { depth: 0, ignoreInitial: yes }
        @watcher.on 'add', (path) =>
          @stats.pending += 1
          @emit 'progress'
          @createBatches yes if not @isBatching

        @isRunning = yes
        @uploadScan()
        done?()




  # Define a stats object. This is run when the directory is started. The stats don't distinguish between root and batched items, they are all just listed as 'pending', this is therefore independent of the batching mechanism. Once the object is created here, it will be modified only when a new file arrives or is uploaded. To calculate the 'pending' value, we need to total all the files in root, all the files in complete batches and all the files in incomplete batches.

  # Incomplete batches must actually be physically counted 🙄 but fortunately there can only ever be one of them at once: either a '.processing' which may have half completed when the app was resumed or a '_partial', which may have been created because there weren't enough files to make a full batch.

  makeStats: (done) ->
    fast5 = (item) -> return item.slice(-6) is '.fast5'
    isBatch = (i) -> i.slice(0, 6) is 'batch_'
    isPartial = (i)-> i.slice(-8) is '_partial' or i.slice(-11) is '.processing'
    completeBatch = (item) -> isBatch(item) and not isPartial(item)
    partialBatch = (item) -> isBatch(item) and isPartial(item)

    @stats = {}
    fs.readdir path.join(@root, 'uploaded'), (error, uploaded) =>
      @stats.uploaded = uploaded.filter(fast5).length
      fs.readdir path.join(@root, 'upload_failed'), (error, upload_failed) =>
        @stats.upload_failed = upload_failed.filter(fast5).length
        fs.readdir path.join(@root, 'pending'), (error, batches) =>
          @stats.pending = batches.filter(completeBatch).length * @batchSize
          for batch in batches.filter(partialBatch)
            location = path.join(@root, 'pending', batch)
            @stats.pending += fs.readdirSync(location).filter(fast5).length
          fs.readdir "#{@root}", (error, stray_pending) =>
            @stats.pending += stray_pending.filter(fast5).length

            @calculatePercentage()
            @emit 'progress'
            done?()

  calculatePercentage: ->
    @stats.total = @stats.pending + @stats.uploaded + @stats.upload_failed
    @stats.percentage = Math.floor((@stats.uploaded / @stats.total) * 1000) / 10




  # The Batcher. Maintaining large lists of files in memory is not ideal, breaking them into subdirectories means that progress can be stored in the file system itself rather than in memory. After the initial expensive batching job is complete, the highest quantity of items that will ever be read into an array by readdir is equal to the total number of batches, which (if batchSize is set to 100) will be two orders of magnitude smaller than reading the files directly from the /input directory.

  # The batcher gets called when the application starts and when new files arrive. Its job is to search for files in the '/input' directory and group them into batches in the '/input/pending' directory. enforceBatchSize allows us to create batches even if they do not meet the specified batch size. This is great if there are not enough files for a full batch but there are still outstanding items in the input folder.

  initialBatching: (done) ->
    @createBatches yes, done

  createBatches: (enforceBatchSize, done) ->
    @isBatching = yes
    fs.readdir @root, (error, files) =>
      files = files.filter (item) -> return item.slice(-6) is '.fast5'
      batches = (files.splice(0, @batchSize) while files.length)
      last_batch = batches[batches.length - 1]
      batches.pop() if enforceBatchSize and last_batch?.length < @batchSize
      if not batches.length
        @isBatching = no
        return done?()

      moveFile = (file, next) =>
        mv file.source, file.destination, { mkdirp: yes }, (error) =>
          async.setImmediate next

      createBatch = (batch, next) =>
        destination = path.join(@root, 'pending', "batch_#{Date.now()}")
        destination += '_partial' if not enforceBatchSize
        batch = batch.map (file) => return file =
          source: path.join(@root, file)
          destination: path.join(destination, file)
        async.eachSeries batch, moveFile, (error) ->
          async.setImmediate next

      async.eachSeries batches, createBatch, (error) =>
        @isBatching = no
        done?()




  # The Uploader. Looking for a batch to upload. Generally speaking this gets hit after a batch has been uploaded or every 5 seconds if there's nothing to upload and it's bored waiting for files. Once uploadScan is called it will continue to call itself in a loop. The loop is triggered on a timer, which is created when we either fail to find something or finish uploading something. Calling nextUploadScan will queue up another scan (this can happen immediately using the delay parameter). Calling killUploadScan will terminate the next scan.

  # If no batches are found, request that we attempt to create a batch from leftover unbatched files in the input root. This new 'partial' batch will be picked up by the next uploadScan. If we found a batch to upload, append .processing to the subdirectory name and start the upload.

  nextUploadScan: (supressDelay) ->
    return if @scannerKilled
    clearTimeout @nextScanTimer
    return setTimeout ( => @uploadScan() ), 1 if supressDelay
    @nextScanTimer = setTimeout ( => @uploadScan() ), 5000

  killUploadScan: ->
    @scannerKilled = yes
    clearTimeout @nextScanTimer

  uploadScan: ->
    @scannerKilled = no
    fs.readdir path.join(@root, 'pending'), (error, batches) =>
      batches = batches?.filter (item) -> return item.slice(0, 6) is 'batch_'

      if not batches?.length
        return fs.readdir @root, (error, files) =>
          files = files.filter (item) -> return item.slice(-6) is '.fast5'
          @createBatches no if files.length
          @nextUploadScan()

      source = path.join(@root, 'pending', batches[0])
      destination = source
      destination += '.processing' if destination.slice(-11) isnt '.processing'
      mv source, destination, { mkdirp: yes }, (error) =>
        @upload destination




  # We found a batch that's ready for upload, let's upload it. Start by getting a token from the metrichor API for this upload. Each item in the batch will get passed into uploadFile. Here we physically move the file into s3 using .putObject(). When an upload is complete, move the files from pending into either uploaded or upload_failed (depending on success flag). When a batch is complete, first delete the batch subdirectory and then call for the next batch to be uploaded.

  upload: (batch) ->
    @api.token (error, token) =>
      return if not @isRunning

      uploadFile = (file, next) =>
        return if not @isRunning
        try
          options =
            Bucket: @api.currentInstance.bucket
            Key: path.join @api.getS3Path(), file
            Body: fs.readFileSync path.join batch, file
          (new AWS.S3(token)).putObject options, =>
            @uploadComplete yes, batch, file
            async.setImmediate next
        catch
          @uploadComplete no, batch, file
          async.setImmediate next


      async.eachSeries fs.readdirSync(batch), uploadFile, (error) =>
        console.log new Error error if error
        @batchComplete batch

  uploadComplete: (success, batch, file) ->
    return if not @isRunning
    subdirectory = if success then 'uploaded' else 'upload_failed'
    destination = path.join(@root, subdirectory)
    mv path.join(batch, file), path.join(destination, file), (error) =>
      @stats.pending -= 1
      @stats[subdirectory] += 1
      @calculatePercentage()
      @emit 'progress'

  batchComplete: (batch) ->
    try fs.rmdir batch if fs.existsSync batch
    @nextUploadScan yes




  # When the localDirectory is paused we kill the filewatcher so that the batcher doesn't run and also disable the uploader loop. We can kill @stats here because they will get rebuilt upon resume (maybe new files appeared while we were paused).

  # When we stop the directory we just call pause as usual but we also kill the instance so it can't be restarted again.

  stop: (done) ->
    @isRunning = no
    @killUploadScan()
    @watcher.unwatch(@root).close() if @watcher
    @stats = no
    done?()




# Export

module.exports = LocalDirectory
