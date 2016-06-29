fs = require 'fs'

MetrichorAPI = require('./src/app.coffee')
app = require('express')().listen 3000
apikey = fs.readFileSync './@options.apikey', 'utf8'
metrichor = new MetrichorAPI
  apikey: apikey.trim()
  inputFolder: "/Users/dvinyard/Dev/data/sample_medium"
  outputFolder: "/Users/dvinyard/Dev/data/sample_medium/downloads"
  url: "https://dev.metrichor.com"
  agent_version: '2.50.0'
  downloadMode: 'data+telemetry'



latest_instance = 63262




metrichor.on 'progress', (stats) ->
  # console.log "\n\n\n\n#{JSON.stringify stats, null, 2}"
  # console.log 'Downloaded', stats.download.success
  console.log "Downloading #{stats.all.aws.downloading} (#{stats.download.success}/#{stats.upload.total})"

metrichor.on 'status', (status) ->
  console.log status

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

  if command is 'free'
    return metrichor.ssd.freeSpace (error, available) =>
      console.log available

  if command is 'join'
    return metrichor.join latest_instance, (error) =>
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
