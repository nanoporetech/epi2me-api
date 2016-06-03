
EventEmitter = require('events').EventEmitter




# RemoteDirectory. This is tasked with keeping an eye on the SQS Queue and physically downloading any files which are ready to be downloaded.

class RemoteDirectory extends EventEmitter
  constructor: (@options, @api) ->




  # Start

  start: (done) ->
    @instance = @api.currentInstance
    return done? new Error "Instance already running" if @isRunning
    @makeStats =>
      @isRunning = yes
      @downloadScan()
      done?()




  # Stats

  makeStats: (done) ->
    @stats = {}
    done()




  # Download Scanner

  nextDownloadScan: (delay) ->
    return if @scannerKilled
    clearTimeout @nextScanTimer
    return setTimeout ( => @downloadScan() ), 1 if not delay
    @nextScanTimer = setTimeout ( => @downloadScan() ), 5000

  killDownloadScan: ->
    @scannerKilled = yes
    clearTimeout @nextScanTimer

  downloadScan: ->
    @scannerKilled = no
    do stuff = =>
      @nextDownloadScan yes




  #  Found a file to Download

  download: (done) ->




  # Download is complete.

  downloadComplete: (done) ->




  # State control

  pause: (done) ->
    @isRunning = no
    @killDownloadScan()
    @stats = no
    done?()

  resume: (done) ->
    @start (error) =>
      @isRunning = yes
      done?()

  stop: (done) ->
    @pause (error) =>
      @api.instance = no
      done?()




# Export

module.exports = RemoteDirectory
