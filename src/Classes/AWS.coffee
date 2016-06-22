
EventEmitter = require('events').EventEmitter
AWS_SDK = require 'aws-sdk'
path = require 'path'
diff = require('deep-diff').diff
async = require 'async'
WatchJS = require "watchjs"




# AWS. This is tasked with keeping an eye on the SQS Queue and physically downloading any files which are ready to be downloaded then removing files from the SQS queue once they have been downloaded. It is also responsible for requesting batches for upload and then uploading them. The two scans are set as onCompletion loops.

class AWS extends EventEmitter
  constructor: (@options, @api, @ssd) ->
    @options.downloadMode = @options.downloadMode or 'data+telemetry'
    @sqsReceiveConfig =
      VisibilityTimeout: 600
      MaxNumberOfMessages: 10
      WaitTimeSeconds: 20

  status: (message) -> @emit 'status', message

  start: (done) ->
    return done? new Error 'No local SSD' if not @ssd
    return done? new Error 'No MetrichorAPI access' if not @api
    return done? new Error 'No Instance' if not @api.instance
    return done? new Error "Instance already running" if @isRunning
    @stats = uploading: 0, downloading: 0, failed: 0
    WatchJS.watch @stats, => @emit 'progress'
    @isRunning = yes
    @nextScan 'download', 1
    @nextScan 'upload', 1
    done?()




  # Token. If we need a token we'll ask for it here, if one already exists just give it to us (we therefore retain @currentToken), otherwise generate a new one and give us that instead. We get the queue URLs from amazon here and set them as part of the instance (assuming the url's could be refreshed at the same rate as tokens).

  token: (done) ->
    if @currentToken
      expires = new Date(@currentToken.expiration) - new Date()
      minutesUntilExpiry = Math.floor(expires / 1000 / 60)
      @currentToken = no if minutesUntilExpiry < 10
    return done? no, @currentToken if @currentToken

    options =
      id_workflow_instance: @api.instance.id
      region: @api.instance.region
    @status "Attempt to create new token"
    @api.getToken options, (error, token) =>
      return done? error if error
      @status "Created new token"
      @currentToken =
        s3: new AWS_SDK.S3 token
        sqs: new AWS_SDK.SQS token
        expiration: token.expiration

      input = @api.instance.inputqueue
      output = @api.instance.inputqueue
      @currentToken.sqs.getQueueUrl QueueName: input, (error, input) =>
        return done error if error
        @currentToken.sqs.getQueueUrl QueueName: output, (error, output) =>
          return done error if error
          @api.instance.url = input: input.QueueUrl, output: output.QueueUrl
          done? no, @currentToken




  # Scan loop control. These ensure that we loop at a reasonable rate. We've also got a 'fatal'. If any of the loops fail in a major way we call fatal. This will pause the instance but also send a message to the agent with the text in 'error' which will show up in the status field.

  nextScan: (upOrDown, delay) =>
    return if not @isRunning
    @["#{upOrDown}Timer"] = setTimeout @["#{upOrDown}Scan"], (delay or 5000)

  scanFailed: (upOrDown, error) ->
    @status "#{upOrDown} Scan Failed because #{error}"
    return @nextScan upOrDown, 10000

  fatal: (error) =>
    @emit 'fatal', error
    @status "Instance terminated because #{error}"




  # Upload a file. First our scanner, these scanners check the SQS queue and the local file directory every so often and look for things to upload and download (upload in this case). A file is an object with a 'filename', 'data', and 'source'. This will upload the file to S3 and append a message to SQS. Once it is complete we will ask the SSD to move it to the required directory.

  uploadScan: =>
    @ssd.getBatch (error, batch) =>
      return @scanFailed 'upload', error if error
      async.eachLimit batch.files, 10, @uploadFile, (error) =>
        return @scanFailed 'upload', error if error
        @ssd.removeEmptyBatch batch.source, (error) =>
          return @scanFailed 'upload', error if error
          @status "Batch Uploaded"
          @nextScan 'upload'

  uploadFile: (file, done) =>
    @status 'Upload file'
    return if not @isRunning
    @token (error, aws) =>
      return done? error if error
      @stats.uploading += 1
      @ssd.getFile file.source, (error, data) =>
        S3Object =
          Bucket: @api.instance.bucket
          Key: [@api.instance.keypath, file.name].join '/'
          Body: data
        aws.s3.putObject S3Object, (error) =>
          return if not @isRunning
          return done? error if error
          message = @api.instance.messageTemplate
          message.utc = new Date().toISOString()
          message.path = [@api.instance.path, file.name].join '/'
          SQSSendOptions =
            QueueUrl: @api.instance.url.input
            MessageBody: JSON.stringify message
          aws.sqs.sendMessage SQSSendOptions, (error) =>
            success = !error?
            @ssd.moveUploadedFile file, success, (error) =>
              @stats.uploading -= 1
              return done? error if error
              done()




  # Download a file. Having recieved an SQS message we download the linked file and then delete the SQS message.

  downloadScan: (delay) =>
    @ssd.freeSpace (error, space) =>
      return @fatal 'Disk Full. Delete some files and try again.' if error
      @token (error, aws) =>
        return @scanFailed 'download', error if error
        @sqsReceiveConfig.QueueUrl = @api.instance.url.output
        aws.sqs.receiveMessage @sqsReceiveConfig, (error, messages) =>
          return @scanFailed 'download', error if error
          if not messages?.Messages?.length
            @status "No SQS Messages found"
            return @nextScan 'download'
          @status "#{messages?.Messages?.length} SQS Messages found"
          async.eachLimit messages.Messages, 1, @downloadFile, (error) =>
            return @scanFailed 'download', error if error
            @nextScan 'download'

  downloadFile: (sqsMessage, done) =>
    return if not @isRunning
    @stats.downloading += 1
    @token (error, aws) =>
      return done error if error
      body = JSON.parse sqsMessage.Body
      filename = body.path.match(/[\w\W]*\/([\w\W]*?)$/)[1]
      streamOptions = { Bucket: body.bucket, Key: body.path }
      @ssd.appendToTelemetry body.telemetry =>
        failed = body.telemetry.hints?.folder is 'fail'
        mode = @options.downloadMode
        return @skipFile done if mode is 'telemetry'
        return @skipFile done if mode is 'success+telemetry' and failed
        stream = aws.s3.getObject(streamOptions).createReadStream()
        @ssd.saveDownloadedFile stream, filename, body.telemetry, (error) =>
          if error
            @stats.failed += 1
            @stats.downloading -= 1
            return done? error
          deleteOptions =
            QueueUrl: @api.instance.url.output
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
