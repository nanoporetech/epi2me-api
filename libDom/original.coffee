# Author:        rpettett
# Last Maintained: $Author$
# Last Modified: $Date$
# Id:            $Id$
# $HeadURL$
# $LastChangedRevision$
# $Revision$

###jslint nomen: true, stupid: true ###

# stupid required for cached statSync in readdir

###global require, module, $, metrichor ###

metrichor = (opt_string) ->

  ### Constructor for Metrichor API object ###

  # opts = undefined
  # logfunc = undefined
  # if typeof opt_string == 'string' or typeof opt_string == 'object' and opt_string.constructor == String
  #   opts = JSON.parse(opt_string)
  # else
  #   opts = opt_string or {}
  # if opts.log
  #   if typeof opts.log.info == 'function' and typeof opts.log.warn == 'function' and typeof opts.log.error == 'function'
  #     @log = opts.log
  #   else
  #     throw new Error('expected log object to have "error", "info" and "warn" methods')
  # # Default log method
  # if !@log
  #
  #   logfunc = (str) ->
  #     console.log '[' + (new Date).toISOString() + '] ' + str
  #     return
  #
  #   @log =
  #     info: logfunc
  #     warn: logfunc
  #     error: logfunc
  # Container for Metrichor API configuration
  # _config = options:
  #   agent_version: opts.agent_version
  #   agent_address: opts.agent_address
  #   apikey: opts.apikey
  #   proxy: opts.proxy
  #   url: opts.url or 'https://metrichor.com'
  #   user_agent: opts.user_agent or 'Metrichor API'
  #   retention: 'on'
  #   telemetryCb: opts.telemetryCb
  #   dataCb: opts.dataCb
  #   sessionGrace: 5
  #   remoteShutdownCb: opts.remoteShutdownCb
  #   inputFolder: opts.inputFolder
  #   inputFormat: opts.inputFormat or 'fast5'
  #   sortInputFiles: opts.sortInputFiles or false
  #   uploadPoolSize: 10
  #   uploadTimeout: 300
  #   uploadQueueThreshold: opts.uploadQueueThreshold or 500
  #   fileCheckInterval: opts.fileCheckInterval or 15
  #   downloadCheckInterval: 4
  #   stateCheckInterval: 60
  #   initDelay: opts.initDelay or 10000
  #   outputFolder: opts.outputFolder
  #   uploadedFolder: opts.uploadedFolder
  #   inFlightDelay: opts.inFlightDelay or 600
  #   waitTimeSeconds: opts.waitTimeSeconds or 20
  #   waitTokenError: opts.waitTokenError or 30
  #   downloadTimeout: opts.downloadTimeout or 300
  #   downloadPoolSize: opts.downloadPoolSize or 10
  #   filter: opts.filter or 'on'
  #   filterByChannel: opts.filterByChannel or 'off'
  #   downloadMode: opts.downloadMode or 'data+telemetry'
  #   deleteOnComplete: opts.deleteOnComplete or 'off'
  # @resetStats()

  @resetInstance
    id_workflow_instance: opts.id_workflow_instance
    region: opts.region
  this
#
# 'use strict'
# request = undefined
# AWS = undefined
# queue = undefined
# fs = undefined
# path = undefined
# os = undefined
# mkdirp = undefined
# proxy = undefined
# _config = undefined
#


try
  if $
    # typeof $ !== 'undefined'
    # JQUERY MODE. Only Web API requests are supported (i.e. no data transfers)

    jqWrap = (method, params, cb) ->

      ###jslint unparam: true###

      $.ajax
        url: params.uri
        type: method
        success: (data, status, jqXHR) ->
          cb null, data, jqXHR.responseText
          return
        error: (jqXHR, status, errStr) ->
          cb errStr, null, jqXHR.responseText
          return
        data: params.form
        dataType: 'json'
      return

    request =
      put: (params, cb) ->
        jqWrap 'PUT', params, cb
      get: (params, cb) ->
        jqWrap 'GET', params, cb
      post: (params, cb) ->
        jqWrap 'POST', params, cb




