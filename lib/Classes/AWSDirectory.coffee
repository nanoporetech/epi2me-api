
EventEmitter = require('events').EventEmitter
AWS = require 'aws-sdk'
path = require 'path'
diff = require('deep-diff').diff
async = require 'async'




# AWSDirectory. This is tasked with keeping an eye on the SQS Queue, physically downloading any files which are ready to be downloaded, and then removing files from the SQS queue once they have been downloaded.

class RemoteDirectory extends EventEmitter
  constructor: (@api) ->
    @instance = no

    @sqsReceiveConfig =
      VisibilityTimeout: 600
      MaxNumberOfMessages: 10
      WaitTimeSeconds: 20

    @stats =
      uploading: 0
      downloading: 0




  # Start. We create the stats object, start the SQS watch loop and then bail. Very simple, all we're really doing is watching that queue.

  start: (@instance, done) ->
    return done? new Error "Instance already running" if @isRunning
    @token (error, aws) =>
      return done error if error
      @getSQSCount aws, (error) =>
        return done? error if error
        @isRunning = yes
        @scan()
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
    @api.post "token", options, (error, token) =>
      return done? error if error
      return done? new Error 'No Token Generated' if not token
      token.region = @instance.region
      @currentToken =
        token: token
        s3: new AWS.S3 token
        sqs: new AWS.SQS token
      done? no, @currentToken




  # The SQSCount gives us SQS totals on both the input and output queues

  getSQSCount: (aws, done) ->
    count = {}
    getCountForQueue = (queue, done) =>
      aws.sqs.getQueueUrl @instance.queues?[queue], (error, queue) =>
        return done error if error
        queueOptions = {QueueUrl: queue.QueueUrl, AttributeNames: ['ApproximateNumberOfMessages','ApproximateNumberOfMessagesNotVisible']}
        aws.sqs.getQueueAttributes queueOptions, (error, attr) =>
          attr = attr.Attributes
          return done error if error
          return done no, count =
            visible: parseInt attr.ApproximateNumberOfMessages
            flight: parseInt attr.ApproximateNumberOfMessagesNotVisible
    getCountForQueue 'input', (error, input) =>
      getCountForQueue 'output', (error, output) =>
        sqsCount =
          input: input
          output: output
        if diff @stats.sqs, sqsCount
          @stats.sqs = sqsCount
          @emit 'progress'
        done? no




  # Here we physically move the file into s3 using .putObject(). When an upload is complete, add a message to the SQS queue, move the files from pending into either uploaded or upload_failed (depending on success flag). When a batch is complete, first delete the batch subdirectory and then call for the next batch to be uploaded.

  uploadFile: (file, done) ->
    @stats.uploading += 1
    @emit 'progress'
    @token (error, aws) =>
      return done? error if error
      S3Options =
        Bucket: @instance.bucket
        Key: [@instance.outputqueue, @instance.id_user, @instance.id_workflow_instance, @instance.inputqueue, file].join '/'
        Body: file.data
      aws.s3.putObject S3Options, (error) =>
        return done? error if error
        aws.sqs.getQueueUrl @instance?.queues?.input, (error, queue) =>
          return done? new Error "No Queue URL" if error
          return done? error if error
          message =
            bucket: @instance.bucket
            outputQueue: @instance.outputqueue
            remote_addr: @instance.remote_addr
            user_defined: @instance.user_defined or null
            apikey: @instance.apikey
            id_workflow_instance: @instance.id
            utc: new Date().toISOString()
            path: [@instance.path, file.name].join '/'
          if @instance.chain
            message.components = @instance.chain.components
            message.targetComponentId = @instance.chain.targetComponentId
          SQSSendOptions =
            QueueUrl: queue.QueueUrl
            MessageBody: JSON.stringify message
          aws.sqs.sendMessage SQSSendOptions, (error) =>
            return done? error if error
            file.uploadComplete yes, =>
              @stats.uploading -= 1
              @emit 'progress'
              done()




  # The Download scanner. This will poll SQS and look for new messages, if it finds any it will send them to be downloaded. We implement the loop on a timeout so it's possible to terminate it if the app is stopped.

  nextScan: (delay) ->
    return if @scannerKilled
    clearTimeout @nextScanTimer
    return setTimeout ( => @scan() ), 1 if not delay
    @nextScanTimer = setTimeout ( => @scan() ), 5000

  killScan: ->
    @scannerKilled = yes
    clearTimeout @nextScanTimer

  scan: ->
    @scannerKilled = no
    @token (error, aws) =>
      return done? error if error
      return if not @isRunning
      @getSQSCount aws, (error) =>
        return @nextScan yes if error
        aws.sqs.getQueueUrl @instance.queues?.output, (error, queue) =>
          return @nextScan yes if error
          @sqsReceiveConfig.QueueUrl = queue.QueueUrl
          aws.sqs.receiveMessage @sqsReceiveConfig, (error, messages) =>
            return @nextScan yes if error or not messages?.Messages?.length

            downloadFile = (message, next) =>
              messageBody = JSON.parse message.Body
              filename = messageBody.path.match(/[\w\W]*\/([\w\W]*?)$/)[1]
              streamOptions =
                Bucket: messageBody.bucket
                Key: messageBody.path
              stream = aws.s3.getObject(streamOptions).createReadStream()
              @stats.downloading += 1
              @emit 'progress'
              @emit 'saveDownloadedFile', stream, filename, =>
                @downloadComplete message, next

            async.each messages.Messages, downloadFile, (error) =>
              @nextScan no




  # Download is complete. Delete message from SQS.

  downloadComplete: (message, done) ->
    @token (error, aws) =>
      return done? error if error
      messageBody = JSON.parse message.Body
      aws.sqs.getQueueUrl @instance.queues?.output, (error, queue) =>
        return done? error if error
        deleteOptions =
          QueueUrl: queue.QueueUrl
          ReceiptHandle: message.ReceiptHandle
        aws.sqs.deleteMessage deleteOptions, (error) =>
          return done? error if error
          @stats.downloading -= 1
          @emit 'progress'
          done? error if error
          done? no




  # If the remoteDirectory is stopped, that just means we kill the SQS scanner and turn off the isRunning flag. We can kill the stats because they will automatically be rebuilt when the directory is started again.

  stop: (done) ->
    @isRunning = no
    @killScan()
    @stats =
      uploading: 0
      downloading: 0
    done?()





# Export

module.exports = RemoteDirectory
