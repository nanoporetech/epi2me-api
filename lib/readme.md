

#
# metrichor-api
#


***


*Authors:* Roger Pettit, Adam Hurst, Dom Vinyard  
*Created:* 01/06/2016  
*Version:* 2.50.0


***


##
## Table of Contents
##

1. Getting Started
2. Creating a New App Instance
3. Joining an Existing App Instance
4. Stopping an App Instance
5. Pausing and Resuming an App Instance
6. Stats
7. API Requests
8. Legacy Methods
9. Under the Hood (Dev Notes)




******




##
## 1. Getting Started
##

To get up and running, instantiate a new metrichor-api object and pass in some initial config options as shown below. Once created, this new metrichor object will be ready to connect to an App Instance. **<

          var MetrichorAPI = require('MetrichorAPI');
          var options = {
            apikey: "g34373b17ea3b2e44sc1d4s934701ff63t1d1a5a",
            inputFolder: "input/",
            outputFolder: "output/"
          }

          var metrichor = new MetrichorAPI(options);

>**

### Required Config

  * ***options.apikey***
    _"g34373b17ea3b2e44sc1d4s934701ff63t1d1a5a"_
    Your unique Metrichor API key (the example above is obviously not real). Without this key no access will be granted into the system. This can be generated from the Metrichor website.

  * ***options.inputFolder***
    _"/Users/name/Documents/minION/input"_
    The directory of the file to be used as the input folder. This is where files are placed by the device and where they will be uploaded.

  * ***options.outputFolder***
    _"/Users/name/Documents/minION/downloaded"_
    Where augmented files will be downloaded to after Metrichor processing is complete.


### Optional Config

  * ***options.downloadMode***
    _"data+telemetry"_
    Optional. How much data do we need to download after a successful upload? There are three valid options: *telemetry*, *data+telemetry*, and *success+telemetry*. This last option will only download the .fast5 files which passed. The first option will only download the telemetry files. The default is data+telemetry.

  * ***options.url***
    _"https://metrichor.com"_
    Optional. This can be set to another instance of the metrichor website for development. The standard metrichor.com website is used as a default. This could be overridden for development purposes to _"https://dev.metrichor.com"_ or even a local instance of the metrichor platform running on your machine, however these different environments will likely require different API keys.

  * ***options.user_agent***
    _"Metrichor API"_
    Optional. Pass in the name of the user-agent so we know how to serve the requests. This will default to *"Metrichor API"*. The only other agent which the metrichor platform will currently allow is *"Metrichor CLI"*.

  * ***options.agent_version***
    *"2.50.0"*
    Optional. If the agent version is outdated it may refuse access. The latest and expected versions can be found in the agent documentation. If you are getting an 'agent outdated' error, this property should be included to allow access.




******




##
## 2. Creating a New App Instance
##

This will create and start new App Instance. Once started, it will begin uploading files from the ***options.inputFolder*** and downloading files to the ***options.outputFolder*** locations, which were specified when the metrichor object was created.

The callback will get triggered with either an error object or the ID of the App Instance which was created. **<

          var options = {
            app: 627
          }
          metrichor.start(options, function(error, new_instance_id){
            if (!error) {
              console.log("New Instance started:", new_instance_id)
            }
          })

>**

### Required Config

  * ***options.app***
    _627_
    This is the App ID of the particular App that we want to create a new Instance of.




******




##
## 3. Joining an Existing App Instance
##

If an instance is already running, we can attach ourselves to it. Once joined, it will begin uploading files from the ***options.inputFolder*** and downloading files to the ***options.outputFolder*** locations which were specified when the metrichor object was created.

If the App Instance doesn't exist or has been stopped (stopped App Instances can never be restarted) we will log the error to the callback. **<

          var instance_id = "62750"
          metrichor.join(instance_id, function(error){
            if (!error) {
              console.log("Joined App Instance:", instance_id)
            }
          })

>**

### Required Config

  * ***instance_id***
    _62750_
    This is the App Instance which is already running on the metrichor platform.




******




##
## 4. Stopping an App Instance
##

You must be connected to an App Instance before it can be stopped. If no App Instance is currently connected this will return an error. If an instance is running remotely which you wish to stop, use the Join method described in the section above before running this command. **<

          metrichor.stop(function(error){
            if (!error) {
              console.log("Stopped current App Instance")
            }
          })

>** After we have stopped an App Instance we also have the ability to reset the structure of the ***inputFolder*** which was specified when the metrichor object was created. This will move all of the fast5 files out of all subdirectories (uploaded, upload_failed, pending) and return them to the root. **<

          metrichor.reset(function(error){
            if (!error) {
              console.log("Reset Local Directory")
            }
          })

