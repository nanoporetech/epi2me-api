os = require 'os'
fs = require 'fs'
assert = require('chai').assert
sinon = require 'sinon'
mkdirp = require 'mkdirp'

SSD = require '../src/Classes/SSD.coffee'


describe 'New Instance', ->

  root = "#{os.homedir()}/metrichorAPI_TestRoot"

  before ->
    mkdirp root
    mkdirp "#{root}/inputFolder"
    mkdirp "#{root}/outputFolder"

  options =
    inputFolder: "#{root}/inputFolder"
    outputFolder: "#{root}/outputFolder"

  options =
    inputFolder: "#{root}/inputFolder"
    outputFolder: "#{root}/outputFolder"

  api =
    loadedInstance: '000'

  ssd = new SSD options,

  describe 'new SSD()', ->
    it 'defines a batch size', ->
      assert.equal typeof ssd.batchSize, 'number'

  describe 'ssd.start()', ->
    ssd.start ->
      it 'builds subdirectory paths', ->
        assert.isTrue fs.existsSync "#{root}/inputFolder/pending"
        assert.isTrue fs.existsSync "#{root}/inputFolder/uploaded"
        assert.isTrue fs.existsSync "#{root}/inputFolder/upload_failed"


  after ->
    do deleteFolderRecursive = (path = root) ->
      fs.readdirSync(path).forEach (file, index) ->
        curPath = "#{root}/#{file}"
        return fs.unlinkSync curPath if not fs.lstatSync(curPath).isDirectory()
        deleteFolderRecursive curPath
      fs.rmdirSync path

  # describe 'Start', ->
  #   sinon.stub ssd, "createSubdirectories", =>
  #     console.log 'createSubdirectories'
  #   ssd.start()
