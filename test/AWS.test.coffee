
os = require 'os'
fs = require 'fs'
mkdirp = require 'mkdirp'
assert = require('chai').assert
sinon = require 'sinon'
AWS = require '../src/Classes/AWS.coffee'
SSD = require '../src/Classes/SSD.coffee'
API = require '../src/Classes/MetrichorAPI.coffee'
apikey = fs.readFileSync('./@options.apikey', 'utf8').trim()
guid = -> Math.random().toString(36).substring(7)

deleteFolder = (path) ->
  return if not fs.existsSync path
  fs.readdirSync(path).forEach (file, index) ->
    curPath = "#{path}/#{file}"
    return fs.unlinkSync curPath if not fs.lstatSync(curPath).isDirectory()
    deleteFolder curPath
  fs.rmdirSync path




# Build the paramaters required to run AWS.

currentInstance = no
api = new API
  apikey: apikey
  url: "https://dev.metrichor.com"
  agent_version: "2.41"

root = "#{os.homedir()}/metrichorAPI_TestRoot"
ssd = new SSD
  inputFolder: "#{root}/inputFolder"
  outputFolder: "#{root}/outputFolder"

aws = new AWS {}, api, ssd






# Integration. We will keep the instance alive.

describe "AWS", ->
  describe 'Integration', ->
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
      aws.api.createNewInstance { app: 454 }, (error, id) ->
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
    downloadScan = sinon.stub aws, "downloadScan", ->
    uploadScan = sinon.stub aws, "uploadScan", ->

    it 'ran nextScan()', (done) ->
      aws.start (error) ->
        dTimer = aws.nextScan 'download', 1
        uTimer = aws.nextScan 'upload', 1
        assert.isDefined dTimer
        assert.isDefined uTimer
        assert.equal downloadScan.callCount, 1
        assert.equal uploadScan.callCount, 1
        downloadScan.reset()
        uploadScan.reset()
        done()

    it 'ran scanFailed()', (done) ->
      dTimer = aws.scanFailed 'download', 1
      uTimer = aws.scanFailed 'upload', 1
      assert.isDefined dTimer
      assert.isDefined uTimer
      done()

    it 'emitted fatal()', (done) ->
      aws.on 'fatal', (fatalMessage) ->
        assert.isDefined fatalMessage
        done()
      aws.fatal new Error 'test'




  # Uploads. First let's create a file to actually upload.

  describe 'Upload', ->
    # file1 = "#{root}/#{guid()}.fast5"
    # file2 = "#{root}/#{guid()}.fast5"
    # test_batch =
    #   source: root
    #   files: [file1, file2]
    #
    # it 'created files to test upload', (done) ->
    #   mkdirp root, (err) ->
    #     fs.writeFile file1, 'x1', (error) ->
    #       fs.writeFile file2, 'x2', (error) ->
    #         assert.isTrue fs.existsSync file1
    #         assert.isTrue fs.existsSync file2
    #         done()
    #
    # it 'called uploadFile for every file in batch', (done) ->
    #   aws.uploadScan.restore()
    #   uploadFile = sinon.stub aws, "uploadFile", (file, done) -> done()
    #   removeEmpty = sinon.stub ssd, "removeEmptyBatch", (source, done) -> done()
    #   sinon.stub ssd, "getBatch", (done) -> done no, test_batch
    #   aws.uploadScan()
    #   setTimeout(->
    #     assert.equal removeEmpty.callCount, 1
    #     assert.equal uploadFile.callCount, 2
    #     ssd.removeEmptyBatch.restore()
    #     done()
    #   , 1000)
    #
    # it 'cleaned down local test directory', (done) ->
    #   deleteFolder root
    #   done()





  # Downloads

  describe 'Download', ->


  describe 'Clear Instance', ->
    it 'killed the testing instance', (done) ->
      api.stopLoadedInstance (error) ->
        assert.isFalse api.instance
        done()
