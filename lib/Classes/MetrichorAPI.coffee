
# This wraps the http Metrichor API methods. This is presented as a singleton. Using the unirest http request module. The options are passed in.

unirest = require 'unirest'

class MetrichorAPI
  constructor: (@options) ->
    @options.url = @options.url or 'https://metrichor.com'
    @options.user_agent = @options.user_agent or 'Metrichor API'
    @options.downloadMode = @options.downloadMode or 'data+telemetry'

  setInstance: (instance) ->
    @currentInstance = instance
    @currentInstance.id = @currentInstance.id_workflow_instance

  resetInstance: ->
    @currentToken = no
    @currentInstance = no


  # API Methods. These are wrappers around common requests to the Metrichor API. These should be called rather than using the http methods directly.

  user: (done) ->
    @get 'user', done

  listApps: (done) ->
    @list 'workflow', done

  getApp: (id, done) ->
    @get "workflow/#{id}", done

  updateApp: (id, updated, done) ->
    @post "workflow/#{id}", updated, done

  createInstance: (config, done) ->
    config.workflow = config.app if config.app
    @resetInstance()
    @post 'workflow_instance', { json: config }, (error, instance) =>
      @setInstance instance
      if instance.state is 'stopped'
        return done new Error "App Instance didn't start"
      done error, instance

  stopInstance: (done) ->
    return done new Error "No instance found" if not @currentInstance.id
    @resetInstance()
    @put "workflow_instance/stop/#{@currentInstance.id}", {}, done

  loadInstance: (instance_id, done) ->
    @resetInstance()
    @get "workflow_instance/#{instance_id}", (error, instance) =>
      @setInstance instance
      if not @instance.id
        return done new Error "App Instance not found"
      if @instance.state is 'stopped'
        return (done(new Error "App Instance didn't start") if done)
      done error, @instance

  listInstances: (done) ->
    @list 'workflow_instance', done

  getInstanceConfig: (instance_id, done) ->
    @get "workflow/config/#{instance_id}", done

  # postToken: (instance_id, done) ->
  #   @post "token", { id_workflow_instance: instance_id }, done

  token: (done) ->
    @currentToken = no if false # token expired
    return done no, @token if @token
    options = { id_workflow_instance: @currentInstance.id }
    @post "token", options, (error, token) =>
      @currentToken = token
      done error, token




  # Legacy Requests

  workflows: (done) -> @listApps done
  workflow_instances: (done) -> @listInstances done
  workflow_config: (id, done) -> @getInstanceConfig id, done
  workflow: (id, resource, done) ->
    @getApp id, resource if !done
    @updateApp id, resource, done




  # Get some data from the metrichor API. We parse the json before returning it. We also define a list endpoint wrapper, which pluralises the query and returns a list.

  get: (resource, done) ->
    query =
      apikey: @options.apikey
      agent_version: @options.agent_version or ''

    unirest.get "#{@options.url}/#{resource}.js"
      .proxy @options.proxy
      .headers "X-Metrichor-Client": @options.user_agent
      .query query
      .end (response) ->
        return done new Error response.code if not response.ok
        try
          if JSON.parse(response.body)?.error
            return done response.body.error
        done no, response.body

  list: (resource, done) ->
    @get resource, (error, json) ->
      done error, json["#{resource}s"] if done




  # Post or Put some data to the metrichor API. We combine these methods to stay DRY. The two methods underneath abstract this into recognisable http apis.

  postOrPut: (verb, resource, form = {}, done) ->
    form.json = JSON.stringify form.json if form.json

    form.apikey = @options.apikey
    form.agent_version = @options.agent_version or ''

    unirest[verb] "#{@options.url}/#{resource}.js"
      .proxy @options.proxy
      .headers "X-Metrichor-Client": @options.user_agent
      .form form
      .end (response) ->
        return done response.code if not response.ok
        try
          if JSON.parse(response.body)?.error
            return done response.body.error
        done no, response.body

  post: (resource, object, done) ->
    @postOrPut 'post', resource, object, done

  put: (resource, object, done) ->
    @postOrPut 'put', resource, object, done




# Export.

module.exports = MetrichorAPI
