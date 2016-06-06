
unirest = require 'unirest'
AWS = require 'aws-sdk'
path = require 'path'
fs = require 'fs'




# MetrichorAPI. This wraps the http Metrichor API methods and takes care of instance and token persistance. Basically, if we are connected to an instance then @currentIntance will be set, this is a truth canonical to the application.

class MetrichorAPI
  constructor: (@options) ->
    @options.url = @options.url or 'https://metrichor.com'
    @options.user_agent = @options.user_agent or 'Metrichor API'
    @options.downloadMode = @options.downloadMode or 'data+telemetry'
    @options.region = @options.region or 'eu-west-1'




  # Instance persistance. If we are connected to an instance it will be available in @currentInstance. As all other parts of the application have access to the api, this can be accessed from anywhere using @api.currentInstance. We can either set it (which appends to it a handy .id property) or we can unset it here. We can also use it to build the s3 path.

  setInstance: (instance) ->
    return @resetInstance if not instance
    @currentInstance = instance
    @currentInstance.id = @currentInstance.id_workflow_instance

  resetInstance: ->
    @currentToken = no
    @currentInstance = no




  # AWS Config, generate some messages to send to S3 and AWS.

  getS3Path: (file) ->
    return [@currentInstance.outputqueue, @currentInstance.id_user, @currentInstance.id_workflow_instance, @currentInstance.inputqueue, file].join '/'

  S3Options: (batch, file) ->
    return S3Options =
      Bucket: @currentInstance.bucket
      Key: @getS3Path(file)
      Body: fs.readFileSync path.join(batch, file)

  SQSQueue: (type) ->
    return QueueName: @currentInstance?["#{type}queue"]

  SQSMessage: (QueueUrl) ->
    message =
      bucket: @currentInstance.bucket
      outputQueue: @currentInstance.outputqueue
      remote_addr: @currentInstance.remote_addr
      user_defined: @currentInstance.user_defined
      apikey: @options.apikey
      id_workflow_instance: @currentInstance.id
      utc: new Date().toISOString()
    if @currentInstance.chain
      message.components = @currentInstance.chain.components
      message.targetComponentId = @currentInstance.chain.targetComponentId
    if @options.agent_address
      message.agent_address = @options.agent_address
    return SQSSendOptions =
      QueueUrl: QueueUrl
      MessageBody: JSON.stringify message




  # Token. If we need a token we'll ask for it here, if one already exists just give it to us, otherwise generate a new one and give us that instead.

  token: (done) ->
    if @currentToken
      expires = new Date(@currentToken.expiration) - new Date()
      minutesUntilExpiry = Math.floor(expires / 1000 / 60)
      @currentToken = no if minutesUntilExpiry < 10

    if @currentToken
      return done? no,
        token: @currentToken
        s3: @s3
        sqs: @sqs

    options =
      id_workflow_instance: @currentInstance.id
      region: @options.region
    @post "token", options, (error, token) =>
      return done? new Error 'No Token Generated' if not token
      token.region = @options.region
      @currentToken = token
      @s3 = new AWS.S3 token
      @sqs = new AWS.SQS token

      done? error,
        token: token
        s3: @s3
        sqs: @sqs




  # API Methods. Private. These are methods that we use internally to communicate with the Metrichor platform. These are undocumented because we don't want to let the user load (or especially create) instances which are completely decoupled from any sort of directory processes.

  createInstance: (config, done) ->
    config.workflow = config.app if config.app
    @resetInstance()
    @post 'workflow_instance', { json: config }, (error, instance) =>
      @setInstance instance
      if @currentInstance.state is 'stopped'
        return done? new Error "App Instance didn't start"
      done? error, @currentInstance

  loadInstance: (instance_id, done) ->
    @resetInstance()
    @get "workflow_instance/#{instance_id}", (error, instance) =>
      @setInstance instance
      if not @currentInstance.id
        return done? new Error "App Instance not found"
      if @currentInstance.state is 'stopped'
        return done? new Error "App Instance didn't start"
      done? error, @currentInstance

  stopCurrentInstance: (done) ->
    return done? new Error "No App Instance running" if not @currentInstance
    @put "workflow_instance/stop/#{@currentInstance.id}", {}, (error) =>
      @resetInstance()
      done? error




  # API Methods. Public. These are methods that are exposed for users of this library. These can be run in isolation without any adverse concequences. The only public command which causes the system state to change is stopInstance. Check the documentation for descriptions of these.

  user: (done) ->
    @get 'user', done

  getApp: (id, done) ->
    @listApps (error, apps) ->
      done? error, apps.filter((app) -> app.id_workflow is id)[0]

  getAppConfig: (app_id, done) ->
    @get "workflow/config/#{app_id}", (error, json) ->
      if error?.message is 'Response is not an object'
        return done new Error 'No config found for that instance'
      done error, json

  listApps: (done) ->
    @get 'workflow', (error, json) ->
      done? error, json.workflows

  getInstance: (instance_id, done) ->
    @get "workflow_instance/#{instance_id}", (error, json) =>
      done? error, json

  listInstances: (done) ->
    @get 'workflow_instance', (error, json) ->
      done? error, json.workflow_instances

  stopInstance: (id, done) ->
    @put "workflow_instance/stop/#{id}", {}, done




  # Define our get, post and put methods. These just wrap http commands using the unirest module.

  get: (resource, done) ->
    unirest.get "#{@options.url}/#{resource}.js"
      .proxy @options.proxy
      .headers "X-Metrichor-Client": @options.user_agent
      .query
        apikey: @options.apikey
        agent_version: @options.agent_version or ''
      .end (response) => @parseResponse response, done

  postOrPut: (verb, resource, form, done) ->
    form.json = JSON.stringify form.json if form.json
    form.apikey = @options.apikey
    form.agent_version = @options.agent_version or ''
    unirest[verb] "#{@options.url}/#{resource}.js"
      .proxy @options.proxy
      .headers "X-Metrichor-Client": @options.user_agent
      .form form
      .end (response) => @parseResponse response, done

  post: (resource, object, done) -> @postOrPut 'post', resource, object, done
  put: (resource, object, done) -> @postOrPut 'put', resource, object, done




  # Finally, we handle the response. This is basically just trying to prise a javascript object out of the response and return it to done().

  parseResponse: (response, done) ->
    return done new Error response.code if not response.ok
    return done new Error 'No response' if not response?.body
    if typeof response.body is 'string'
      try
        response.body = JSON.parse(response.body)
      catch
        return done new Error 'Response is not an object'
    return done response.body.error if response.body?.error
    done no, response.body




  # export the module

module.exports = MetrichorAPI
