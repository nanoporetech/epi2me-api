
EventEmitter = require('events').EventEmitter
AWS = require 'aws-sdk'
fs = require 'fs.extra'
path = require 'path'
async = require 'async'




# RemoteDirectory. This is tasked with keeping an eye on the SQS Queue, physically downloading any files which are ready to be downloaded, and then removing files from the SQS queue once they have been downloaded.

class RemoteDirectory extends EventEmitter
  constructor: (@options, @api) ->




  # Start. We create the stats object, start the SQS watch loop and then bail. Very simple, all we're really doing is watching that queue.

  start: (done) ->
    @instance = @api.currentInstance
    return done? new Error "Instance already running" if @isRunning
    @makeStats =>
      @isRunning = yes
      @SQSScan()
      done?()




  # The Stats object, with percentage. The 'processing' value is the number of items (In Flight or Visible) from the upload queue, the 'pending' is the number of items in the download queue. The SQSCount function is defined seperately so we can call it when we first compile the stats object and also for each scan.

  makeStats: (done) ->
    @api.token (error, aws) =>
      @getSQSCount aws, (error, count) =>
        @stats =
          processing: count.processing
          pending: count.pending
          downloading: 0
          downloaded: 0
        @calculatePercentage()
        @emit 'progress', @stats
        done()

  calculatePercentage: ->
    total = @stats.pending + @stats.processing + @stats.downloading + @stats.downloaded
    return @stats.percentage = 0 if not total
    @stats.percentage = Math.floor((@stats.downloaded / total) * 1000) / 10

  getSQSCount: (aws, done) ->
    aws.sqs.getQueueUrl @api.SQSQueue('input'), (error, queue) =>
      queueOptions = { QueueUrl: queue.QueueUrl, AttributeNames: ['All'] }
      aws.sqs.getQueueAttributes queueOptions, (error, input) =>
        uploaded = input.Attributes.ApproximateNumberOfMessages
        flight = input.Attributes.ApproximateNumberOfMessagesNotVisible
        processing = parseInt uploaded + parseInt flight
        aws.sqs.getQueueUrl @api.SQSQueue('output'), (error, queue) =>
          queueOptions = { QueueUrl: queue.QueueUrl, AttributeNames: ['All'] }
          aws.sqs.getQueueAttributes queueOptions, (error, output) =>
            pending = parseInt output.Attributes.ApproximateNumberOfMessages
            done? no, count =
              processing: processing
              pending: pending




  # The Download scanner. This will poll SQS and look for new messages, if it finds any it will send them to be downloaded. We implement the loop on a timeout so it's possible to terminate it if the app is stopped.

  nextSQSScan: (delay) ->
    return if @scannerKilled
    clearTimeout @nextScanTimer
    return setTimeout ( => @SQSScan() ), 1 if not delay
    @nextScanTimer = setTimeout ( => @SQSScan() ), 5000

  killSQSScan: ->
    @scannerKilled = yes
    clearTimeout @nextScanTimer

  SQSScan: ->
    @scannerKilled = no
    @api.token (error, aws) =>
      return if not @isRunning
      @getSQSCount aws, (error, count) =>
        if count.processing isnt @stats.processing
          @stats.processing = count.processing
          statsUpdated = yes
        if count.pending isnt @stats.pending
          @stats.pending = count.pending
          statsUpdated = yes
        if statsUpdated
          @calculatePercentage()
          @emit('progress', @stats)
        aws.sqs.getQueueUrl @api.SQSQueue('output'), (error, queue) =>
          receiveOptions =
            QueueUrl: queue.QueueUrl
            VisibilityTimeout: 600
            MaxNumberOfMessages: 10
            WaitTimeSeconds: 20
          aws.sqs.receiveMessage receiveOptions, (error, messages) =>
            return @nextSQSScan yes if not messages?.Messages?.length

            processMessage = (message, next) =>
              @download message, =>
                @downloadComplete message, =>
                  next()
            async.each messages.Messages, processMessage, (error) =>
              @nextSQSScan no




  #  Found a message with a file to Download. Get the file location from the message, define the output.

  download: (message, done) ->
    @stats.pending -= 1
    @stats.downloading += 1
    @calculatePercentage()
    @emit 'progress', @stats
    messageBody = JSON.parse message.Body
    file = messageBody.path.match(/[\w\W]*\/([\w\W]*?)$/)[1] or ''
    folder = @options.outputFolder
    remoteFile = fs.createWriteStream path.join folder, file
    streamOptions =
      Bucket: messageBody.bucket
      Key: messageBody.path
    stream = @api.s3.getObject(streamOptions).createReadStream().pipe remoteFile
    stream.on 'finish', done




  # Download is complete. Delete message from SQS.

  downloadComplete: (message, done) ->
    @api.token (error, aws) =>
      messageBody = JSON.parse message.Body
      aws.sqs.getQueueUrl @api.SQSQueue('output'), (error, queue) =>
        deleteOptions =
          QueueUrl: queue.QueueUrl
          ReceiptHandle: message.ReceiptHandle
        aws.sqs.deleteMessage deleteOptions, (error) =>
          @stats.downloading -= 1
          @stats.downloaded += 1
          @calculatePercentage()
          @emit 'progress', @stats
          done? error if error
          done? no




  # If the remoteDirectory is stopped, that just means we kill the SQS scanner and turn off the isRunning flag. We can kill the stats because they will automatically be rebuilt when the directory is started again.

  stop: (done) ->
    @isRunning = no
    @killSQSScan()
    @stats = no
    done?()




# Export

module.exports = RemoteDirectory
