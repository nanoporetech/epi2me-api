
os = require 'os'
fs = require 'fs'
assert = require('chai').assert
sinon = require 'sinon'
mkdirp = require 'mkdirp'
async = require 'async'
SSD = require '../../src/Classes/SSD.coffee'

guid = -> Math.random().toString(36).substring(7)
fast5 = (item) -> return item.slice(-6) is '.fast5'




# Define the root directory and determine the number of test files. Some functions for creating and removing files/directories. Before we start any test, create an artificial root directory where we can define input and output folders Also an instance method to give us a new standard instance.

root = "#{os.homedir()}/metrichorAPI_TestRoot"
test_files = Math.floor (Math.random() * 1000) + 100

createTestRoot = (done) ->
  mkdirp root, (err) ->
    mkdirp "#{root}/inputFolder", (err)  ->
      mkdirp "#{root}/outputFolder", (err)  ->
        createFile = (filename, next) ->
          fs.writeFile "#{root}/inputFolder/#{guid()}.fast5", 'x', (error) ->
            next()
        async.eachSeries (new Array(test_files)), createFile, ->
          done()

deleteFolder = (path) ->
  return if not fs.existsSync path
  fs.readdirSync(path).forEach (file, index) ->
    curPath = "#{path}/#{file}"
    return fs.unlinkSync curPath if not fs.lstatSync(curPath).isDirectory()
    deleteFolder curPath
  fs.rmdirSync path

destroyTestRoot = (done) ->
  deleteFolder root
  done()

instance = ->
  return new SSD
    inputFolder: "#{root}/inputFolder"
    outputFolder: "#{root}/outputFolder"




# Before we start any test, create an artificial root directory where we can define input and output folders. Populate the input folder with files.# Run start as an integration test. Ensure that the new file functionality works. This goes last because the file-watcher doesn't always get stopped cleanly and we dont want it polluting later tests.