>** This is a non reversable process. All telemetry and log files will also be moved to the root directory although these will cause no problem if an instance is restarted from scratch using the same directory.




******




##
## 5. Pausing and Resuming an App Instance
##

Once an App Instance has either been created or joined, we have the ability to exercise some run control over it. We can issue **pause** and **resume** commands as shown below. **<

          metrichor.pause(function(error){
            if (!error) {
              console.log("App Instance Paused.")
            }
          })

          metrichor.resume(function(error){
            if (!error) {
              console.log("App Instance Resumed.")
            }
          })

>** Either function will return an error if there is no App Instance currently running. Keep in mind that there is no concept of pause within the api. For the moment, this simply stops the uploading and downloading of files.




******




##
## 6. Stats
##

The stats object gives realtime access to the state of transfer progress. This feature is only accessible while the service is connected to an App Instance.

We can either call the stats function directly. This will return no value if no App Instance is found. **<

          var stats = metrichor.stats()

>** Alternatively, we can bind a 'progress' listener to the metrichor object which will trigger every time there is a state change in the stats object. **<

          metrichor.on('progress', function(stats){
            console.log(stats)
          })

>** A sample stats object looks like this: ***{

          instance: 62750
          upload: {
            pending: 4,
            uploaded: 6,
            upload_failed: 0,
            percentage: 60
          },

          download: {
            success: 0,
            fail: 0,
          } ***




******




##
## 7. API Requests
##

We can make calls directly to the metrichor API via this application. Each callback method returns an error and a response. The response is just the JSON parsed body of the http response. For example: **<

          metrichor.api.user(function(error, response){
            if (!error) {
              console.log(response)
            }
          })

>**

### User Request

  * ***metrichor.api.user(callback)***
    Description


### App Requests

  * ***metrichor.api.listApps(callback)***
    Description

  *  ***metrichor.api.getApp(app_id, done)***
    Description

  * ***metrichor.api.updateApp(app_id, update_object, done)***
    Description


### Instance Requests

  * ***metrichor.api.listInstances(done)***
    Description

  * ***metrichor.api.getInstanceConfig(instance_id, done)***
    Description

  * ***metrichor.api.stopInstance(instance_id, done)***
    This is a direct way to stop a running instance.




******




## 8. Legacy Methods

Legacy methods for accessing various parts of the api still exist where they are required. These should be considered depriciated and are libable to be removed in later versions.

  * metrichor.autoStart == metrichor.create
  * metrichor.autoJoin == metrichor.join
  * metrichor.stop_everything == metrichor.stop

And also the API Requests:

  * metrichor.api.workflows == metrichor.api.apps
  * metrichor.api.workflow_instances == metrichor.api.app_instances
  * metrichor.api.workflow_config == metrichor.api.app_config
  * metrichor.api.getInstance == metrichor.api[getApp *OR* updateApp]




******




##
## 9. Under the Hood (Dev Notes)
##

The fundemental application logic is broken into a main file and three class files. The main file will create a single instance of each of the three class files (api, remoteDirectory, and localDirectory) and these three class instances will live for the lifetime of the application. The project is structured as below: ***/

          - /lib
            - app.js
              - /Classes
                - LocalDirectory.js
                - MetrichorAPI.js
                - RemoteDirectory.js

/*** Ultimately, the methods in app.js simply call methods from the three class instances in turn. Here's a short exerpt from the app file which shows the metrichor.stop() function in its logical entirety. **<

          stop: (done) ->
            localDirectory.stop =>
              remoteDirectory.stop =>
                api.stopInstance =>
                  console.log "Stopped Running Instance"
                  done? no

>** First we stop the localDirectory, which prevents all batching and uploads, we then stop the remoteDirectory which prevents all downloads. Finally we stop the api, which will actually terminate the running instance. All app.js functions are composed in this way.


### Code Files

* # app.js
  *"Basic application logic and routing."*
  This is the entry point of the application which specifies the functions outlined in this document and routes these commands as described above. It also collates the stats from the two directory files. The singleton instances of api, remoteDirectory, and localDirectory are retained by this file.

* # LocalDirectory.js
  *"Batching, selecting, uploading, and moving files."*
  Description

* # MetrichorAPI.js
  *"Making and parsing requests to metrichor.com. AWS Token persistance."*
  Description

* # RemoteDirectory.js
  *"Watching for downloads, downloading files."*
  Description
