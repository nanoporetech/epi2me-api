
EventEmitter = require('events').EventEmitter
AWS = require 'aws-sdk'
path = require 'path'
async = require 'async'




# AWSDirectory. This is tasked with keeping an eye on the SQS Queue, physically downloading any files which are ready to be downloaded, and then removing files from the SQS queue once they have been downloaded.

class RemoteDirectory extends EventEmitter
  constructor: (@api) ->
    @instance = no

    @sqsReceiveConfig =
      VisibilityTimeout: 600
      MaxNumberOfMessages: 1
      WaitTimeSeconds: 20




  # Start. We create the stats object, start the SQS watch loop and then bail. Very simple, all we're really doing is watching that queue.

  start: (@instance, done) ->
    return done? new Error "Instance already running" if @isRunning
    @makeStats =>
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
      return done? new Error 'No Token Generated' if not token
      token.region = @instance.region
      @currentToken =
        token: token
        s3: new AWS.S3 token
        sqs: new AWS.SQS token
      done? error, @currentToken




  # The Stats object, with percentage. The 'processing' value is the number of items (In Flight or Visible) from the upload queue, the 'pending' is the number of items in the download queue. The SQSCount function is defined seperately so we can call it when we first compile the stats object and also for each scan.

  makeStats: (done) ->
    @token (error, aws) =>
      @getSQSCount aws, (error, count) =>
        return done error if error
        @stats =
          processing: count.processing
          pending: count.pending
          downloading: 0
          downloaded: 0
        @emit 'progress'
        done()

  calculatePercentage: ->
    total = @stats.pending + @stats.processing + @stats.downloading + @stats.downloaded
    @stats.pending = Math.max 0, @stats.pending
    return @stats.percentage = 0 if not total
    @stats.percentage = Math.floor((@stats.downloaded / total) * 1000) / 10

  getSQSCount: (aws, done) ->
    aws.sqs.getQueueUrl @instance.queues?.input, (error, queue) =>
      return done error if error
      queueOptions = { QueueUrl: queue.QueueUrl, AttributeNames: ['All'] }
      aws.sqs.getQueueAttributes queueOptions, (error, input) =>
        return done error if error
        uploaded = input.Attributes.ApproximateNumberOfMessages
        flight = input.Attributes.ApproximateNumberOfMessagesNotVisible
        processing = parseInt(uploaded) + parseInt(flight)
        aws.sqs.getQueueUrl @instance.queues?.output, (error, queue) =>
          return done error if error
          queueOptions = { QueueUrl: queue.QueueUrl, AttributeNames: ['All'] }
          aws.sqs.getQueueAttributes queueOptions, (error, output) =>
            return done error if error
            pending = parseInt output.Attributes.ApproximateNumberOfMessages
            done? no, count =
              processing: processing
              pending: pending




  # Here we physically move the file into s3 using .putObject(). When an upload is complete, add a message to the SQS queue, move the files from pending into either uploaded or upload_failed (depending on success flag). When a batch is complete, first delete the batch subdirectory and then call for the next batch to be uploaded.

  uploadFile: (file, done) ->
    @token (error, aws) =>
      return done? error if error
      S3Options =
        Bucket: @instance.bucket
        Key: [@instance.outputqueue, @instance.id_user, @instance.id_workflow_instance, @instance.inputqueue, file].join '/'
        Body: file.data
      aws.s3.putObject S3Options, (error) =>
        return done? error if error
        aws.sqs.getQueueUrl @instance?.queues?.input, (error, queue) =>
          return done? error if error
          message =
            bucket: @instance.bucket
            outputQueue: @instance.outputqueue
            remote_addr: @instance.remote_addr
            user_defined: @instance.user_defined
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
            console.log error if error
            file.complete yes, =>
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
      return if not @isRunning
      @getSQSCount aws, (error, count) =>
        if count.processing isnt @stats.processing
          @stats.processing = count.processing
          statsUpdated = yes
        if count.pending isnt @stats.pending
          @stats.pending = count.pending
          statsUpdated = yes
        @emit 'progress' if statsUpdated
        aws.sqs.getQueueUrl @instance.queues.output, (error, queue) =>
          @sqsReceiveConfig.QueueUrl = queue.QueueUrl
          aws.sqs.receiveMessage @sqsReceiveConfig, (error, messages) =>
            return @nextScan yes if not messages?.Messages?.length

            downloadFile = (message, next) =>
              messageBody = JSON.parse message.Body
              filename = messageBody.path.match(/[\w\W]*\/([\w\W]*?)$/)[1]
              streamOptions =
                Bucket: messageBody.bucket
                Key: messageBody.path
              stream = aws.s3.getObject(streamOptions).createReadStream()
              @stats.pending -= 1
              @stats.downloading += 1
              console.log 'a'
              @emit 'progress'
              @emit 'download', stream, filename, =>
                @downloadComplete message, next

            async.each messages.Messages, downloadFile, (error) =>
              @nextScan no




  # Download is complete. Delete message from SQS.

  downloadComplete: (message, done) ->
    console.log 'downloadComplete'
    @stats.downloading -= 1
    @stats.downloaded += 1
    @token (error, aws) =>
      messageBody = JSON.parse message.Body
      aws.sqs.getQueueUrl @instance.queues.output, (error, queue) =>
        deleteOptions =
          QueueUrl: queue.QueueUrl
          ReceiptHandle: message.ReceiptHandle
        aws.sqs.deleteMessage deleteOptions, (error) =>
          @emit 'progress'
          done? error if error
          done? no




  # If the remoteDirectory is stopped, that just means we kill the SQS scanner and turn off the isRunning flag. We can kill the stats because they will automatically be rebuilt when the directory is started again.

  stop: (done) ->
    @isRunning = no
    @killScan()
    @stats = no
    done?()





# Export

module.exports = RemoteDirectory