describe "SSD (with #{test_files} files)", ->
  before destroyTestRoot

  describe 'Integration', ->
    before createTestRoot
    after destroyTestRoot
    ssd = instance()

    it 'instantiated correctly', ->
      assert.isDefined ssd.isRunning
      assert.isFalse ssd.isRunning
      assert.equal typeof ssd.batchSize, 'number'
      assert.equal typeof ssd.sub, 'object'

    it 'started without error', (done) ->
      ssd.start (error) ->
        assert.isUndefined error
        assert.isTrue ssd.isRunning
        done()

    it 'built subdirectories', ->
      assert.isTrue fs.existsSync "#{root}/inputFolder/pending"
      assert.isTrue fs.existsSync "#{root}/inputFolder/uploaded"
      assert.isTrue fs.existsSync "#{root}/inputFolder/upload_failed"

    it 'built stats', ->
      assert.isObject ssd.stats

    it 'created batches', (done) ->
      fs.readdir "#{root}/inputFolder", (error, roots) ->
        fs.readdir "#{root}/inputFolder/pending", (error, pendings) ->
          assert.equal pendings.length, Math.floor test_files/ssd.batchSize
          assert.equal roots.length - 3, test_files%ssd.batchSize
          done()

    it 'handles new files', (done) ->
      createFile = (filename, next) ->
        # console.log '+'
        fs.writeFile "#{root}/inputFolder/#{guid()}.fast5", 'x', (error) ->
          console.log error if error
          setTimeout (->next()), 15
      newBatchIn = ssd.batchSize - (test_files%ssd.batchSize)
      # console.log 'start ', ssd.stats.pending, newBatchIn
      async.eachSeries (new Array(newBatchIn)), createFile, ->
        # ssd.convertToBatches yes, (error) ->
        setTimeout (-> # Wait for batcher
          fs.readdir "#{root}/inputFolder/pending", (error, pendings) ->
            assert.equal ssd.stats.pending, test_files + newBatchIn
            expectedBatches = (Math.floor test_files/ssd.batchSize) + 1
            assert.equal pendings.length, expectedBatches
            done()
        ), 500

    it 'stopped without error', (done) ->
      ssd.stop (error) ->
        assert.isUndefined error
        assert.isFalse ssd.isRunning
        done()




  # We tested the stats instantiator in the start test, but here we'll run it again with some data moved around a little.

  describe 'initialStats()', ->
    before createTestRoot
    after destroyTestRoot
    ssd = instance()
    test_stats =
      pending: test_files
      uploaded: 0
      upload_failed: 0
      downloaded: 0
      total: test_files

    it 'runs without error', (done) ->
      mkdirp ssd.sub.pending, (err)  ->
        mkdirp ssd.sub.uploaded, (err)  ->
          mkdirp ssd.sub.upload_failed, (err)  ->
            ssd.initialStats (error) ->
              assert.isUndefined error
              done()

    it 'counted a clean directory', (done) ->
      assert.deepEqual test_stats, ssd.stats
      done()

    it 'ignored non fast5', (done) ->
      fs.writeFile "#{root}/inputFolder/#{guid()}.other", 'x', ->
        ssd.initialStats ->
          assert.equal ssd.stats.pending, test_files
          done()

    it 'counted uploaded files', (done) ->
      fs.writeFile "#{root}/inputFolder/upload_failed/#{guid()}.fast5", 'x', ->
        fs.writeFile "#{root}/inputFolder/uploaded/#{guid()}.fast5", 'x', ->
          ssd.initialStats ->
            test_stats.upload_failed += 1
            test_stats.uploaded += 1
            test_stats.total += 2
            assert.deepEqual ssd.stats, test_stats
            done()




  # Some batching tests.

  describe 'convertToBatches()', ->
    before createTestRoot
    after destroyTestRoot
    ssd = instance()
    ssd.isRunning = yes

    it 'started unbatched', (done) ->
      ssd.createSubdirectories ->
        fs.readdir "#{root}/inputFolder/pending", (error, pendings) ->
          assert.equal pendings.length, 0
          done()

    it 'batched whilst enforcing size', (done) ->
      ssd.convertToBatches yes, ->
        fs.readdir "#{root}/inputFolder", (error, input) ->
          fs.readdir "#{root}/inputFolder/pending", (error, pending) ->
            assert.equal input.length - 3, test_files%ssd.batchSize
            assert.equal pending.length, Math.floor test_files/ssd.batchSize
            done()

    it 'batched without enforcing size', (done) ->
      ssd.convertToBatches no, ->
        fs.readdir "#{root}/inputFolder", (error, roots) ->
          fs.readdir "#{root}/inputFolder/pending", (error, pendings) ->
            assert.equal pendings.length, Math.ceil test_files/ssd.batchSize
            assert.equal roots.length - 3, 0
            done()




  # Getting a batch, tests.

  describe 'getBatch()', ->
    before createTestRoot
    after destroyTestRoot
    ssd = instance()
    ssd.isRunning = yes

    it 'served an available batch from pending', (done) ->
      ssd.convertToBatches yes, ->
        ssd.getBatch (error, batch) ->
          if test_files > ssd.batchSize
            assert.isDefined batch
            assert.isFalse error
          setTimeout (-> done()), 500

    it 'marked as processing', (done) ->
      ssd.getBatch (error, batch) ->
        assert.isFalse error
        isProcessing = (item) -> item.slice(-11) is '.processing'
        assert.isTrue isProcessing batch.source
        done()

    it 'created and served a batch from root', (done) ->
      deleteFolder "#{root}/inputFolder/pending"
      mkdirp "#{root}/inputFolder/pending", ->
        fs.writeFile "#{root}/inputFolder/#{guid()}.fast5", 'x', ->
          ssd.getBatch (error, batch) ->
            assert.isDefined batch
            assert.isFalse error
            done()

    it 'responded with No batches', (done) ->
      deleteFolder "#{root}/inputFolder"
      mkdirp "#{root}/inputFolder", (error) ->
        mkdirp "#{root}/inputFolder/pending", (error) ->
          ssd.getBatch (error, batch) ->
            assert.equal error.message, 'No batches'
            done()




  # Move uploaded

  describe 'moveUploadedFile()', ->
    before createTestRoot
    after destroyTestRoot
    ssd = instance()
    it 'moved succesful upload', (done) ->
      ssd.createSubdirectories ->
        fs.readdir "#{root}/inputFolder", (error, files) ->
          ssd.stats = {}
          file =
            name: files.filter(fast5)[0]
            source: "#{root}/inputFolder/#{files.filter(fast5)[0]}"
          ssd.moveUploadedFile file, yes, ->
            fs.readdir "#{root}/inputFolder/uploaded", (error, uploaded) ->
              assert.isNull error
              assert.equal uploaded.length, 1
              fs.readdir "#{root}/inputFolder", (error, input) ->
                assert.isNull error
                assert.equal input.length - 3, test_files - 1
                done()

    it 'moved failed upload', (done) ->
      ssd.stats = {}
      ssd.createSubdirectories ->
        fs.readdir "#{root}/inputFolder", (error, files) ->
          file =
            name: files.filter(fast5)[0]
            source: "#{root}/inputFolder/#{files.filter(fast5)[0]}"
          ssd.moveUploadedFile file, no, ->
            fs.readdir "#{root}/inputFolder/upload_failed", (error, failed) ->
              assert.equal failed.length, 1
              fs.readdir "#{root}/inputFolder", (error, input) ->
                assert.equal input.length - 3, test_files - 2
                done()




  # Save a file to a location specified in a telemetry object.

  describe 'saveDownloadedFile()', ->
    before createTestRoot
    after destroyTestRoot
    ssd = instance()

    it 'saved passing file', (done) ->
      ssd.stats = {}
      ssd.createSubdirectories ->
        mock_s3_item = "#{root}/#{guid()}.fast5"
        fs.writeFile mock_s3_item, 'x', ->
          stream = fs.createReadStream mock_s3_item
          dest = 'saveDownloadedFile_test.fast5'
          telemetry = hints: folder: 'pass'
          ssd.saveDownloadedFile stream, dest, telemetry, (error) ->
            assert.isUndefined error
            assert.isTrue fs.existsSync "#{root}/outputFolder/pass/#{dest}"
            done()

    it 'saved failing file', (done) ->
      ssd.stats = {}
      ssd.createSubdirectories ->
        mock_s3_item = "#{root}/#{guid()}.fast5"
        fs.writeFile mock_s3_item, 'x', ->
          stream = fs.createReadStream mock_s3_item
          dest = 'saveDownloadedFile_test.fast5'
          telemetry = hints: folder: 'fail'
          ssd.saveDownloadedFile stream, dest, telemetry, (error) ->
            assert.isUndefined error
            assert.isTrue fs.existsSync "#{root}/outputFolder/fail/#{dest}"
            done()




  # Ensure there is free space on the machine

  describe 'freeSpace()', (done) ->
    ssd = instance()
    disk = require('diskspace')

    it 'identified free space', (done) ->
      ssd.freeSpace (error) ->
        assert.isUndefined error
        done()

    it 'throws error if no free space', (done) ->
      stub = sinon.stub disk, 'check', (path, done) ->  done no, 1, 1
      ssd.freeSpace (error) ->
        disk.check.restore()
        assert.equal error.message, 'No disk space'
        done()

    it 'ignored telemetry only', (done) ->
      spy = sinon.spy disk, 'check'
      ssd.freeSpace (error) ->
        assert.equal spy.callCount, 1
        ssd.options.downloadMode = 'telemetry'
        ssd.freeSpace (error) ->
          assert.equal spy.callCount, 1
          delete ssd.options.downloadMode
          done()




  # Telemetry methods, ensure the telemetry file is being created, written to and read from successfully.

  describe 'Telemetry', (done) ->
    before createTestRoot
    after destroyTestRoot
    ssd = instance()

    it 'created telemetry stream', (done) ->
      ssd.createTelemetry '123', (error) ->
        file_location = "#{root}/outputFolder/telemetry-123.log"
        assert.isTrue fs.existsSync file_location
        done()

    it 'appended to telemetry', (done) ->
      file_location = "#{root}/outputFolder/telemetry-123.log"
      before = fs.statSync(file_location).size
      ssd.appendToTelemetry { hello: 'world' }, ->
        after = fs.statSync(file_location).size
        assert.isAbove after, before
        done()

    it 'counted telemetry', (done) ->
      ssd.appendToTelemetry { hello: 'two' }, ->
        ssd.countTelemetry (lines) ->
          total_lines = lines
          assert.equal total_lines, 2
          done()




  # Reset the local directory.

  describe 'reset()', (done) ->
    before createTestRoot
    after destroyTestRoot
    ssd = instance()

    it 'threw an error while running', (done) ->
      ssd.start (error) ->
        assert.isUndefined error
        ssd.reset (error) ->
          assert.isDefined error
          done()

    it 'did not throw error when stopped', (done) ->
      setTimeout ->
        ssd.stop (error) ->
          assert.isUndefined error
          ssd.reset (error) ->
            assert.isFalse error
            done()
      , 200

    it 'correctly restored the database', (done) ->
      fs.readdir "#{root}/inputFolder/pending", (error, pendings) ->
        assert.equal pendings.length, 0
        done()




  # Any small helper functions. Permissions, mark as processing.

  describe 'Misc', (done) ->
    before createTestRoot
    after destroyTestRoot

    ssd = instance()

    it 'checkPermissions()', (done) ->
      ssd.checkPermissions (error) ->
        assert.isUndefined error
        done()

    it 'markAsProcessing()', (done) ->
      source = "#{root}/inputFolder/pending/markAsProcessing_test"
      mkdirp source, (err) ->
        ssd.markAsProcessing source, (error, destination) ->
          assert.isFalse error
          assert.equal destination, "#{source}.processing"
          done()
