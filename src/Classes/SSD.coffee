
# Imports and filters.

fs = require 'fs.extra'
mv = require 'mv'
mkdirp = require 'mkdirp'
path = require 'path'
chokidar = require 'chokidar'
async = require 'async'
EventEmitter = require('events').EventEmitter
WatchJS = require "watchjs"
os = require 'os'
disk = require 'diskspace'
pathRoot = require 'path-root'
countLinesInFile = require 'count-lines-in-file'

fast5 = (item) -> return item.slice(-6) is '.fast5'
isBatch = (item) -> item.slice(0, 6) is 'batch_'
isProcessing = (item) -> item.slice(-11) is '.processing'
isPartial = (item) -> item.slice(-8) is '_partial' or isProcessing(item)
completeBatch = (item) -> isBatch(item) and not isPartial(item)
partialBatch = (item) -> isBatch(item) and isPartial(item)




# SSD. This represents the root directory of the filesystem where the .fast5 files are placed from the device. This is tasked with batching up the files in this directory (lots of files!), serving batches when requested, and moving files around between various subdirectories. The batch size determines the amount we break up the files for upload. We also extend ourselves as an EventEmitter so we can emit progress updates. Starting the SSD builds the stats object and initialises the batching mechanism.

class SSD extends EventEmitter
  constructor: (@options) ->
    @batchSize = 100
    @isRunning = no
    @sub =
      pending: path.join @options.inputFolder, 'pending'
      uploaded: path.join @options.inputFolder, 'uploaded'
      upload_failed: path.join @options.inputFolder, 'upload_failed'

  start: (done) ->
    return done? new Error "Directory already started" if @isRunning
    @createSubdirectories (error) =>
      return done? error if error
      @initialStats (error) =>
        return done? error if error
        @isRunning = yes
        @convertToBatches yes, (error) =>
          return done? error if error
          @createFileWatcher()
          done?()

  createSubdirectories: (done) ->
    mkdirp @sub.pending, (error) =>
      return done? error if error
      mkdirp @sub.uploaded, (error) =>
        return done? error if error
        mkdirp @sub.upload_failed, (error) ->
          return done? error if error
          done()

  createFileWatcher: ->
    @watcher = chokidar.watch @options.inputFolder,
      depth: 0
      ignoreInitial: yes
    @watcher.on 'add', (path) =>
      return if not fast5(path)
      @stats.pending += 1
      # console.log @stats.pending
      return if @isBatching
      @isBatching = yes
      @convertToBatches yes, (error) =>
        @isBatching = no




  # Get Starting Stats. This is a count of the files in each directory. This is run when the directory is started. The stats don't distinguish between root and batched items, they are all just listed as 'pending', these stats are therefore independent of the batching mechanism. Once the stats object is created here, it will be modified only when a new file arrives or is uploaded. To calculate the 'pending' value, we need to total all the files in root, all the files in complete batches and all the files in incomplete batches. Incomplete batches must actually be physically counted 🙄. Whenever the stats object changes it will emit a progress event.

  initialStats: (done) ->
    @stats = {}
    fs.readdir @sub.pending, (error, pending) =>
      return done error if error
      fs.readdir @sub.uploaded, (error, uploaded) =>
        return done error if error
        fs.readdir @sub.upload_failed, (error, upload_failed) =>
          return done error if error
          fs.readdir @options.inputFolder, (error, inputFolder) =>
            return done error if error
            @countTelemetry (lines) =>
              batched = pending.filter(completeBatch).length * @batchSize
              @stats =
                pending: batched + inputFolder.filter(fast5).length
                uploaded: uploaded.filter(fast5).length
                upload_failed: upload_failed.filter(fast5).length
                downloaded: lines
              for partial in pending.filter(partialBatch)
                source = path.join @sub.pending, partial
                @stats.pending += fs.readdirSync(source).filter(fast5).length
              total = @stats.pending + @stats.uploaded + @stats.upload_failed
              @stats.total = total
              WatchJS.watch @stats, => @emit 'progress'
              done?()




  # Batch up the Input Directory. Maintaining large lists of files in memory is not ideal, breaking them into subdirectories means that progress can be stored in the file system itself rather than in memory. The batcher gets called when the application starts and when new files arrive. Its job is to search for files in the '/input' directory and group them into batches in the '/input/pending' directory. enforceBatchSize allows us to create batches even if they do not meet the specified batch size and there are not enough files for a full batch.

  convertToBatches: (enforceBatchSize, done) ->
    fs.readdir @options.inputFolder, (error, files) =>
      return done? error if error
      files = files.filter(fast5)
      batches = (files.splice(0, @batchSize) while files.length)
      last_batch = batches[batches.length - 1]
      batches.pop() if enforceBatchSize and last_batch?.length < @batchSize
      return done?() if not batches.length

      createBatch = (batch, next) =>
        return done() if not @isRunning
        moveFile = (file, next) =>
          return done() if not @isRunning
          mv file.source, file.destination, { mkdirp: yes }, (error) ->
            return done? error if error
            async.setImmediate next
        destination = path.join(@sub.pending, "batch_#{Date.now()}")
        destination += '_partial' if not enforceBatchSize
        batch = batch.map (file) => return file =
          source: path.join(@options.inputFolder, file)
          destination: path.join(destination, file)
        async.eachSeries batch, moveFile, (error) ->
          return done? error if error
          async.setImmediate next
      async.eachSeries batches, createBatch, done




  # Find a Batch to Upload. If we need a batch of local files to upload we'll request one here and it will be served if it can be found. The AWS file maintains a loop that will call this function if it finds an upload slot and wants to fill it. If no batches can be found we attempt to create a partial batch from items remaining in the inputFolder root.

  getBatch: (done) ->
    fs.readdir @sub.pending, (error, batches) =>
      return done error if error
      batches = batches?.filter(isBatch)
      if not batches?.length
        return fs.readdir @options.inputFolder, (error, files) =>
          if not files.filter(fast5).length
            @emit 'status', "No files to upload"
            return done new Error 'No batches'
          @convertToBatches no, =>
            @getBatch done
      @markAsProcessing path.join(@sub.pending, batches[0]), (error, batch) =>
        fs.readdir batch, (error, files) =>
          return done error if error
          files = files.map (file) -> return file =
            name: file
            source: path.join(batch, file)
          if not files.length
            @emit 'status', "Batch was empty, kill it and get another"
            return @removeEmptyBatch batch, => @getBatch done
          done no, response =
            source: batch
            files: files

  getFile: (source, done) ->
    fs.readFile source, (error, data) ->
      return done error if error
      done no, data




  # File and Directory operations. We can either mark a batch as being processed, move a file into the uploaded/upload_failed directory, or move a downloaded file stream into the downloaded directory.

  markAsProcessing: (source, done) ->
    return done no, source if isProcessing source
    mv source, "#{source}.processing", { mkdirp: yes }, (error) ->
      return done error if error
      done no, "#{source}.processing"

  moveUploadedFile: (file, success, done) =>
    sub = if success then 'uploaded' else 'upload_failed'
    destination = path.join @options.inputFolder, sub, file.name
    mv file.source, destination, (error) =>
      return done error if error
      @stats[sub] += 1
      @emit 'status', "File uploaded"
      done()

  saveDownloadedFile: (stream, filename, telemetry, done) =>
    saveFailed = =>
      return if failed
      failed = yes
      @emit 'status', "Download Failed " + filename
      return done new Error "Download failed"
    failed = no
    timeout = setTimeout saveFailed, 30000
    destination = @options.outputFolder
    if telemetry?.hints?.folder
      destination = path.join destination, telemetry.hints.folder
    else if telemetry?.json?.exit_status
      successful = telemetry.json.exit_status.match /workflow[ ]successful/i
      folder = path.join folder, if successful then 'pass' else 'fail'
    fs.mkdirSync destination if not fs.existsSync destination
    localFile = fs.createWriteStream path.join destination, filename
    stream.on 'error', =>
      return if failed
      saveFailed()
    stream.on 'data', =>
      return if failed
      clearTimeout timeout
      timeout = setTimeout saveFailed, 30000
    stream.on 'end', =>
      return if failed
      @stats.downloaded += 1
      clearTimeout timeout
      failed = yes
      done?()
    stream.pipe localFile

  removeEmptyBatch: (batch, done) ->
    if fs.existsSync batch
      fs.rmdir batch
      return done?()
    return done? new Error 'Batch not found'




  # Some directory stats. We can determine whether there is sufficient free space to get anything done and we can also ensure that the input and output directories have the correct permissions.

  freeSpace: (done) =>
    minimumFree = 100
    return done() if @options.downloadMode is 'telemetry'
    disk.check pathRoot(@options.outputFolder),(error, total, free, status) ->
      return done error if error
      megabytes_free = Math.floor (free / 1024 / 1000)
      return done new Error 'No disk space' if megabytes_free <= minimumFree
      done()

  checkPermissions: (done) =>
    fs.access @options.inputFolder, fs.R_OK, (error) =>
      return done error if error
      fs.access @options.outputFolder, fs.W_OK, (error) ->
        return done error if error
        done()




  # Telemetry. Here we start a writeStream to a telemetry file. If we are resuming an instance, the telemetry file will already exist, we just link to it. If this is a new instance the file will be created. We can also append a line to this file.

  createTelemetry: (instanceID, done) =>
    @telePath = path.join @options.outputFolder, "telemetry-#{instanceID}.log"
    # console.log @telePath
    @telemetry = fs.createWriteStream @telePath, { flags: "a" }
    @emit 'status', "Logging telemetry to #{path}"
    done no

  appendToTelemetry: (data, done) ->
    return done() if not data
    @telemetry.write (JSON.stringify(data) + os.EOL), ->
      done()

  countTelemetry: (done) ->
    return done 0 if not fs.existsSync @telePath
    countLinesInFile @telePath, (error, lines) ->
      done if error then 0 else lines




  # Stop Directory. When the localDirectory is stopped we kill the filewatcher so that the batcher doesn't run and also disable the uploader loop. We can kill @stats here because they will get rebuilt upon resume (maybe new files appeared while we were paused).

  stop: (done) ->
    batchingDone = =>
      @isRunning = no
      @watcher.unwatch(@options.inputFolder).close() if @watcher
      WatchJS.unwatch @stats if @stats
      done?()
    return batchingDone() if not @isBatching
    setTimeout (=> @stop done), 100





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
        pendingWalker.on "directory", (directory, stat, next) ->
          try fs.rmdir path.join(directory, stat.name), next
        pendingWalker.on 'end', -> done? no




# Export the module

module.exports = SSD
