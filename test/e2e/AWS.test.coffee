
os = require 'os'
fs = require('fs-extra')
path = require('path')
dns = require 'dns'
mkdirp = require 'mkdirp'
assert = require('chai').assert
sinon = require 'sinon'
AWS = require path.join '..', '..', 'src', 'Classes', 'AWS.coffee'
SSD = require path.join '..', '..', 'src', 'Classes', 'SSD.coffee'
API = require path.join '..', '..', 'src', 'Classes', 'MetrichorAPI.coffee'
apikey = process.env.API_KEY or fs.readFileSync(path.join('..', '..', '@options.apikey'), 'utf8').trim()
guid = -> Math.random().toString(36).substring(7)






deleteFolder = (path) ->
  return if not fs.existsSync path
  fs.readdirSync(path).forEach (file, index) ->
    curPath = "#{path}/#{file}"
    return fs.unlinkSync curPath if not fs.lstatSync(curPath).isDirectory()
    deleteFolder curPath
  fs.rmdirSync path


url = "https://dev.metrichor.com"
app_id = 454


# Build the paramaters required to run AWS.

currentInstance = no
api = new API
  apikey: apikey
  url: url
  agent_version: "2.41"

root = "#{os.homedir()}/metrichorAPI_TestRoot"
test_name = 'test_1_ch1_file1_strand.fast5'
ssd = new SSD
  inputFolder: "#{root}/inputFolder"
  outputFolder: "#{root}/outputFolder"

aws = new AWS {}, api, ssd
uploadedMessage = no




# SQS Count

getSQSCount = (xput, done) =>
  count = {}
  getCountForQueue = (queue, done) =>
    aws.token (error, aws_objects) =>
      assert.isFalse error
      assert.isDefined api.instance.url
      options = { QueueUrl: api.instance.url.input, AttributeNames: ['All'] }
      aws_objects.sqs.getQueueAttributes options, (error, attr) =>
        attr = attr.Attributes
        return done error if error
        return done no, count =
          visible: parseInt attr.ApproximateNumberOfMessages
          flight: parseInt attr.ApproximateNumberOfMessagesNotVisible
  getCountForQueue xput, (error, results) =>
    return done error if error
    done? undefined, results




# Integration. We will keep the instance alive.

