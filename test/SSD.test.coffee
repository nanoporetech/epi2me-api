os = require 'os'
fs = require 'fs'
assert = require('chai').assert
sinon = require 'sinon'
mkdirp = require 'mkdirp'
async = require 'async'

SSD = require '../src/Classes/SSD.coffee'

guid = -> Math.random().toString(36).substring(7)




# Some functions for creating and removing files.

root = "#{os.homedir()}/metrichorAPI_TestRoot"
test_files = 123

createTestRoot = (done) ->
  mkdirp root
  mkdirp "#{root}/inputFolder"
  mkdirp "#{root}/outputFolder"
  filenames = []
  filenames.push "#{guid()}.fast5" for file in [1..test_files]
  createFile = (filename, next) ->
    fs.writeFile "#{root}/inputFolder/#{filename}", 'x', (error) ->
      return createFile filename, next if error
      next()
  async.eachSeries filenames, createFile, done

destroyTestRoot = (done) ->
  do deleteFolderRecursive = (path = root) ->
    return if not fs.existsSync path
    fs.readdirSync(path).forEach (file, index) ->
      curPath = "#{path}/#{file}"
      return fs.unlinkSync curPath if not fs.lstatSync(curPath).isDirectory()
      deleteFolderRecursive curPath
    fs.rmdirSync path
  do checkComplete = ->
    return done() if not fs.existsSync root
    checkComplete()

instance = ->
  return new SSD
    inputFolder: "#{root}/inputFolder"
    outputFolder: "#{root}/outputFolder"




# Before we start any test, create an artificial root directory where we can define input and output folders. Populate the input folder with files.

describe 'SSD', ->

  describe 'constructor', ->
    ssd = instance()

    it 'instantiated correctly', ->
      assert.isDefined ssd.isRunning
      assert.isFalse ssd.isRunning
      assert.equal typeof ssd.batchSize, 'number'
      assert.equal typeof ssd.sub, 'object'




  # Run start as an integration test. Ensure that the new file functionality works.

  describe 'start', ->
    before createTestRoot
    after destroyTestRoot
    ssd = instance()

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

    it 'created batches', ->
      rootContents = fs.readdirSync "#{root}/inputFolder"
      pendingContents = fs.readdirSync "#{root}/inputFolder/pending"
      assert.equal pendingContents.length, Math.floor test_files/ssd.batchSize
      assert.equal rootContents.length - 3, test_files%ssd.batchSize

    it 'handles new files', (done) ->
      newBatchIn = ssd.batchSize - (test_files%ssd.batchSize)
      for file in [1..newBatchIn]
        fs.writeFileSync "#{root}/inputFolder/#{guid()}.fast5", 'x'
      setTimeout (->
        pendingContents = fs.readdirSync "#{root}/inputFolder/pending"
        assert.equal ssd.stats.pending, test_files + newBatchIn
        expectedBatches = (Math.floor test_files/ssd.batchSize) + 1
        assert.equal pendingContents.length, expectedBatches
        done()
      ), 200




  # We tested the stats instantiator in the start test, but here we'll run it again with some data moved around a little.

  describe 'initialStats', ->
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
      mkdirp value for key, value of ssd.sub
      ssd.initialStats (error) =>
        assert.isUndefined error
        done()

    it 'counted a clean directory', (done) ->
      assert.deepEqual ssd.stats, test_stats
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

  describe 'convertToBatches', ->
    before createTestRoot
    after destroyTestRoot
    ssd = instance()

    it 'started unbatched', ->
      mkdirp value for key, value of ssd.sub
      fs.readdir "#{root}/inputFolder/pending", (error, pendingContents) ->
        assert.equal pendingContents.length, 0

    it 'batched whilst enforcing size', (done) ->
      ssd.convertToBatches yes, ->
        fs.readdir "#{root}/inputFolder", (error, input) ->
          fs.readdir "#{root}/inputFolder/pending", (error, pending) ->
            assert.equal input.length - 3, test_files%ssd.batchSize
            assert.equal pending.length, Math.floor test_files/ssd.batchSize
            done()

    it 'batched without enforcing size', (done) ->
      ssd.convertToBatches no, ->
        rootContents = fs.readdirSync "#{root}/inputFolder"
        pendingContents = fs.readdirSync "#{root}/inputFolder/pending"
        assert.equal pendingContents.length, Math.ceil test_files/ssd.batchSize
        assert.equal rootContents.length - 3, 0
        done()
