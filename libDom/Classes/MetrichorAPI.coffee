
# This wraps the http Metrichor API methods. This is presented as a singleton. Using the unirest http request module. The options are passed in.

unirest = require 'unirest'

class MetrichorAPI
  constructor: (@options) ->




  # API Methods. These are wrappers around common requests to the Metrichor API. These should be called rather than using the http methods directly.

  user: (done) ->
    @get 'user', done

  workflows: (done) ->
    @list 'workflow', done

  workflow: (id, resource, done) ->
    return @get "workflow/#{id}", resource if !done
    @post 'workflow', id, resource, done

  start_workflow: (config, done) ->
    @post 'workflow_instance', { json: config }, done

  stop_workflow: (id, done) ->
    @put "workflow_instance/stop/#{id}", {}, done

  workflow_instance: (id, done) ->
    @list 'workflow_instance', id, done

  workflow_instances: (done) ->
    @list 'workflow_instance', done

  workflow_config: (id, done) ->
    @get "workflow/config/#{id}", done

  postToken: (id, done) ->
    @post "token", { id_workflow_instance: id }, done




  # Get some data from the metrichor API. We parse the json before returning it. We also define a list endpoint wrapper, which pluralises the query and returns a list.

  get: (resource, done) ->
    query =
      apikey: @options.apikey
      agent_version: @options.agent_version or ''

    unirest.get "#{@options.url}/#{resource}.js"
      .proxy @options.proxy
      .headers @headers
      .query query
      .end (response) ->
        return done new Error response.code if not response.ok
        done no, JSON.parse(response.body or '{}')

  list: (resource, done) ->
    @get resource, (error, json) ->
      done error, json["#{resource}s"] if done




  # Post or Put some data to the metrichor API. We combine these methods to stay DRY. The two methods underneath abstract this into recognisable http apis.

  postOrPut: (verb, resource, form = {}, done) ->
    form.json = JSON.stringify form.json if form.json

    form.apikey = @options.apikey
    form.agent_version = @options.agent_version or ''

    console.log "#{@options.url}/#{resource}.js"
    console.log form

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