# catch exception
#   # NODEJS MODE
#   request = require('request')
#   AWS = require('aws-sdk')
#   fs = require('graceful-fs')
#
#   ### MC-565 handle EMFILE gracefully ###
#
#   os = require('os')
#   queue = require('queue-async')
#   path = require('path')
#   mkdirp = require('mkdirp')
#   proxy = require('proxy-agent')
#   module.exports = metrichor
#   module.exports.version = '2.39.1'
metrichor.prototype =
  url: ->
    _config.options.url
  apikey: ->
    _config.options.apikey
  attr: (key, value) ->
    if _config.options.hasOwnProperty(key)
      if value
        _config.options[key] = value
      else
        return _config.options[key]
    else
      throw new Error('config object does not contain property ' + key)
    this
  resetInstance: (options) ->
    options = options or {}

    ### Container for workflow instance configuration. ###

    _config.instance =
      inputQueueName: null
      inputQueueURL: null
      outputQueueName: null
      outputQueueURL: null
      _discoverQueueCache: {}
      id_workflow_instance: options.id_workflow_instance or null
      bucket: null
      bucketFolder: null
      remote_addr: null
      chain: null
      awssettings: region: options.region or 'eu-west-1'
    return
  stats: (key) ->
    if @_stats[key]
      @_stats[key].queueLength = if isNaN(@_stats[key].queueLength) then 0 else @_stats[key].queueLength
      # a little housekeeping
      # 'total' is the most up-to-date measure of the total number of reads to be uploaded
      if key == 'upload'
        @_stats.upload.total = (@_stats.upload.enqueueCount or 0) + (if @_fileStash and @_fileStash.length then @_fileStash.length else 0)
    @_stats[key]
  # user: (cb) ->
  #   @_get 'user', cb
  # workflows: (cb) ->
  #   @_list 'workflow', cb
  # workflow: (id, obj, cb) ->
  #   if !cb
  #     # two args: get object
  #     cb = obj
  #     return @_read('workflow', id, cb)
  #   # three args: update object
  #   @_post 'workflow', id, obj, cb
  # start_workflow: (config, cb) ->
  #   @_post 'workflow_instance', null, config, cb
  # stop_workflow: (instance_id, cb) ->
  #   @_put 'workflow_instance/stop', instance_id, cb
  # workflow_instances: (cb) ->
  #   @_list 'workflow_instance', cb
  # workflow_instance: (id, cb) ->
  #   @_read 'workflow_instance', id, cb
  # workflow_config: (id, cb) ->
  #   @_get 'workflow/config/' + id, cb
  token: (id, cb) ->

    ### should this be passed a hint at what the token is for? ###

    that = this
    that._post 'token', { id_workflow_instance: id or _config.instance.id_workflow_instance }, null, cb
  # _list: (entity, cb) ->
  #   @_get entity, (e, json) ->
  #     if cb
  #       cb e, json[entity + 's']
  #     return
  # _read: (entity, id, cb) ->
  #   @_get entity + '/' + id, cb
  # _get: (uri, cb) ->
  #   # do something to get/set data in metrichor
  #   call = undefined
  #   mc = undefined
  #   srv = _config.options.url
  #   uri = '/' + uri + '.js?apikey=' + _config.options.apikey
  #   srv = srv.replace(/\/+$/, '')
  #   # clip trailing /s
  #   uri = uri.replace(/\/+/g, '/')
  #   if _config.options.agent_version
  #     uri = uri + ';agent_version=' + _config.options.agent_version
  #   call = srv + uri
  #   mc = this
  #   request.get {
  #     uri: call
  #     proxy: _config.options.proxy
  #     headers: 'X-Metrichor-Client': _config.options.user_agent
  #   }, (e, r, body) ->
  #     mc._responsehandler e, r, body, cb
  #     return
  #   return
  # _post: (uri, id, obj, cb) ->
  #   srv = undefined
  #   call = undefined
  #   that = this
  #   form = apikey: _config.options.apikey
  #   if obj != undefined
  #     form.json = JSON.stringify(obj)
  #   if _config.options.agent_version
  #     form.agent_version = _config.options.agent_version
  #
  #   ### if id is an object, merge it into form post parameters ###
  #
  #   if id and typeof id == 'object'
  #     Object.keys(id).forEach (attr) ->
  #       form[attr] = id[attr]
  #       return
  #     id = ''
  #   srv = _config.options.url
  #   srv = srv.replace(/\/+$/, '')
  #   # clip trailing /s
  #   uri = uri.replace(/\/+/g, '/')
  #   call = srv + '/' + uri
  #   if id
  #     call = call + '/' + id
  #   call += '.js'
  #   request.post {
  #     uri: call
  #     form: form
  #     proxy: _config.options.proxy
  #     headers: 'X-Metrichor-Client': _config.options.user_agent
  #   }, (e, r, body) ->
  #     that._responsehandler e, r, body, cb
  #     return
  #   return
  # _put: (uri, id, obj, cb) ->
  #
  #   ### three-arg _put call (no parameters) ###
  #
  #   if typeof obj == 'function'
  #     cb = obj
  #   srv = undefined
  #   call = undefined
  #   that = this
  #   form =
  #     apikey: _config.options.apikey
  #     json: JSON.stringify(obj)
  #   if _config.options.agent_version
  #     form.agent_version = _config.options.agent_version
  #   srv = _config.options.url
  #   srv = srv.replace(/\/+$/, '')
  #   # clip trailing /s
  #   uri = uri.replace(/\/+/g, '/')
  #   call = srv + '/' + uri + '/' + id + '.js'
  #   request.put {
  #     uri: call
  #     form: form
  #     proxy: _config.options.proxy
  #     headers: 'X-Metrichor-Client': _config.options.user_agent
  #   }, (e, r, body) ->
  #     that._responsehandler e, r, body, cb
  #     return
  #   return
  # _responsehandler: (res_e, r, body, cb) ->
  #   json = undefined
  #   if res_e
  #     if cb
  #       cb res_e, {}
  #     return
  #   if r and r.statusCode >= 400
  #     if cb
  #       cb { 'error': 'HTTP status ' + r.statusCode }, {}
  #     return
  #   try
  #     json = JSON.parse(body)
  #   catch jsn_e
  #     if cb
  #       cb jsn_e, {}
  #     return
  #   if json.error
  #     if cb
  #       cb { 'error': json.error }, {}
  #     return
  #   if cb
  #     cb null, json
  #   return
  # resetStats: ->
  #   @_stats =
  #     upload:
  #       success: 0
  #       failure: {}
  #       queueLength: 0
  #       totalSize: 0
  #     download:
  #       success: 0
  #       fail: 0
  #       failure: {}
  #       queueLength: 0
  #       totalSize: 0
  #   return
  # stop_everything: (cb) ->
  #   that = this
  #   that.log.info 'stopping watchers'
  #   # should probably use another quick queue-async here
  #   if _config.instance.id_workflow_instance
  #     that.stop_workflow _config.instance.id_workflow_instance, ->
  #       that.log.info 'workflow instance ' + _config.instance.id_workflow_instance + ' stopped'
  #       return
  #   if that._downloadCheckInterval
  #     that.log.info 'clearing _downloadCheckInterval interval'
  #     clearInterval that._downloadCheckInterval
  #     that._downloadCheckInterval = null
  #   if that._stateCheckInterval
  #     that.log.info 'clearing stateCheckInterval interval'
  #     clearInterval that._stateCheckInterval
  #     that._stateCheckInterval = null
  #   if that._fileCheckInterval
  #     that.log.info 'clearing _fileCheckInterval interval'
  #     clearInterval that._fileCheckInterval
  #     that._fileCheckInterval = null
  #   if that.uploadWorkerPool
  #     that.log.info 'clearing uploadWorkerPool'
  #     that.uploadWorkerPool.drain()
  #     that.uploadWorkerPool = null
  #   if that.downloadWorkerPool
  #     that.log.info 'clearing downloadWorkerPool'
  #     that.downloadWorkerPool.drain()
  #     that.downloadWorkerPool = null
  #   if cb
  #     cb()
  #   return

  session: (sessionCb) ->
    that = this

    ### MC-1848 all session requests are serialised through that.sessionQueue to avoid multiple overlapping requests ###

    if !that.sessionQueue
      that.sessionQueue = queue(1)
    if !that._stats.sts_expiration or that._stats.sts_expiration and that._stats.sts_expiration <= new Date and !that.sessionQueue.remaining()

      ### Throttle to n=1: bail out if there's already a job queued ###

      ### queue a request for a new session token and hope it comes back in under _config.options.sessionGrace time ###

      that.sessionQueue.defer (queueCb) ->
        that.fetchInstanceToken queueCb

        ### free up the sessionQueue slot   ###

        return

    ### carry on regardless. These will fail if the session does
    # expire and isn't refreshed in time - could consider
    # delaying them in those cases
    ###

    if sessionCb
      return sessionCb()
    return
  fetchInstanceToken: (queueCb) ->
    that = this
    if !_config.instance.id_workflow_instance
      throw new Error('must specify id_workflow_instance')
    if that._stats.sts_expiration and that._stats.sts_expiration > new Date

      ### escape if session is still valid ###

      return queueCb()
    that.log.info 'new instance token needed'
    that.token _config.instance.id_workflow_instance, (tokenError, token) ->
      if tokenError
        that.log.warn if 'failed to fetch instance token: ' + tokenError.error then tokenError.error else tokenError
        setTimeout queueCb, 1000 * _config.options.waitTokenError

        ### delay this one 30 secs so we don't hammer the website ###

        return
      that.log.info 'allocated new instance token expiring at ' + token.expiration
      that._stats.sts_expiration = new Date(token.expiration)
      # Date object for expiration check later
      that._stats.sts_expiration.setMinutes that._stats.sts_expiration.getMinutes() - (_config.options.sessionGrace)
      # refresh token x mins before it expires
      # "classic" token mode no longer supported
      if _config.options.proxy
        AWS.config.update httpOptions: agent: proxy(_config.options.proxy, true)
      AWS.config.update _config.instance.awssettings
      AWS.config.update token
      queueCb()
    return
  sessionedS3: (cb) ->
    that = this
    that.session (sessionError) ->
      s3 = new (AWS.S3)
      if cb
        cb sessionError, s3
      return
    return
  sessionedSQS: (cb) ->
    that = this
    that.session (sessionError) ->
      sqs = new (AWS.SQS)
      if cb
        cb sessionError, sqs
      return
    return
  # autoStart: (workflow_config, cb) ->
  #   that = this
  #   that.resetInstance()
  #   that.resetStats()
  #   that.start_workflow workflow_config, (workflowError, instance) ->
  #     if workflowError
  #       msg = 'Failed to start workflow: ' + (if workflowError and workflowError.error then workflowError.error else workflowError)
  #       that.log.warn msg
  #       if cb
  #         cb msg
  #       return
  #     that.autoConfigure instance, cb
  #     return
  #   return
  # autoJoin: (id, cb) ->
  #   that = this
  #   that.resetInstance id_workflow_instance: id
  #   that.resetStats()
  #   that.workflow_instance id, (instanceError, instance) ->
  #     if instanceError
  #       msg = 'Failed to join workflow: ' + (if instanceError and instanceError.error then instanceError.error else instanceError)
  #       that.log.warn msg
  #       if cb
  #         cb msg
  #       return
  #     if instance.state == 'stopped'
  #       that.log.warn 'workflow ' + id + ' is already stopped'
  #       if cb
  #         cb 'could not join workflow'
  #       return
  #     that.autoConfigure instance, cb
  #     return
  #   return
  # autoConfigure: (instance, autoStartCb) ->
  #   i = undefined
  #   blocker = undefined
  #   telemetryLogPath = undefined
  #   fileName = undefined
  #   that = this
  #
  #   ### region
  #   # id_workflow_instance
  #   # inputqueue
  #   # outputqueue
  #   # bucket
  #   # remote_addr
  #   # description (workflow)
  #   # chain
  #   ###
  #
  #   _config.instance.id_workflow_instance = instance.id_workflow_instance
  #   _config.instance.remote_addr = instance.remote_addr
  #   _config.instance.bucket = instance.bucket
  #   _config.instance.inputQueueName = instance.inputqueue
  #   _config.instance.outputQueueName = instance.outputqueue
  #   _config.instance.awssettings.region = instance.region
  #   _config.instance.bucketFolder = instance.outputqueue + '/' + instance.id_user + '/' + instance.id_workflow_instance
  #   _config.instance.user_defined = instance.user_defined
  #   # MC-2387 - parameterisation
  #   if instance.chain
  #     if typeof instance.chain == 'object'
  #       # already parsed
  #       _config.instance.chain = instance.chain
  #     else
  #       try
  #         _config.instance.chain = JSON.parse(instance.chain)
  #       catch jsonException
  #         throw new Error('exception parsing chain JSON ' + String(jsonException))
  #   if !_config.options.inputFolder
  #     throw new Error('must set inputFolder')
  #   if !_config.options.outputFolder
  #     throw new Error('must set outputFolder')
  #   if !_config.instance.bucketFolder
  #     throw new Error('bucketFolder must be set')
  #   if !_config.instance.inputQueueName
  #     throw new Error('inputQueueName must be set')
  #   if !_config.instance.outputQueueName
  #     throw new Error('outputQueueName must be set')
  #   # configure the upload queue, but start slowly (artificially occupied slots for a few seconds)
  #   if !that.uploadWorkerPool
  #     that.uploadWorkerPool = queue(_config.options.uploadPoolSize)
  #
  #   blocker = (i) ->
  #     that.uploadWorkerPool.defer (cb) ->
  #       setTimeout (->
  #         that.log.info 'freeing slot ' + i
  #         if cb
  #           cb()
  #         return
  #       ), _config.options.initDelay
  #
  #       ### slow connections, e.g. CRP, can take > 5 secs to allocate a STS token ###
  #
  #       return
  #     return
  #
  #   ### early request for a session token ###
  #
  #   that.session()
  #   i = 0
  #   while i < _config.options.uploadPoolSize
  #     that.log.info 'delaying slot ' + i
  #     blocker i
  #     i += 1
  #   mkdirp.sync _config.options.outputFolder
  #   # MC-1828 - include instance id in telemetry file name
  #   fileName = if _config.instance.id_workflow_instance then 'telemetry-' + _config.instance.id_workflow_instance + '.log' else 'telemetry.log'
  #   telemetryLogPath = path.join(_config.options.outputFolder, fileName)
  #   try
  #     that.telemetryLogStream = fs.createWriteStream(telemetryLogPath, flags: 'a')
  #     that.log.info 'logging telemetry to ' + telemetryLogPath
  #   catch telemetryLogStreamErr
  #     that.log.error 'error opening telemetry log stream: ' + String(telemetryLogStreamErr)
  #   # sqs event handler
  #   that._fileCheckInterval = setInterval(that.loadUploadFiles.bind(that), _config.options.fileCheckInterval * 1000)
  #   that._uploadedFiles = {}
  #   # container for files that have been successfully uploaded, but failed to move
  #   that.loadUploadFiles()
  #   # Trigger once at workflow instance start
  #   if autoStartCb
  #     # if you didn't pass autoStart a callback, good luck finding out the instance metadata
  #     autoStartCb null, _config.instance
  #   # MC-2068 - Don't use an interval.
  #   that._downloadCheckInterval = setInterval(that.loadAvailableDownloadMessages.bind(that), _config.options.downloadCheckInterval * 1000)
  #   if !that.downloadWorkerPool
  #     that.downloadWorkerPool = queue(_config.options.downloadPoolSize)
  #   # MC-1795 - stop app when instance has been stopped remotely
  #   that._stateCheckInterval = setInterval((->
  #     that.workflow_instance _config.instance.id_workflow_instance, (instanceError, instance) ->
  #       if instanceError
  #         that.log.warn 'failed to check instance state: ' + (if instanceError and instanceError.error then instanceError.error else instanceError)
  #       else
  #         if instance.state == 'stopped'
  #           that.log.warn 'instance was stopped remotely at ' + instance.stop_date + '. shutting down the app.'
  #           that.stop_everything ->
  #             if typeof _config.options.remoteShutdownCb == 'function'
  #               _config.options.remoteShutdownCb 'instance was stopped outside agent at ' + instance.stop_date
  #             return
  #       return
  #     return
  #   ), _config.options.stateCheckInterval * 1000)
  #   return
  downloadWork: (len, cb) ->
    that = this
    if !cb

      cb = ->
        undefined

    if len == undefined or len == null
      return cb()
    that._stats.download.queueLength = len
    if len > 0

      ### only process downloads if there are downloads to process ###

      that.log.info 'downloads available: ' + len
      return that.downloadAvailable(cb)
    that.log.info 'no downloads available'
    cb()
  loadAvailableDownloadMessages: ->
    that = this
    if !that.queueLengthQueue
      that.queueLengthQueue = queue(1)
    if that.queueLengthQueue.remaining() > 0
      that.log.info 'download already running'

      ### don't build up a backlog by queuing another job ###

      return
    that.queueLengthQueue.defer (cb) ->
      that.sessionedSQS (sessionError, sqs) ->

        queryQueueLength = ->
          that.queueLength _config.instance.outputQueueURL, (len) ->
            that.downloadWork len, cb
            return
          return

        if sessionError
          that.log.warn sessionError
          return cb()
        if _config.instance.outputQueueURL
          queryQueueLength()
        else
          that.discoverQueue sqs, _config.instance.outputQueueName, ((queueURL) ->
            _config.instance.outputQueueURL = queueURL
            queryQueueLength()
            return
          ), (err) ->
            that.log.warn 'error looking up queue. ' + String(err)
            if !that._stats.download.failure
              that._stats.download.failure = {}
            that._stats.download.failure[err] = if that._stats.download.failure[err] then that._stats.download.failure[err] + 1 else 1
            cb()
            # clear queueLengthQueue slot
        return
      return
    return
  downloadAvailable: (cb) ->
    that = this
    downloadWorkerPoolRemaining = if that.downloadWorkerPool then that.downloadWorkerPool.remaining() else 0
    if !cb

      cb = ->
        undefined

    if downloadWorkerPoolRemaining >= _config.options.downloadPoolSize * 5

      ### ensure downloadPool is limited but fully utilised ###

      that.log.info downloadWorkerPoolRemaining + ' downloads already queued'
      return cb()
    that.sessionedSQS (sessionError, sqs) ->
      if sessionError
        that.log.warn sessionError
        return cb()
      that.discoverQueue sqs, _config.instance.outputQueueName, ((queueURL) ->
        that.log.info 'fetching messages'
        try
          sqs.receiveMessage {
            QueueUrl: queueURL
            VisibilityTimeout: _config.options.inFlightDelay
            MaxNumberOfMessages: _config.options.downloadPoolSize
            WaitTimeSeconds: _config.options.waitTimeSeconds
          }, (receiveMessageErr, receiveMessageSet) ->
            that.receiveMessages receiveMessageErr, receiveMessageSet, cb
            return
        catch receiveMessageErr
          that.log.error 'receiveMessage exception: ' + String(receiveMessageErr)
          return cb()
        return
      ), (reason) ->
        that._stats.download.failure[reason] = if that._stats.download.failure[reason] then that._stats.download.failure[reason] + 1 else 1
        cb()
      return
    return
  loadUploadFiles: ->
    that = this
    fileExp = new RegExp('\\.' + _config.options.inputFormat + '$')
    remaining = if that.uploadWorkerPool then that.uploadWorkerPool.remaining() else 0

    unstashFiles = ->
      that._fileStash.splice(0, _config.options.uploadQueueThreshold).forEach (fn) ->
        that.enqueueUploadJob fn
      return

    that._fileStash = that._fileStash or []
    if !that._dirScanInProgress and remaining == 0
      that._dirScanInProgress = true
      that.log.info 'scanning folder'
      fs.readdir _config.options.inputFolder, (err, files) ->
        if err
          that._dirScanInProgress = false
          return that.log.error('readdir error: ' + err)
        # Filter is much faster than a for loop or forEach
        that._fileStash = files.filter((fn) ->
          fn.match(fileExp) and !that._uploadedFiles.hasOwnProperty(fn)
        )
        # MC-2535 - option to sort files by time. Async implementation
        if _config.options.sortInputFiles
          that.log.info 'sorting folder'
          # MC-547 Slow everything down with a sort(), but cache stats temporarily
          sortQueue = queue(20)
          # run 20 fs.stat in parallel
          that._fileStash.forEach (v) ->
            sortQueue.defer (cb) ->
              try
                fs.stat path.join(_config.options.inputFolder, v), (err, stat) ->
                  if err
                    that.log.error err
                  # clear queue slot
                  cb null,
                    name: v
                    time: if stat and stat.hasOwnProperty('mtime') then stat.mtime.getTime() else null
                  return
              catch e
                that.log.error e
                cb null, name: v
              return
            return
          sortQueue.awaitAll (err, files) ->
            if !err and files
              that.log.info 'sorted folder'
              that._fileStash = files.sort((a, b) ->
                a.time - (b.time)
              ).map((v) ->
                v.name
              )
              unstashFiles()
            return
        else
          unstashFiles()
        # make sure something is on the queue to avoid the readdir coming back around again too quickly
        that._dirScanInProgress = false
        return
    # Enqueue files; attempt to throttle call stack size
    if remaining < 1000
      that.log.info 'preparing more uploads'
      unstashFiles()
    return
  receiveMessages: (receiveMessageError, receiveMessages, cb) ->
    that = this
    if !cb

      cb = ->
        undefined

    if receiveMessageError
      that.log.warn 'error in receiveMessage ' + String(receiveMessageError)
      return cb()
    if !receiveMessages or !receiveMessages.Messages or !receiveMessages.Messages.length

      ### no work to do ###

      that.log.info 'complete (empty)'
      return cb()
    if !that.downloadWorkerPool
      that.log.warn 'no downloadWorkerPool'
      return cb()
    receiveMessages.Messages.forEach (message) ->
      that.downloadWorkerPool.defer (queueCb) ->

        ### queueCb *must* be called to signal queue job termination ###

        timeoutHandle = undefined
        # timeout to ensure that queueCb *always* gets called

        done = ->
          clearTimeout timeoutHandle
          queueCb()
          return

        timeoutHandle = setTimeout((->
          done()
          that.log.error 'that.downloadWorkerPool timeoutHandle. Clearing queue slot for message: ' + message.Body
          return
        ), (60 + _config.options.downloadTimeout) * 1000)
        that.processMessage message, done
        # queueCb becomes completeCb
        return
      return
    that.log.info 'downloader queued ' + receiveMessages.Messages.length + ' files for download'
    cb()
  deleteMessage: (message) ->
    that = this
    messageBody = JSON.parse(message.Body)
    if that.rentention == 'on'

      ### MC-622 data retention ###

      that.sessionedS3 (sessionError, s3) ->
        if sessionError
          that.log.warn sessionError
        try
          s3.deleteObject {
            Bucket: messageBody.bucket
            Key: messageBody.path
          }, (deleteObjectErr) ->
            if deleteObjectErr
              that.log.warn String(deleteObjectErr) + ' ' + String(deleteObjectErr.stack)
              # an error occurred
            else
              that.log.info 'deleteObject ' + messageBody.path
            return
        catch deleteObjectException
          that.log.error 'deleteObject exception: ' + JSON.stringify(deleteObjectException)
        return
    that.sessionedSQS (sessionError, sqs) ->
      if sessionError
        that.log.warn sessionError
      that.discoverQueue sqs, _config.instance.outputQueueName, ((queueURL) ->
        try
          sqs.deleteMessage {
            QueueUrl: queueURL
            ReceiptHandle: message.ReceiptHandle
          }, (deleteMessageError) ->
            if deleteMessageError
              that.log.warn 'error in deleteMessage ' + String(deleteMessageError)
            that.log.info 'deleteMessage success'
            return
        catch deleteMessageErr
          that.log.error 'deleteMessage exception: ' + String(deleteMessageErr)
        return
      ), (reason) ->
        that._stats.download.failure[reason] = if that._stats.download.failure[reason] then that._stats.download.failure[reason] + 1 else 1
        return
      return
    return
  processMessage: (message, completeCb) ->
    outputFile = undefined
    messageBody = undefined
    fn = undefined
    folder = undefined
    match = undefined
    exit_status = undefined
    that = this
    if !message
      that.log.info 'empty message'
      return completeCb()
    try
      messageBody = JSON.parse(message.Body)
    catch jsonError
      that.log.error 'error parsing JSON message.Body from message: ' + JSON.stringify(message) + ' ' + String(jsonError)
      that.deleteMessage message
      return completeCb()

    ### MC-405 telemetry log to file ###

    if messageBody.telemetry
      try
        that.telemetryLogStream.write JSON.stringify(messageBody.telemetry) + os.EOL
      catch telemetryWriteErr
        that.log.error 'error writing telemetry: ' + telemetryWriteErr
      if _config.options.telemetryCb
        _config.options.telemetryCb messageBody.telemetry
    if !messageBody.path
      that.log.warn 'invalid message: ' + JSON.stringify(messageBody)
      return
    match = messageBody.path.match(/[\w\W]*\/([\w\W]*?)$/)
    fn = if match then match[1] else ''
    folder = _config.options.outputFolder
    if _config.options.filter == 'on'

      ### MC-940: use folder hinting if present ###

      if messageBody.telemetry and messageBody.telemetry.hints and messageBody.telemetry.hints.folder
        that.log.info 'using folder hint'
        folder = path.join(folder, messageBody.telemetry.hints.folder)

        ### MC-508 optional split by channel id ###

        if _config.options.filterByChannel == 'on' and messageBody.telemetry.hints and messageBody.telemetry.hints.channel_id
          folder = path.join(folder, messageBody.telemetry.hints.channel_id)

      ### MC-348 Purity Filter exit_status =~ /Workflow successful/ ###

      if messageBody.telemetry and !messageBody.telemetry.hints and messageBody.telemetry.json and messageBody.telemetry.json.exit_status
        exit_status = messageBody.telemetry.json.exit_status
        if exit_status.match(/workflow[ ]successful/i)
          folder = path.join(folder, 'pass')
        else
          folder = path.join(folder, 'fail')

      ### make the target folder; todo: add error check ###

      mkdirp.sync folder
    outputFile = path.join(folder, fn)
    if _config.options.downloadMode == 'data+telemetry'

      ### download file from S3 ###

      that.log.info 'downloading ' + messageBody.path + ' to ' + outputFile
      that.sessionedS3 (sessionError, s3) ->
        if sessionError
          that.log.warn sessionError
          return completeCb()
        that._initiateDownloadStream s3, messageBody, message, outputFile, completeCb
        return
    else if _config.options.downloadMode == 'telemetry'

      ### skip download - only interested in telemetry ###

      that.deleteMessage message
      that._stats.download.success = if that._stats.download.success then that._stats.download.success + 1 else 1
      # hmm. not exactly "download", these

      ### must signal completion ###

      return completeCb()
    return
  _initiateDownloadStream: (s3, messageBody, message, outputFile, completeCb) ->
    that = this
    file = undefined
    transferTimeout = undefined
    rs = undefined

    deleteFile = ->
      try
        fs.unlink outputFile, (err) ->
          if err
            that.log.warn 'failed to remove file: ' + outputFile
          else
            that.log.warn 'removed failed download file: ' + outputFile + ' ' + err
          return
      catch unlinkException
        that.log.warn 'failed to remove file. unlinkException: ' + outputFile + ' ' + String(unlinkException)
      return

    onStreamError = ->
      if !file._networkStreamError
        try
          file._networkStreamError = 1

          ### MC-1953 - signal the file end of the pipe that the network end of the pipe failed ###

          file.close()
          deleteFile()
          if rs.destroy
            #&& !rs.destroyed) {
            that.log.error 'destroying readstream for ' + outputFile
            rs.destroy()
        catch err
          that.log.error 'error handling sream error: ' + err.message
      return

    try
      file = fs.createWriteStream(outputFile)
      rs = s3.getObject(
        Bucket: messageBody.bucket
        Key: messageBody.path).createReadStream()
    catch getObjectException
      that.log.error 'getObject/createReadStream exception: ' + String(getObjectException)
      if completeCb
        completeCb()
      return
    rs.on 'error', (readStreamError) ->
      that.log.error 'error in download readstream ' + readStreamError

      ### e.g. socket hangup ###

      try
        onStreamError()
      catch e
        that.log.error 'error handling readStreamError: ' + e
      return
    file.on 'finish', ->
      if !file._networkStreamError
        # SUCCESS
        that.log.info 'downloaded ' + outputFile
        that._stats.download.success = if that._stats.download.success then that._stats.download.success + 1 else 1
        # MC-1993 - store total size of downloaded files
        try
          fs.stat outputFile, (err, stats) ->
            if err
              that.log.warn 'failed to fs.stat file: ' + err
            else if stats and stats.size
              that._stats.download.totalSize += stats.size
              # MC-2540 : if there is some postprocessing to do( e.g fastq extraction) - call the dataCallback
              # dataCallback might depend on the exit_status ( e.g. fastq can only be extracted from successful reads )
              exit_status = messageBody.telemetry.json.exit_status
              if _config.options.dataCb
                _config.options.dataCb outputFile, exit_status
            return
        catch err
          that.log.warn 'failed to fs.stat file: ' + err
        that.deleteMessage message

        ### MC-1953 - only delete message on condition neither end of the pipe failed ###

      return
    file.on 'close', (writeStreamError) ->
      that.log.info 'closing writeStream ' + outputFile
      if writeStreamError
        that.log.error 'error closing writestream ' + writeStreamError

        ### should we bail and return completeCb() here? ###

      ### must signal completion ###

      clearTimeout transferTimeout
      # MC-2143 - check for more jobs
      setTimeout that.loadAvailableDownloadMessages.bind(that)
      completeCb()
      return
    file.on 'error', (writeStreamError) ->
      that.log.error 'error in download write stream ' + writeStreamError
      onStreamError()
      return
    transferTimeout = setTimeout((->
      that.log.info 'transfer timed out'
      onStreamError()
      return
    ), 1000 * _config.options.downloadTimeout)

    ### download stream timeout in ms ###

    rs.pipe file
    # initiate download stream
    return
  enqueueUploadJob: (item) ->
    that = this
    setTimeout (->
      that.timedEnqueueUploadJob item
      return
    ), 0

    ### attempt to avoid large call stacks ###

    return
  timedEnqueueUploadJob: (item) ->
    that = this
    that._stats.upload.queueLength += 1
    that._stats.upload.enqueueCount = if that._stats.upload.enqueueCount then that._stats.upload.enqueueCount + 1 else 1
    that.uploadWorkerPool.defer (completeCb) ->
      timeoutHandle = undefined
      # timeout to ensure that completeCb *always* gets called

      done = ->
        clearTimeout timeoutHandle
        completeCb()
        return

      timeoutHandle = setTimeout((->
        done()
        that.log.error 'that.uploadWorkerPool timeoutHandle. Clearing queue slot for file: ' + item
        return
      ), _config.options.uploadTimeout * 1000)
      try
        that.uploadHandler item, (errorMsg) ->
          if errorMsg
            if !that._stats.upload.failure
              that._stats.upload.failure = {}
            that._stats.upload.failure[errorMsg] = if that._stats.upload.failure[errorMsg] then that._stats.upload.failure[errorMsg] + 1 else 1
          else
            that._stats.upload.queueLength = if that._stats.upload.queueLength then that._stats.upload.queueLength - 1 else 0
            that._stats.upload.success = if that._stats.upload.success then that._stats.upload.success + 1 else 1
          done()
          # Release slot in upload queue
          return
      catch uploadException
        that.log.error 'failed to upload: ' + String(uploadException)
        done()
        # Ensure the queue slot is freed up on exception
      return
    return
  uploadHandler: (item, successCb) ->
    that = this
    that.sessionedS3 (sessionError, s3) ->
      if sessionError
        that.log.warn sessionError
        return successCb('instance error')
      rs = undefined
      fileId = path.join(_config.options.inputFolder, item)
      objectId = _config.instance.bucketFolder + '/' + (if _config.instance.inputQueueName then _config.instance.inputQueueName + '/' else '') + item
      try
        rs = fs.createReadStream(fileId)
        rs.on 'error', (readStreamError) ->
          if String(readStreamError).match(/ENOENT/)
            # fs.watch probably fired for something which just moved - don't tally as an error. "fs.exists is an antipattern" my arse
            return successCb('ignore')
          that.log.warn 'error in upload readstream: ' + readStreamError
          # successCb("readstream error"); successCb will be caught by the try catch below
          # close the queue job
          return
        rs.on 'open', ->
          params = undefined
          options = undefined
          params =
            Bucket: _config.instance.bucket
            Key: objectId
            Body: rs
          options =
            partSize: 10 * 1024 * 1024
            queueSize: 1
          try
            s3.upload params, options, (uploadStreamErr) ->
              if uploadStreamErr
                that.log.warn 'uploadStreamError ' + String(uploadStreamErr)
                return successCb('upload error')
                # close the queue job
              that.uploadComplete objectId, item, successCb
              return
          catch uploadStreamException
            that.log.error 'failed to upload: ' + String(uploadStreamException)
            successCb 'upload exception'
            # close the queue job
          return
      catch readStreamException
        that.log.error 'readstream exception ' + String(readStreamException)
        return successCb('readstream exception')
        # close the queue job
      return
    return
  discoverQueue: (sqs, queueName, successCb, failureCb) ->
    that = this
    if _config.instance._discoverQueueCache[queueName]
      if successCb
        successCb _config.instance._discoverQueueCache[queueName]
      return
    that.log.info 'discovering queue for ' + queueName
    try
      sqs.getQueueUrl { QueueName: queueName }, (getQueueErr, getQueue) ->
        if getQueueErr
          if _config.options.proxy and String(getQueueErr).match(/Unexpected close tag/)
            that.log.warn 'error in getQueueUrl. Could be an aws-sdk/SSL/proxy compatibility issue'
          that.log.warn 'uploader: could not getQueueUrl: ' + getQueueErr
          if failureCb
            failureCb 'getqueueurl error'
          return
        if !getQueue or !getQueue.QueueUrl
          return if failureCb then failureCb('getqueueurl error') else null
        that.log.info 'found queue ' + getQueue.QueueUrl
        _config.instance._discoverQueueCache[queueName] = getQueue.QueueUrl
        if successCb
          successCb getQueue.QueueUrl
        return
    catch getQueueException
      that.log.error 'exception in getQueueUrl: ' + String(getQueueException)
      if failureCb
        failureCb 'getqueueurl exception'
    return
  uploadComplete: (objectId, item, successCb) ->
    that = this
    that.log.info 'uploaded ' + item + ' to ' + objectId

    ### initialise SQS on autoConfigure or after first upload ? ###

    that.sessionedSQS (sessionError, sqs) ->
      if sessionError
        that.log.warn sessionError
        return successCb(sessionError)
      if _config.instance.inputQueueURL
        return that.sendMessage(sqs, objectId, item, successCb)
      that.discoverQueue sqs, _config.instance.inputQueueName, ((queueURL) ->
        _config.instance.inputQueueURL = queueURL
        that.sendMessage sqs, objectId, item, successCb
      ), (discoverQueueErr) ->
        that.log.warn discoverQueueErr
        successCb discoverQueueErr
        return
      return
    return
  sendMessage: (sqs, objectId, item, successCb) ->
    that = this
    message =
      bucket: _config.instance.bucket
      outputQueue: _config.instance.outputQueueName
      remote_addr: _config.instance.remote_addr
      user_defined: _config.instance.user_defined or null
      apikey: _config.options.apikey
      id_workflow_instance: _config.instance.id_workflow_instance
      utc: (new Date).toISOString()
      path: objectId
    if _config.instance.chain
      try
        message.components = JSON.parse(JSON.stringify(_config.instance.chain.components))
        # low-frills object clone
        message.targetComponentId = _config.instance.chain.targetComponentId
        # first component to run
      catch jsonException
        that.log.error 'exception parsing components JSON ' + String(jsonException)
        return successCb('json exception')
        # close the queue job
    # MC-1304 - attach geo location and ip
    if _config.options.agent_address
      message.agent_address = _config.options.agent_address
    if message.components
      # optionally populate input + output queues
      Object.keys(message.components).forEach (o) ->
        if message.components[o].inputQueueName == 'uploadMessageQueue'
          message.components[o].inputQueueName = that.uploadMessageQueue
        if message.components[o].inputQueueName == 'downloadMessageQueue'
          message.components[o].inputQueueName = that.downloadMessageQueue
        return
    try
      sqs.sendMessage {
        QueueUrl: _config.instance.inputQueueURL
        MessageBody: JSON.stringify(message)
      }, (sendMessageError) ->
        if sendMessageError
          that.log.warn 'error sending message ' + String(sendMessageError)
          return successCb('sendmessage error')
          # close the queue job
        that._moveUploadedFile item, successCb
        return
    catch sendMessageException
      that.log.error 'exception sending message ' + String(sendMessageException)
      if successCb
        successCb 'sendmessage exception'
      # close the queue job
    return

  # _moveUploadedFile: (fileName, successCb) ->
  #   that = this
  #   folderTo = undefined
  #   fileTo = undefined
  #   fileFrom = undefined
  #   streamErrorFlag = undefined
  #   readStream = undefined
  #   writeStream = undefined
  #   renameComplete = undefined
  #
  #   done = ->
  #     if !renameComplete
  #       that._uploadedFiles[fileName] = true
  #       renameComplete = true
  #       successCb()
  #     return
  #
  #   statFile = (fileName) ->
  #     fs.stat fileName, (err, stats) ->
  #       if err
  #         that.log.warn 'failed to fs.stat uploaded file: ' + err
  #       else if stats and stats.size
  #         that._stats.upload.totalSize += stats.size
  #       return
  #     return
  #
  #   deleteFile = (outputFile) ->
  #     try
  #       fs.unlink outputFile, (err) ->
  #         if err
  #           that._uploadedFiles[fileName] = true
  #           # flag as uploaded
  #           that.log.warn 'failed to remove uploaded file ' + fileFrom + ' : ' + err
  #         return
  #     catch unlinkException
  #       that.log.warn 'failed to remove file. unlinkException: ' + outputFile + ' ' + String(unlinkException)
  #     return
  #
  #   onError = (err) ->
  #     if err and !streamErrorFlag
  #       that.log.error '_moveUploadedFile error: ' + err
  #       streamErrorFlag = true
  #       # flag as uploaded
  #       try
  #         statFile fileFrom
  #         writeStream.close()
  #         if readStream.destroy
  #           that.log.error 'destroying upload readstream for ' + fileName
  #           readStream.destroy()
  #         deleteFile fileTo
  #       catch e
  #         that.log.error 'error removing uploaded target file ' + fileTo + ' : ' + e
  #       done()
  #       # close the queue job
  #     return
  #
  #   if _config.options.uploadedFolder and _config.options.uploadedFolder != '+uploaded'
  #     folderTo = _config.options.uploadedFolder
  #   else
  #     folderTo = path.join(_config.options.inputFolder, 'uploaded')
  #   fileFrom = path.join(_config.options.inputFolder, fileName)
  #   fileTo = path.join(folderTo, fileName)
  #   mkdirp folderTo, (mkdirException) ->
  #     if mkdirException and !String(mkdirException).match(/EEXIST/)
  #       that.log.error 'mkdirpException ' + String(mkdirException)
  #       streamErrorFlag = true
  #       # flag as uploaded
  #       statFile fileFrom
  #       done()
  #     else
  #       # MC-2389 - fs.rename can cause "EXDEV, Cross-device link" exception
  #       # Ref: http://stackoverflow.com/questions/4568689/how-do-i-move-file-a-to-a-different-partition-or-device-in-node-js
  #       try
  #         readStream = fs.createReadStream(fileFrom)
  #         writeStream = fs.createWriteStream(fileTo)
  #         writeStream.on 'error', (writeStreamError) ->
  #           onError 'uploaded file writeStream error: ' + writeStreamError
  #           return
  #         readStream.on('close', ->
  #           if !streamErrorFlag
  #             # don't delete if there's an error
  #             deleteFile fileFrom
  #           statFile fileTo
  #           that.log.info 'marked ' + fileFrom + ' as done'
  #           done()
  #           # close the queue job // SUCCESS
  #           return
  #         ).on('error', (readStreamError) ->
  #           onError 'failed to rename uploaded file. ' + readStreamError
  #           return
  #         ).pipe writeStream
  #       catch renameStreamException
  #         onError 'failed to move uploaded file into upload folder: ' + String(renameStreamException)
  #     return
  #   return
  queueLength: (queueURL, cb) ->
    that = this
    queuename = undefined
    if !cb

      cb = ->
        undefined

    if !queueURL
      return cb()
    queuename = queueURL.match(/([\w\-_]+)$/)[0]
    that.log.info 'querying queue length of ' + queuename
    that.sessionedSQS (sessionError, sqs) ->
      if sessionError
        return cb()
      try
        sqs.getQueueAttributes {
          QueueUrl: queueURL
          AttributeNames: [ 'ApproximateNumberOfMessages' ]
        }, (attrErr, attrs) ->
          if attrErr
            that.log.warn 'error in getQueueAttributes: ' + String(attrErr)
            return cb()
          if attrs and attrs.Attributes and attrs.Attributes.ApproximateNumberOfMessages
            len = attrs.Attributes.ApproximateNumberOfMessages
            len = if isNaN(len) then 0 else parseInt(len, 10)
            return cb(len)
          return
      catch getQueueAttrException
        that.log.error 'error in getQueueAttributes ' + String(getQueueAttrException)
        return cb()
      return
    return

# ---
# generated by js2coffee 2.2.0
