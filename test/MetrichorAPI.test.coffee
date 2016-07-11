
os = require 'os'
fs = require 'fs'
assert = require('chai').assert
sinon = require 'sinon'
API = require '../src/Classes/MetrichorAPI.coffee'
apikey = fs.readFileSync('./@options.apikey', 'utf8').trim()

root = "#{os.homedir()}/metrichorAPI_TestRoot"




# Create a new instance here. The agent_version is required for the getApp() endpoint to respond in the affermative.

url = "https://dev.metrichor.com"
options =
  apikey: apikey
  url: url
  agent_version: "2.41"
  

api = new API options
config = { app: 454 }
instanceID = no




# Run an integration test to check that an instance is created successfully. This will create a new workflow instance which we will then kill.

describe "MetrichorAPI", ->
  describe 'Integration', ->

    it 'found network connection', (done) ->
      require('dns').resolve 'metrichor.com', (error) ->
        assert.isNull error
        done()

    it 'instantiated correctly', ->
      assert.equal api.options.user_agent, 'Metrichor API'
      assert.equal api.options.apikey, options.apikey

    it 'created a new instance', (done) ->
      api.createNewInstance config, (error, id) ->
        instanceID = id
        assert.isDefined id
        assert.isFalse error
        api.listInstances (error, instances) ->
          instances = instances
            .filter (instance) -> return instance.state is 'started'
            .map (instance) -> return instance.id_workflow_instance
          assert.isTrue instanceID in instances
          done()

    it 'loaded the new instance', (done) ->
      api.loadInstance instanceID, (error, instance) ->
        assert.isFalse error
        assert.isDefined instance
        done()




  # Test all of the public methods induvidually..

  describe 'Public Methods', ->
    it 'returned user()', (done) ->
      api.user (error, user) ->
        assert.isDefined user.username
        done()

    it 'returned getApp()', (done) ->
      api.getApp config.app, (error, app) ->
        assert.isDefined app
        assert.isDefined app.description
        assert.isDefined app[key] for key in [
          'id_workflow'
          'description'
          'has_config'
          'queues'
        ]
        assert.isFalse error
        done()

    it 'returned getAppConfig()', (done) ->
      api.getAppConfig config.app, (error, config) ->
        if error
          assert.equal error.message, 'No config found'
        else
          assert.isUndefined config
          assert.isDefined config
        done()

    it 'returned listApps()', (done) ->
      api.listApps (error, apps) ->
        assert.isAbove apps.length, 0
        done()

    it 'returned getInstance()', (done) ->
      api.getInstance instanceID, (error, instance) ->
        assert.isFalse error
        assert.isDefined instance
        assert.isDefined instance[key] for key in [
          'id_workflow_instance'
          'bucket'
          'region'
          'inputqueue'
          'outputqueue'
        ]
        done()

    it 'returned listInstances()', (done) ->
      api.listInstances (error, instances) ->
        assert.isFalse error
        assert.isAbove instances.length, 0
        done()




  # Finally, stop the instance to complete the test.

  describe 'Stop Instance', (done) ->
    it 'stops the instance', (done) ->
      api.stopLoadedInstance (error) ->
        assert.isFalse api.instance
        done()