describe "AWS", ->

  describe "Integration", ->

    it 'fails to start without SSD', (done) ->
      aws.ssd = undefined
      aws.start (error) ->
        assert.equal error.message, 'No local SSD'
        done()

    it 'fails to start without API Instance', (done) ->
      aws.api = undefined
      aws.ssd = ssd
      aws.start (error) ->
        assert.equal error.message, 'No MetrichorAPI access'
        aws.api = api
        done()

    it 'instantiated correctly', (done) ->
      assert.isDefined aws.sqsReceiveConfig
      done()

    it 'started and stopped without error', (done) ->
      aws.api.createNewInstance { app: app_id }, (error, id) ->
        assert.isFalse error
        assert.isDefined id
        instanceID = id
        aws.api.loadInstance instanceID, (error, instance) ->
          currentInstance = instance
          assert.isDefined currentInstance
          aws.start (error) ->
            assert.isUndefined error
            assert.isDefined aws.stats
            assert.isTrue aws.isRunning
            assert.isDefined aws.downloadTimer
            assert.isDefined aws.uploadTimer
            aws.stop (error) ->
              assert.isUndefined error
              assert.isFalse aws.isRunning
              done()




  # Token generation. These are dependenet on the service been started correctly as shown above.

  describe 'token()', ->
    getToken = sinon.spy aws.api, "getToken"

    it 'generated token', (done) ->
      aws.token (error, token) ->
        assert.equal getToken.callCount, 1
        assert.isDefined aws.currentToken
        done()

    it 'retained token', (done) ->
      aws.token (error, token) ->
        assert.equal getToken.callCount, 1
        done()

    it 'forced token expiry', (done) ->
      aws.currentToken.expiration = new Date()
      aws.token (error, token) ->
        assert.equal getToken.callCount, 2
        done()




  # Scan loop control

  describe 'Scan Loop Control', ->

    it 'ran nextScan()', (done) ->
      aws.isRunning = yes
      downloadScan = sinon.stub aws, "downloadScan", ->
      uploadScan = sinon.stub aws, "uploadScan", ->
      nextDtimer = aws.nextScan 'download', 1
      nextUtimer = aws.nextScan 'upload', 1
      setTimeout ->
        assert.isDefined nextDtimer
        assert.isDefined nextUtimer
        assert.equal downloadScan.callCount, 1
        assert.equal uploadScan.callCount, 1
        aws.downloadScan.restore()
        aws.uploadScan.restore()
        done()
      , 10

    it 'ran scanFailed()', (done) ->
      downloadScan = sinon.stub aws, "downloadScan", ->
      uploadScan = sinon.stub aws, "uploadScan", ->
      dTimer = aws.scanFailed 'download', 1
      uTimer = aws.scanFailed 'upload', 1
      assert.isDefined dTimer
      assert.isDefined uTimer
      aws.downloadScan.restore()
      aws.uploadScan.restore()
      done()

    it 'emitted fatal()', (done) ->
      aws.on 'fatal', (fatalMessage) ->
        assert.isDefined fatalMessage
        done()
      aws.fatal new Error 'test'




  # Uploads. First let's create a file to actually upload.

  describe 'Upload', ->
    file1 = "#{guid()}.fast5"
    file2 = "#{guid()}.fast5"
    test_batch =
      source: root
      files: ["#{root}/#{file1}", "#{root}/#{file2}"]

    initial_count = 0

    it 'calls upload for every file in batch', (done) ->
      mkdirp root, (err) ->
        fs.writeFile "#{root}/#{file1}", 'x1', (error) ->
          fs.writeFile "#{root}/#{file2}", 'x2', (error) ->
            assert.isTrue fs.existsSync "#{root}/#{file1}"
            assert.isTrue fs.existsSync "#{root}/#{file2}"
            sinon.stub ssd, "getBatch", (done) -> done no, test_batch
            uploadFile = sinon.stub aws, "uploadFile", (file, done) -> done()
            removeEmpty = sinon.stub ssd, "removeEmptyBatch", (batch, next) ->
              clearTimeout aws.uploadTimer
              aws.uploadFile.restore()
              ssd.removeEmptyBatch.restore()
              assert.equal removeEmpty.callCount, 1
              assert.equal uploadFile.callCount, 2
              done()
            aws.uploadScan()

    it 'uploaded a file', (done) ->
      sinon.stub ssd, "moveUploadedFile", (file, success, next) -> next()
      getSQSCount 'input', (error, count) ->
        assert.isUndefined error
        initial_count = count.flight + count.visible
        test_file = { source: "#{root}/#{test_name}", name: test_name }
        fs.copySync "#{__dirname}/#{test_name}", test_file.source
        aws.uploadFile test_file, (error) ->
          assert.isUndefined error
          done()

    it 'added to S3', (done) ->
      bucket = api.instance.bucket
      path = [api.instance.keypath, test_name].join '/'
      aws.token (error, aws_objects) =>
        uploadedFileOptions = { Bucket: bucket, Key: path }
        do checkUploaded = ->
          aws_objects.s3.headObject uploadedFileOptions, (error, metadata) ->
            if metadata
              assert.isNull error
              assert.isDefined metadata
              done()
            else
              setTimeout (->checkUploaded()), 100

    it 'added to SQS', (done) ->
      do checkSQS = ->
        getSQSCount 'input', (error, count) ->
          assert.isUndefined error
          post_count = count.flight + count.visible
          if post_count is (initial_count + 1)
            assert.equal post_count, initial_count + 1
            done()
          else
            setTimeout (->checkSQS()), 100

    it 'picked up by worker', (done) ->
      do checkSQS = ->
        getSQSCount 'input', (error, count) ->
          assert.isUndefined error
          worker_count = count.flight + count.visible
          if worker_count is initial_count
            assert.equal worker_count, initial_count
            done()
          else
            setTimeout (->checkSQS()), 100

    # it 'processed by worker', (done) ->
    #   setTimeout (-> done()), 8000




  # Downloads
  #
  describe 'Download', ->
    output_length = 0

    it 'worker complete', (done) ->
      sinon.stub aws, "scanFailed", (type, error) ->
      sinon.stub aws, "nextScan", (type, error) ->
      sinon.stub aws, "gotFileList", (messages) ->
        if messages?.Messages?.length
          assert.isDefined messages
          assert.isDefined messages.Messages
          for message in messages.Messages
            uploadedMessage = message
            body = JSON.parse message.Body
            assert.equal test_name, body.telemetry.json.filename
            restoreStubs()
            return setTimeout (-> done()), 1000
        else
          aws.downloadScan()
      restoreStubs = ->
        aws.gotFileList.restore()
        aws.scanFailed.restore()
        aws.nextScan.restore()
      aws.downloadScan()

    it 'downloaded file', (done) ->
      sinon.stub ssd, "appendToTelemetry", (telemetry, next) -> next()
      sinon.stub ssd, "saveDownloadedFile", (stream, filename, tele, next) ->
        assert.isDefined stream
        assert.isDefined filename
        next()
      sinon.stub aws, "skipFile", (next) ->
      getSQSCount 'output', (error, count) ->
        output_length = count.flight + count.visible
        aws.downloadFile uploadedMessage, (error) ->
          restoreObjects()
          assert.isUndefined error
          done()
      restoreObjects = ->
        ssd.appendToTelemetry.restore()
        ssd.saveDownloadedFile.restore()
        aws.skipFile.restore()

    it 'removed file from output queue', (done) ->
      do checkSQS = ->
        getSQSCount 'output', (error, count) ->
          if error
            assert.isUndefined error
            return console.log error
          new_output_length = count.flight + count.visible
          # console.log output_length, new_output_length
          if (output_length) is new_output_length
            assert.equal (output_length), new_output_length
            done()
          else
            setTimeout (-> checkSQS()), 500





  # Clear down the instance once complete

  describe 'Clear Instance', ->

    it 'cleaned down local test directory', (done) ->
      deleteFolder root
      done()

    it 'killed the testing instance', (done) ->
      api.stopLoadedInstance (error) ->
        assert.isFalse error
        assert.isFalse api.instance
        ssd.stop (error) ->
          assert.isUndefined error
          done()
