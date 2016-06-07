
fs = require 'fs.extra'
mv = require 'mv'
mkdirp = require 'mkdirp'
path = require 'path'
chokidar = require 'chokidar'
async = require 'async'
EventEmitter = require('events').EventEmitter




# Start the LocalDirectory. This represents the root directory of the filesystem where the .fast5 files are placed from the device. This is tasked with batching up the files in this directory (lots of files!), uploading the batches, and moving files around between various subdirectories once uploaded. The batch size determines the amount we break up the files for upload. We also extend ourselves as an EventEmitter so we can emit progress updates.

class LocalDirectory extends EventEmitter
  constructor: (@options) ->
    @batchSize = 4

    @subdirectories =
      pending: path.join(@options.inputFolder, 'pending')
      uploaded: path.join(@options.inputFolder, 'uploaded')
      upload_failed: path.join(@options.inputFolder, 'upload_failed')




  # Starting the local directory initialises both the batcher (on new file added) and the batch/upload scanner (loop).

  start: (done) ->
    return done? new Error "Directory already started" if @isRunning
    mkdirp value for key, value of @subdirectories
    @initialStats =>
      @convertToBatches yes, (done) =>
        @watcher = chokidar.watch @options.inputFolder,
          depth: 0
          ignoreInitial: yes
        @watcher.on 'add', (path) =>
          @stats.pending += 1
          @emit 'progress'
          @convertToBatches yes if not @isBatching
        @isRunning = yes
        @batchLoopKilled = no
        @getNextBatch yes
        done?()
      done?()




  # Get Starting Stats. This is run when the directory is started. The stats don't distinguish between root and batched items, they are all just listed as 'pending', these stats are therefore independent of the batching mechanism. Once the stats object is created here, it will be modified only when a new file arrives or is uploaded. To calculate the 'pending' value, we need to total all the files in root, all the files in complete batches and all the files in incomplete batches. Incomplete batches must actually be physically counted 🙄.

  initialStats: (done) ->
    fast5 = (item) -> return item.slice(-6) is '.fast5'
    isBatch = (i) -> i.slice(0, 6) is 'batch_'
    isPartial = (i)-> i.slice(-8) is '_partial' or i.slice(-11) is '.processing'
    completeBatch = (item) -> isBatch(item) and not isPartial(item)
    partialBatch = (item) -> isBatch(item) and isPartial(item)
    @stats = {}
    fs.readdir @subdirectories.pending, (error, batches) =>
      @stats.pending = batches.filter(completeBatch).length * @batchSize
      fs.readdir @subdirectories.uploaded, (error, uploaded) =>
        @stats.uploading = 0
        @stats.uploaded = uploaded.filter(fast5).length
        fs.readdir @subdirectories.upload_failed, (error, upload_failed) =>
          @stats.upload_failed = upload_failed.filter(fast5).length
          for batch in batches.filter(partialBatch)
            location = path.join @subdirectories.pending, batch
            @stats.pending += fs.readdirSync(location).filter(fast5).length
          fs.readdir @options.inputFolder, (error, stray_pending) =>
            @stats.pending += stray_pending.filter(fast5).length
            @emit 'progress'
            done?()

  calculatePercentage: ->
    total = @stats.pending + @stats.uploaded + @stats.upload_failed + @stats.uploading
    @stats.total = total
    @stats.percentage = Math.floor((@stats.uploaded / total) * 1000) / 10




  # Batch up the Input Directory. Maintaining large lists of files in memory is not ideal, breaking them into subdirectories means that progress can be stored in the file system itself rather than in memory. The batcher gets called when the application starts and when new files arrive. Its job is to search for files in the '/input' directory and group them into batches in the '/input/pending' directory. enforceBatchSize allows us to create batches even if they do not meet the specified batch size and there are not enough files for a full batch.

  convertToBatches: (enforceBatchSize, done) ->
    @isBatching = yes
    fs.readdir @options.inputFolder, (error, files) =>
      files = files.filter (item) -> return item.slice(-6) is '.fast5'
      batches = (files.splice(0, @batchSize) while files.length)
      last_batch = batches[batches.length - 1]
      batches.pop() if enforceBatchSize and last_batch?.length < @batchSize
      if not batches.length
        @isBatching = no
        return done?()
      createBatch = (batch, next) =>
        moveFile = (file, next) =>
          mv file.source, file.destination, { mkdirp: yes }, (error) =>
            async.setImmediate next
        destination = path.join(@subdirectories.pending, "batch_#{Date.now()}")
        destination += '_partial' if not enforceBatchSize
        batch = batch.map (file) => return file =
          source: path.join(@options.inputFolder, file)
          destination: path.join(destination, file)
        async.eachSeries batch, moveFile, (error) ->
          async.setImmediate next
      async.eachSeries batches, createBatch, (error) =>
        @isBatching = no
        done?()




  # Find a Batch to Upload. If we need a batch of local files to upload we'll check here. When the directory first starts we check, and then subsequently, after a batch has been uploaded, we check. If there are no batches we'll just keep checking intermittently. If no batches are found in the /pending directory, request that we attempt to create a batch from leftover unbatched files in the input root. This new 'partial' batch will be picked up by the next uploadScan. If we found a batch to upload, append .processing to the subdirectory name and send it away to be uploaded. Once an upload is complete, the completion handler will move the file to the uploaded directory. Once a batch is complete, delete the batch folder and request a new batch.

  getNextBatch: (supressDelay) ->
    findBatch = =>
      @batchLoopKilled = no
      fs.readdir @subdirectories.pending, (error, batches) =>
        batches = batches?.filter (item) -> return item.slice(0, 6) is 'batch_'
        if not batches?.length
          return fs.readdir @options.inputFolder, (error, files) =>
            files = files.filter (item) -> return item.slice(-6) is '.fast5'
            @convertToBatches no if files.length
            @getNextBatch()
        source = path.join(@subdirectories.pending, batches[0])
        batch = source
        batch += '.processing' if batch.slice(-11) isnt '.processing'
        mv source, batch, { mkdirp: yes }, (error) =>
          @requestUploadBatch batch
    return if @batchLoopKilled
    clearTimeout @batchLoop
    @batchLoop = setTimeout findBatch, if supressDelay then 1 else 5000

  killGetBatch: ->
    @batchLoopKilled = yes
    clearTimeout @batchLoop

  requestUploadBatch: (batch) ->
    return if not @isRunning
    files = fs.readdirSync(batch).map (file) =>
      return file =
        name: file
        data: fs.readFileSync path.join(batch, file)
        complete: (success, done) =>
          subdirectory = if success then 'uploaded' else 'upload_failed'
          destination = path.join @options.inputFolder, subdirectory, file.name
          mv path.join(batch, file.name), destination, (error) =>
            @stats.uploading -= 1
            @stats[subdirectory] += 1
            @emit 'progress'
            done?()
    request = (file, next) =>
      @stats.pending -= 1
      @stats.uploading += 1
      @emit 'uploadFile', file, next
    async.eachSeries files, request, (error) =>
      console.log new Error error if error
      fs.rmdir batch if fs.existsSync batch
      @getNextBatch yes




  # Save Downloaded Files. When the remote directory downloads a file it will send it here for us to save.

  saveFile: (stream, filename, done) =>
    localFile = fs.createWriteStream path.join @options.outputFolder, filename
    stream.pipe localFile
    console.log 'saveFile'
    stream.on 'finish', =>
      console.log 'finish'
      return done?()




  # Stop Directory. When the localDirectory is stopped we kill the filewatcher so that the batcher doesn't run and also disable the uploader loop. We can kill @stats here because they will get rebuilt upon resume (maybe new files appeared while we were paused).

  stop: (done) ->
    @isRunning = no
    @killGetBatch()
    @watcher.unwatch(@options.inputFolder).close() if @watcher
    @stats = no
    done?()




  # Reset Directory. And get ready to start. Get all files from all subdirectories back into root if they are not already and remove all of the empty batch_ directories.

  reset: (done) ->
    if @isRunning
      return done? new Error "Cannot reset while instance is running"
    @stop =>
      rootWalker = fs.walk @options.inputFolder
      rootWalker.on "file", (directory, stat, next) =>
        full = path.join @options.inputFolder, stat.name
        mv path.join(directory, stat.name), full, next
      rootWalker.on 'end', =>
        pendingWalker = fs.walk path.join(@options.inputFolder, 'pending')
        pendingWalker.on "directory", (directory, stat, next) =>
          try fs.rmdir path.join(directory, stat.name), next
        pendingWalker.on 'end', => done? no




# Export

module.exports = LocalDirectory
