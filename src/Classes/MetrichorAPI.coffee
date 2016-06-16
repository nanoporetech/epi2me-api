
unirest = require 'unirest'




# MetrichorAPI. This wraps the http Metrichor API methods and allow us to create and kill instances.

class MetrichorAPI
  constructor: (@options) ->
    @options.url = @options.url or 'https://metrichor.com'
    @options.user_agent = @options.user_agent or 'Metrichor API'
    @options.downloadMode = @options.downloadMode or 'data+telemetry'
    @options.region = @options.region or 'eu-west-1'
    @options.agent_address = @options.agent_address or {geo: lat: 52, lng: 0}




  # Instance Methods. Here we can either load or unload an instance. The instance returned from loadInstance will be passed to AWSDirectory. We have to reatain the ID in @loadedInstance so that we can kill it when needed.

  createNewInstance: (config, done) ->
    config.workflow = config.app if config.app
    @post 'workflow_instance', { json: config }, (error, instance) =>
      return done? new Error "Didn't start" if instance.state is 'stopped'
      done? error, instance.id_workflow_instance

  loadInstance: (instanceID, done) ->
    @get "workflow_instance/#{instanceID}", (error, instance) =>
      return done? new Error "App Instance not found" if not instance
      return done? new Error "Didn't start" if instance.state is 'stopped'
      instance.id = instance.id_workflow_instance
      instance.keypath = [instance.outputqueue, instance.id_user, instance.id_workflow_instance, instance.inputqueue].join '/'
      instance.apikey = @options.apikey
      instance.messageTemplate =
        bucket: instance.bucket
        outputQueue: instance.outputqueue
        remote_addr: instance.remote_addr
        user_defined: instance.user_defined or null
        apikey: instance.apikey
        id_workflow_instance: instance.id
        agent_address: @options.agent_address
      if instance.chain
        instance.messageTemplate.components = instance.chain.components
        instance.messageTemplate.targetComponentId = instance.chain.targetComponentId
      @loadedInstance = instance.id
      done? error, instance

  stopLoadedInstance: (done) ->
    return done? new Error "No App Instance running" if not @loadedInstance
    @stopInstance @loadedInstance, (error) =>
      @loadedInstance = no
      done? error




  # API Methods. Public. These are methods that are exposed for users of this library. These can be run in isolation without any adverse concequences. The only public command which causes the system state to change is stopInstance. Check the documentation for descriptions of these.

  user: (done) ->
    @get 'user', done

  getApp: (id, done) =>
    @listApps (error, apps) ->
      done? error, apps.filter((app) -> app.id_workflow is id)[0]

  getAppConfig: (appID, done) =>
    @get "workflow/config/#{appID}", (error, json) ->
      if error?.message is 'Response is not an object'
        return done new Error 'No config found for that instance'
      done? error, json

  listApps: (done) =>
    @get 'workflow', (error, json) ->
      console.log error, json
      done? error, json?.workflows

  getInstance: (instanceID, done) ->
    @get "workflow_instance/#{instanceID}", (error, json) =>
      done? error, json

  listInstances: (done) =>
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
