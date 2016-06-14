
EventEmitter = require('events').EventEmitter
AWS_SDK = require 'aws-sdk'
path = require 'path'
diff = require('deep-diff').diff
async = require 'async'
WatchJS = require "watchjs"




# AWS. This is tasked with keeping an eye on the SQS Queue and physically downloading any files which are ready to be downloaded then removing files from the SQS queue once they have been downloaded. It is also responsible for requesting batches for upload and then uploading them. The two scans are set as onCompletion loops (nextDownloadScan and nextUploadScan).

# The @instance is set from the main app.js file.

class AWS extends EventEmitter
  constructor: (@options, @api, @ssd) ->
    @sqsReceiveConfig =
      VisibilityTimeout: 600
      MaxNumberOfMessages: 10
      WaitTimeSeconds: 20

  status: (message) -> @emit 'status', message

  start: (done) ->
    return done? new Error "Instance already running" if @isRunning
    @stats =
      uploading: 0
      downloading: 0
      failed: 0
    @token (error, aws) =>
      aws.sqs.getQueueUrl QueueName: @instance.inputqueue, (error, input) =>
        return done error if error
        aws.sqs.getQueueUrl QueueName: @instance.outputqueue, (error, output) =>
          return done error if error
          @instance.url =
            input: input.QueueUrl
            output: output.QueueUrl
          WatchJS.watch @stats, => @emit 'progress'
          @isRunning = yes
          @nextDownloadScan 1
          @nextUploadScan 1
          done?()




  # Token. If we need a token we'll ask for it here, if one already exists just give it to us (we therefore retain @currentToken), otherwise generate a new one and give us that instead.

  token: (done) ->
    if @currentToken
      expires = new Date(@currentToken.token.expiration) - new Date()
      minutesUntilExpiry = Math.floor(expires / 1000 / 60)
      @currentToken = no if minutesUntilExpiry < 10
    return done? no, @currentToken if @currentToken
    options =
      id_workflow_instance: @api.loadedInstance
      region: @instance.region
    @status "Attempt to create new token"
    @api.post "token", options, (error, token) =>
      return done? error if error
      return done? new Error 'No Token Generated' if not token
      @status "Created new token"
      token.region = @instance.region
      @currentToken =
        token: token
        s3: new AWS_SDK.S3 token
        sqs: new AWS_SDK.SQS token
      done? no, @currentToken




  # Here are our scanners, they are going to check the SQS queue and the local file directory every so often and look for things to upload and download.

  uploadScan: =>
    @ssd.getBatch (error, batch) =>
      return @uploadScanFailed() if error
      return @nextUploadScan() if not batch?.files.length
      async.eachLimit batch.files, 10, @uploadFile, (error) =>
        return @uploadScanFailed() if error
        @ssd.removeEmptyBatch batch.source, (error) =>
          @status "Batch Uploaded"
          @nextUploadScan()

  downloadScan: (delay) =>
    @ssd.freeSpace (error, space) =>
      return @fatal 'Disk Full. Delete some files and try again.' if error
      @token (error, aws) =>
        return @downloadScanFailed error if error
        @sqsReceiveConfig.QueueUrl = @instance.url.output
        aws.sqs.receiveMessage @sqsReceiveConfig, (error, messages) =>
          return @downloadScanFailed error if error
          if not messages?.Messages?.length
            @status "No SQS Messages found"
            return @nextDownloadScan()
          @status "#{messages?.Messages?.length} SQS Messages found"
          async.eachLimit messages.Messages, 1, @downloadFile, (error) =>
            return @downloadScanFailed error if error
            @nextDownloadScan()




  # Scan loop control. These ensure that we loop at a reasonable rate.

  nextDownloadScan: (delay) =>
    return if not @isRunning
    @downloadTimer = setTimeout @downloadScan, (delay or 5000)

  downloadScanFailed: (error) ->
    @status "Download Scan Failed because #{error}"
    return @nextDownloadScan 10000

  nextUploadScan: (delay) =>
    return if not @isRunning
    @uploadTimer = setTimeout @uploadScan, (delay or 5000)

  uploadScanFailed: (error) ->
    @status "Upload Scan Failed because #{error}"
    return @nextUploadScan 10000

  fatal: (error) =>
    console.log 'fatal', error
    @emit 'fatal', error
    @status "Application terminated because #{error}"




  # Upload a file. A file is an object with a 'filename', 'data', and 'source'. This will upload the file to S3 and append a message to SQS. Once it is complete we will ask the SSD to move it to the required directory.

  uploadFile: (file, done) =>
    @status 'Upload file'
    return if not @isRunning
    @token (error, aws) =>
      return done? error if error
      @stats.uploading += 1
      @ssd.getFile file.source, (error, data) =>
        S3Object =
          Bucket: @instance.bucket
          Key: [@instance.outputqueue, @instance.id_user, @instance.id_workflow_instance, @instance.inputqueue, file.name].join '/'
          Body: data
        aws.s3.putObject S3Object, (error) =>
          return if not @isRunning
          return done? error if error
          message = @instance.messageTemplate
          message.utc = new Date().toISOString()
          message.path = [@instance.path, file.name].join '/'
          SQSSendOptions =
            QueueUrl: @instance.url.input
            MessageBody: JSON.stringify message
          aws.sqs.sendMessage SQSSendOptions, (error) =>
            success = !error?
            @ssd.moveUploadedFile file, success, (error) =>
              @stats.uploading -= 1
              return done? error if error
              done()




  # Download a file. Having recieved an SQS message we download the linked file and then delete the SQS message.

  downloadFile: (sqsMessage, done) =>
    return if not @isRunning
    @stats.downloading += 1
    @token (error, aws) =>
      return done error if error
      body = JSON.parse sqsMessage.Body
      filename = body.path.match(/[\w\W]*\/([\w\W]*?)$/)[1]
      streamOptions = { Bucket: body.bucket, Key: body.path }
      @ssd.appendToTelemetry body.telemetry if body.telemetry
      folder = body.telemetry.hints?.folder
      mode = @options.downloadMode
      return @skipFile done if mode is 'telemetry'
      return @skipFile done if mode is 'success+telemetry' and folder is 'fail'
      stream = aws.s3.getObject(streamOptions).createReadStream()
      @ssd.saveDownloadedFile stream, filename, body.telemetry, (error) =>
        if error
          @stats.failed += 1
          @stats.downloading -= 1
          return done? error
        deleteOptions =
          QueueUrl: @instance.url.output
          ReceiptHandle: sqsMessage.ReceiptHandle
        aws.sqs.deleteMessage deleteOptions, (error) =>
          @stats.downloading -= 1
          return done? error if error
          done?()

  skipFile: (done) ->
    @stats.downloading -= 1
    @ssd.stats.downloaded += 1
    done()




  # If the remoteDirectory is stopped, that just means we kill the SQS scanner and turn off the isRunning flag. We can kill the stats because they will automatically be rebuilt when the directory is started again.

  stop: (done) ->
    @isRunning = no
    WatchJS.unwatch @stats if @stats
    clearTimeout @uploadTimer
    clearTimeout @downloadTimer
    done?()




# Export the module

module.exports = AWS
