
# A file.

Pool = require('generic-pool').Pool
# s3 = require 's3'
# sqs = require 'sqs-consumer'

class RemoteDirectory
  constructor: (@options) ->
    @AWSSession = no
    @stats =
      success: 0
      fail: 0
      failure: {}
      queueLength: 0
      totalSize: 0

    @downloadPool = new Pool
      name: 'download'
      create: (done) =>
        @metrichorAPI.workflow_instance id, config, (error, instance) =>
          return stop_everything() if instance.state is 'stopped'
          remoteFile = new remoteFile()
          remoteFile.fromSQS (found_one) =>
            done no, remoteFile if found_one
      max: 10
      log: yes
      destroy: (file) -> file.release()




  # The Downloader. Every second it will check for an open download slot. If it finds one it will look for an sqs message, if one exists it will start to download the remote file.

  start: (instance, done) ->
    downloadFile = ->
      if @downloadPool.availableObjectsCount
        @downloadPool.aquire (error, remoteFile) =>
          remoteFile.download (error) =>
            @localDirectory.fileDownloaded remoteFile, (error) =>
              @downloadPool.release remoteFile

    @downloader = setInterval downloadFile, 1000




  stop: (done) ->
    clearInterval @downloader
    @downloadPool.drain ->
      @downloadPool.destroyAllNow()





  # Check SQS. Need to respect downloadMode

  fromSQS: (done) ->
    done found = yes




  #  let's download it to the specified downloaded directory

  download: (done) ->




  # make sure the notification is removed from SQS

  downloaded: (done) ->




  # Make sure all resources are freed, , and the AWS session is killed.

  release: (done) ->




# Export

module.exports = RemoteDirectory
