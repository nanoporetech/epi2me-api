
MetrichorAPI = require('./lib/app.coffee')
app = require('express')().listen 3000
sync = new MetrichorAPI
  apikey: "534373b27eaf4b2e448c1d4c930701f1631d115a"
  inputFolder: "/Users/dvinyard/Documents/Dev/api/input"
  outputFolder: "/Users/dvinyard/Documents/Dev/api/output"
  url: "https://dev.metrichor.com"

sync.on 'progress', (stats) -> console.log stats

process.stdin.resume().setEncoding('utf8').on 'data', (text) ->
  command = text.replace '\n', ''
  command_param = command.split ' '

  if command in ['new', 'start']
    sync.create { app: 627 }, (error) =>
      console.log error if error

  if command is 'reset'
    sync.reset()

  if command is 'stop'
    sync.stop (error) =>
      console.log error if error

  if command is 'pause'
    sync.pause (error) =>
      console.log error if error

  if command is 'resume'
    sync.resume (error) =>
      console.log error if error

  if command_param.length
    if command_param[0] is 'join'
      instance_id = command_param[1]
      sync.join instance_id, (error) =>
        console.log error if error

    if command_param[0] in ['new', 'start']
      app_id = command_param[1]
      sync.create { app: app_id }, (error) =>
        console.log error if error
