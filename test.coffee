
MetrichorAPI = require('./lib/app.coffee')
app = require('express')().listen 3000
metrichor = new MetrichorAPI
  apikey: "534373b27eaf4b2e448c1d4c930701f1631d115a"
  inputFolder: "/Users/dvinyard/Documents/Dev/api/input"
  outputFolder: "/Users/dvinyard/Documents/Dev/api/input/downloads"
  url: "https://dev.metrichor.com"
  agent_version: '2.50.0'
  # manualSync: yes

metrichor.on 'progress', (stats) ->
  console.log stats#.complete

metrichor.on 'status', (status) ->
  console.log status

# metrichor.api.getAppConfig 627, (error, json) ->
#   console.log error, json

# metrichor.join 62755, (error) =>
#   console.log error if error
#   metrichor.api.token (error, aws) ->
#     input_request = metrichor.api.SQSQueue('input')
#     aws.sqs.getQueueUrl input_request, (error, input) =>
#       console.log 'input: ', input_request.QueueName, error?.message or input.QueueUrl
#
#       output_request = metrichor.api.SQSQueue('output')
#       aws.sqs.getQueueUrl output_request, (error, output) =>
#         console.log 'output: ', output_request.QueueName, error?.message or output.QueueUrl
#
# metrichor.api.listApps (error, apps) ->
#   console.log apps.map (app) -> app.queues


process.stdin.resume().setEncoding('utf8').on 'data', (text) ->
  command = text.replace '\n', ''
  command_param = command.split ' '


  if command is 'create'
    return metrichor.create { app: 454 }, (error) =>
      console.log error if error

  if command is 'reset'
    return metrichor.resetLocalDirectory (error) =>
      console.log error if error

  if command is 'stop'
    return metrichor.stop (error) =>
      console.log error if error

  if command is 'pause'
    return metrichor.pause (error) =>
      console.log error if error

  if command is 'resume'
    return metrichor.resume (error) =>
      console.log error if error

  if command is 'stats'
    return metrichor.stats()

  if command is 'join'
    return metrichor.join 62757, (error) =>
      console.log error if error

  if command_param.length
    if command_param[0] is 'join'
      instance_id = command_param[1]
      return metrichor.join instance_id, (error) =>
        console.log error if error

    if command_param[0] is 'create'
      app_id = command_param[1]
      return metrichor.create { app: app_id }, (error) =>
        console.log error if error
