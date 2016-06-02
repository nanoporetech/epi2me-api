
# LocalDirectory. This represents the root directory of the filesystem where the .fast5 files are placed from the device. This is tasked with batching up the files in this directory (lots of files!), uploading the batches, and moving files around between various subdirectories once uploaded. The batch size determines the amount we break up the files for upload. We also define a @progress EventEmitter which will be read from the main app.

mv = require 'mv'
mkdirp = require 'mkdirp'
fs = require 'fs.extra'
path = require 'path'
chokidar = require 'chokidar'
async = require 'async'
AWS = require 'aws-sdk'
EventEmitter = require('events').EventEmitter

class LocalDirectory extends EventEmitter
  constructor: (@root, @api) ->
    @batchSize = 4




  # 1. RESET. Reset the directory and get ready to start (after stopping the service if it's already running). Get all files from all subdirectories back into root if they are not already and remove all of the empty batch_ directories. If a batch is in the middle of being processed we can mark it as no longer being processed.

  reset: (done) ->
    return done new Error "Cannot reset while instance is running" if @isRunning
    @stop =>
      rootWalker = fs.walk @root
      total_files = 0
      rootWalker.on "file", (root, stat, next) =>
        source = path.join root, stat.name
        total_files += 1 if stat.name.slice(-6) is '.fast5'
        destination = "#{@root}/#{stat.name}"
        mv source, destination, next
      rootWalker.on 'end', =>
        pendingWalker = fs.walk "#{@root}/pending"
        pendingWalker.on "directory", (root, stat, next) =>
          fs.rmdir path.join root, stat.name
          next()
        console.log "Reset. #{total_files} fast5 files moved to root."
        done no if done

  unmarkProcessing: (done) ->
    fs.readdir "#{@root}/pending", (error, batches) =>
      batches = batches?.filter (item)-> return item.slice(-11) is '.processing'
      return (done() if done) if not batches?.length
      batch = batches[0]
      source = "#{@root}/pending/#{batch.slice(0, -11)}"
      mv "#{source}.processing", source, { mkdirp: yes }, (error) =>
        done() if done




  # 2. START. After creating (or confirming the existance of) the required subdirectories, we batch up the files in the root directory and set a watcher for new files. When a new file arrives we try to create a new batch. When the directory is fully batched we start the uploader loop so that the uploader can start looking for batches of files to upload (uploadScan will call itself in a loop until it is stopped).

  start: (done) ->
    @instance = @api.currentInstance
    mkdirp "#{@root}/#{sub}" for sub in ['pending', 'uploaded', 'upload_failed']
    @calculateStats =>
      @unmarkProcessing =>
        @createBatches yes, =>
          @uploadScan()
          @isRunning = yes
          @watcher = chokidar.watch @root,
            depth: 0
            ignoreInitial: yes
          @watcher.on 'add', (path) =>
            @stats.pending += 1
            @emit 'update'
            @createBatches yes if not @isBatching
          done() if done




  # 3. STATS. Define a stats object. This is run after the LocalDirectory has been started and after the initial batching. When new objects are added to the directory, 'pending' will increase (pending includes both batches and strays left in the input directory awaiting critical batch mass). When items are uploaded or fail to upload pending will shrink. Also we calculate percentage complete. This returns a percentage string calculated to one decimal place.

  calculateStats: (done) ->
    fast5 = (item) -> return item.slice(-6) is '.fast5'
    batch = (item) -> return item.slice(0, 6) is 'batch_'
    complete_batch = (item) -> return item.slice(-8) isnt '_partial' and item.slice(-11) isnt '.processing'
    incomplete_batch = (item) -> return item.slice(-8) is '_partial'
    processing_batch = (item) -> return item.slice(-11) is '.processing'

    fs.readdir "#{@root}/uploaded", (error, uploaded) =>
      fs.readdir "#{@root}/upload_failed", (error, upload_failed) =>
        fs.readdir "#{@root}/pending", (error, batches) =>
          fs.readdir "#{@root}", (error, stray_pending) =>
            incomplete_batches = batches.filter(incomplete_batch)
            processing_batches = batches.filter(processing_batch)
            if incomplete_batches.length
              incom_path = "#{@root}/pending/#{incomplete_batches[0]}"
              incomplete = fs.readdirSync(incom_path).filter(fast5)
            if processing_batches.length
              proces_path = "#{@root}/pending/#{processing_batches[0]}"
              processing = fs.readdirSync(proces_path).filter(fast5)

            total_complete = batches.filter(complete_batch).length * @batchSize
            total_incom = if incomplete then incomplete.length else 0
            total_proc = if processing then processing.length else 0
            total_stray = stray_pending.filter(fast5).length
            @stats =
              pending: total_complete + total_incom + total_proc + total_stray
              uploaded: uploaded.filter(fast5).length
              upload_failed: upload_failed.filter(fast5).length
            @calculatePercentage()
            @emit 'progress'
            done() if done

  calculatePercentage: ->
    total = @stats.pending + @stats.uploaded
    @stats.percentage = Math.floor((@stats.uploaded / total) * 1000) / 10




  # 4. BATCHER. This is the batcher, it get called when the application starts and when new files arrive. It's job is to search for files in the input directory and group them into batches in the input/pending directory. enforceBatchSize allows us to create batches even if they do not meet the specified batch size. This is great if there are not enough files for a full batch but there are still outstanding items in the input folder (this, however, will only get called by the uploader if it has nothing else to upload, there can therefore only ever be one partial batch at a time). If we are enforcing the batch size, remove the last batch in the array if it isn't populated enough. The async operations use setImmidate to stop the stack from building up and throwing an overflow.

  createBatches: (enforceBatchSize, done) ->
    return if @isBatching
    @isBatching = yes
    fs.readdir @root, (error, files) =>
      files = files.filter (item) -> return item.slice(-6) is '.fast5'
      batches = (files.splice(0, @batchSize) while files.length)
      last_batch = batches[batches.length - 1]
      batches.pop() if enforceBatchSize and last_batch?.length < @batchSize
      if not batches.length
        @isBatching = no
        return (done() if done)

      moveFile = (file, next) =>
        mv file.source, file.destination, { mkdirp: yes }, (error) =>
          async.setImmediate next

      createBatch = (batch, next) =>
        destination = "#{@root}/pending/batch_#{Date.now()}"
        destination += '_partial' if not enforceBatchSize
        batch = batch.map (file) => return file =
          source: "#{@root}/#{file}"
          destination: "#{destination}/#{file}"
        async.eachSeries batch, moveFile, (error) ->
          async.setImmediate next

      async.eachSeries batches, createBatch, (error) =>
        console.log "Created #{batches.length} batches"
        @isBatching = no
        done() if done




  # 5. UPLOAD SCANNER. Generally speaking this gets hit after every batch has been uploaded or every 5 seconds if bored and waiting for files. Once uploadScan is called it will continue to call itself in a loop when it either fails to find something or finishes uploading something. Calling nextUploadScan will queue up another scan (this can happen immediately using the delay parameter). Calling killUploadScan will terminate the next scan. If no batches are found, exit. But first we'll request that we create a batch from leftover unbatched files in the input root (this is done by passing 'false' to createBatches). This new 'partial' batch will be picked up by the next uploadScan. If we are running and we found a batch, append .processing to the subdirectory name and start the upload. Once complete, timeout or error, call the uplaader again.

  nextUploadScan: (delay) ->
    return if @scannerKilled
    clearTimeout @nextScanTimer
    return @uploadScan() if not delay
    @nextScanTimer = setTimeout ( => @uploadScan() ), 5000

  killUploadScan: ->
    @scannerKilled = yes
    clearTimeout @nextScanTimer

  uploadScan: ->
    @scannerKilled = no
    fs.readdir "#{@root}/pending", (error, batches) =>
      batches = batches?.filter (item) -> return item.slice(0, 6) is 'batch_'
        .filter (item) -> return item.slice(-11) isnt '.processing'

      if not batches?.length
        return fs.readdir @root, (error, files) =>
          files = files.filter (item) -> return item.slice(-6) is '.fast5'
          if files.length
            console.log "No batches found. Try to create a partial batch."
            @createBatches no
          @nextUploadScan yes

      source = "#{@root}/pending/#{batches[0]}"
      mv source, "#{source}.processing", { mkdirp: yes }, (error) =>
        @upload batches[0]




  # 6. UPLOADER. We found a batch that's ready for upload, let's upload it. Start by getting a token from the metrichor API for this upload. Each item in the batch will get passed into uploadFile. Here we physically move the file into s3 using .putObject(). When an upload is complete, move the files from pending into either uploaded or upload_failed (depending on success flag). When a batch is complete, first delete the batch subdirectory and then call for the next batch to be uploaded.

  upload: (batch) ->
    @api.token (error, token) =>
      return if not @isRunning
      batchPath = "#{@root}/pending/#{batch}.processing"
      token = JSON.parse token
      token.region = 'eu-west-1'
      s3 = new AWS.S3 token
      files = fs.readdirSync batchPath

      uploadFile = (file, next) =>
        filePath = path.join batchPath, file
        keyPath = [@instance.outputqueue, @instance.id_user, @instance.id_workflow_instance, @instance.inputqueue, file]
        return if not @isRunning
        options =
          Bucket: @instance.bucket
          Key: keyPath.join '/'
          Body: fs.readFileSync filePath
        s3.putObject options, =>
          @uploadComplete yes, batch, file
          async.setImmediate next

      async.eachSeries files, uploadFile, (error) =>
        console.log new Error error if error
        @batchComplete batch

  uploadComplete: (success, batch, file) ->
    return if not @isRunning
    source = "#{@root}/pending/#{batch}.processing"
    subdirectory = if success then 'uploaded' else 'upload_failed'
    destination = "#{@root}/#{subdirectory}"
    mv "#{source}/#{file}", "#{destination}/#{file}", (error) =>
      @stats.pending -= 1
      @stats[subdirectory] += 1
      @calculatePercentage()
      @emit 'progress'
      console.log "Upload complete. Waiting for new files" if not @stats.pending

  batchComplete: (batch) ->
    source = "#{@root}/pending/#{batch}.processing"
    try
      fs.rmdir source if fs.existsSync source
    @nextUploadScan()




  # 7. RUN CONTROL. When the localDirectory is paused we kill the filewatcher so that the batcher doesn't run and also disable the uploader loop. We can kill @stats here because they will get rebuilt upon resume. When we stop the directory we just call pause as usual but we also kill the instance so it can't be restarted again.

  pause: (done) ->
    @killUploadScan()
    @watcher.unwatch(@root).close() if @watcher
    @isRunning = no
    @stats = no
    @unmarkProcessing done

  resume: (done) ->
    return done new Error 'No App Instance running' if not @instance
    @start @instance, (error) =>
      @isRunning = yes
      done() if done

  stop: (done) ->
    @pause (error) =>
      @instance = no
      done() if done




# Export

module.exports = LocalDirectory
