

#
# metrichor-api
#


*Authors:* Roger Pettit, Adam Hurst, Dom Vinyard  
*Created:* 01/06/2016  
*Version:* 2.50.0




********************************************************************************




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




********************************************************************************




##
## 1. Getting Started
##

To get up and running, instantiate a new MetrichorAPI object and pass in some initial config options as shown below. Once created, this new metrichor object will be ready to connect to an App Instance or make an API call. This code sample shows the minimum amount of config required to get started. **<

          var MetrichorAPI = require('MetrichorAPI');
          var options = {
            apikey: "g34373b17ea3b2e44sc1d4s934701ff63t1d1a5a",
            inputFolder: "C:/input",
            outputFolder: "C:/output"
          }

          var metrichor = new MetrichorAPI(options);
>**

npm install -g coffee-script
npm install -g nodemon

### Required Config

  * ***options.apikey***
    _"g34373b17ea3b2e44sc1d4s934701ff63t1d1a5a"_
    Your unique Metrichor API key (the example above is not real). Without this key no access will be granted into the system. This can be generated from the Metrichor website.

  * ***options.inputFolder***
    _"/Users/name/Documents/minION/input"_
    The directory of the file to be used as the input folder. This is where files are placed by the device and where they will be uploaded from.

  * ***options.outputFolder***
    _"/Users/name/Documents/minION/downloaded"_
    The directory that files will be downloaded to after Metrichor processing is complete.


### Optional Config

  * ***options.downloadMode***
    _"data+telemetry"_
    Optional. How much data do we need to download after a successful upload? There are three valid options: _telemetry_, _data+telemetry_, and _success+telemetry_. This last option will only download the .fast5 files which passed. The first option will only download the telemetry files. The default is data+telemetry.

  * ***options.url***
    _"https://metrichor.com"_
    Optional. This can be set to another instance of the metrichor website for development. The standard metrichor.com website is used as a default. This could be overridden for development purposes to _"https://dev.metrichor.com"_ or even a local instance of the metrichor platform running on your machine, however these different environments will likely require different API keys.

  * ***options.user_agent***
    _"Metrichor API"_
    Optional. Pass in the name of the user-agent so we know how to serve the requests. This will default to *"Metrichor API"*. The only other agent which the metrichor platform will currently allow is *"Metrichor CLI"*.

  * ***options.agent_version***
    _"2.50.0"_
    Optional(ish). If the agent version is outdated it may refuse access, the latest and expected agent versions can be found in the agent documentation. If you are getting an 'agent outdated' error, this property should be included to allow access. Although the app should otherwise generally function correctly without setting this option, some api requests may fail unless it is included.

  * ***options.manualSync***
    _false_
    Optional. This will default to _false_. When an App Instance is either created or joined, should we begin uploading and downloading files automatically (as per default) or should we wait to be issued a manual **metrichor.resume()** command?

  options.filter === 'on'

  * ***options.filter***
    _"on"_
    Optional. This will default to _on_. Should we split the downloaded files into directories ?




********************************************************************************




##
## 2. Creating a New App Instance
##

We are up and running and our API key is correct. To create and start new App Instance we can use the **metrichor.create()** method.

Once the instance has been started, we will (automatically, unless manualSync is set) begin uploading files from the ***options.inputFolder*** and downloading to the ***options.outputFolder*** locations, which were specified when the metrichor object was created.

The callback will get triggered with either an error object or the ID of the App Instance which was created. **<

          var options = {
            app: 627
          }
          metrichor.create(options, function(error, new_instance_id){
            if (!error) {
              console.log("New Instance started:", new_instance_id)
            }
          })
>**


### Required Config

  * ***options.app***
    _627_
    This is the App ID of the particular App that we want to create a new Instance of.




********************************************************************************




##
## 3. Joining an Existing App Instance
##

If an instance is already running, we can attach ourselves to it using **metrichor.join(id)**. Once joined, it will begin uploading files from the ***options.inputFolder*** and downloading to the ***options.outputFolder*** locations which were specified when the metrichor object was created.

If the App Instance has never existed or did exist but has since been stopped (stopped App Instances can never be restarted) we will log the error to the callback. **<

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
    This is the App Instance which is already running on the metrichor platform. A list of these can be viewed on the metrichor.com Dashboard or by using the API call listed later in this document.




********************************************************************************




##
## 4. Stopping an App Instance
##

We can stop an instance using the **metrichor.stop()** method. You must be connected to an App Instance before it can be stopped and therefore if no App Instance is currently connected this will return an error. If an instance is running remotely which you wish to stop, use the Join method described in the section above before running this command or use the 'Quick Stop' api command. **<

          metrichor.stop(function(error){
            if (!error) {
              console.log("Stopped current App Instance")
            }
          })

>** After we have stopped an App Instance we also have the ability to reset the structure of the ***inputFolder*** which was specified when the metrichor object was created using the **metrichor.resetLocalDirectory()** method. This will move all of the fast5 files out of all subdirectories (uploaded, upload_failed, pending) and return them to the root. **<

          metrichor.resetLocalDirectory(function(error){
            if (!error) {
              console.log("Reset Local Directory")
            }
          })

>** This is a non reversable process. All telemetry and log files will also be moved to the root directory although these will cause no problem if a new instance is started from scratch using the same directory.




********************************************************************************




##
## 5. Pausing and Resuming an App Instance
##

Once an App Instance has either been created or joined, we have the ability to exercise some run control over it. We can issue **metrichor.pause()** and **metrichor.resume()** commands as shown below. **<

          metrichor.pause(function(error){
            if (!error) {
              console.log("Current App Instance Paused.")
            }
          })

          metrichor.resume(function(error){
            if (!error) {
              console.log("Current App Instance Resumed.")
            }
          })

>** Either function will return an error if there is no App Instance currently running. Keep in mind that there is no concept of pause within the api itself. For the moment, this simply stops the transfer of files.




********************************************************************************




##
## 6. Stats
##

The stats object gives information about the state of transfer progress. This feature is only accessible while the service is connected to an App Instance.

We can either call the stats function directly. (This will return no value if no App Instance is found). **<

          var stats = metrichor.stats()

>** Alternatively, we can bind a 'progress' listener to the metrichor object which will trigger every time there is a state change in the stats object. **<

          metrichor.on('progress', function(stats){
            console.log(stats)
          })

>** A sample stats object looks like this:

    ***{
      "instance": "62759",

      "progress": {
        "files": 10,
        "uploaded": 4,
        "processing": 2
        "downloaded": 2
      },

      "transfer": {
        "uploading": 1,
        "processing": 2,
        "downloading": 1
        "failed": 0

      "upload": {
        "success": 6,
        "failure": {},
        "queueLength": 0,
        "totalSize": 6,
        "total": 979
      },

      "download": {
        "success": 6,
        "fail": 0,
        "failure": {},
        "queueLength": 0,
        "totalSize": 6
      }
    }***




********************************************************************************




##
## 7. API Requests
##

We can also make calls directly to the metrichor API via this application. Each callback method returns an error and a response. The response is just the JSON parsed body of the http response. For example: **<

          metrichor.api.user(function(error, response){
            if (!error) {
              console.log(response)
            }
          })

>** There are a number of calls exposed in this way and these are listed below. If the application was instantiated without the correct credentials, these will return errors. A sample response is shown beneath each requeset.


### User Request

  * ***metrichor.api.user(callback)***
      sample response: _{
        username: 'dom.vinyard@nanoporetech.com',
        realname: 'Dom Vinyard'
      }_

    Returns the user details of the current user as determined from the api key provided to the application during instantiation.


### App Requests

  * ***metrichor.api.getApp(app_id, callback)***  
      sample response: _{
        id_workflow: 629,
        description: '2D Basecalling',
        rev: '1.78',
        has_config: false,
        queues:
          [{ id_workflow_image: 597,
             region_name: 'eu-west-1',
             inputqueue: 'djb77752-38a2-46ca-c810-5819fdb654j7'
          }]
      }_

    Returns the details of a particular App via an ID which you will provide. This is a list of available Apps, NOT a list of running instances - although it does include an array of the queues currently associated with the app if any exist.

    We can also call ***metrichor.api.listApps(callback)*** without passing any ID. This will return the same information as ***getApp***, but is presented as an array containing all of the apps that the user has permissions to access.

    Finally, there is a ***getAppConfig*** method which gets the configuration object of an App. This requires the _response.has_config_ property of the App to be set to true to return any information.

  * ***metrichor.api.getAppConfig(instance_id, callback)***
    sample response: _{
      command: 'run_workflow.py --config %config --component %component',
      params:
        [ { help: [Object],
           widget: 'simple_dropdown',
           component_id: 515,
           default: '',
           cgi_param: 'basecalling_1D_config',
           label: '1D Basecalling config',
           values: [Object] }
        ]
      }_


### Instance Requests

  * ***metrichor.api.getInsance(instance_id, callback)***
      sample response: _{
        inputqueue: 'dfb70752-S4S4-46ca-4144-5814fdb633a7',
        region: 'eu-west-1',
        outputqueue: 'G54A8638-A4A4-11E6-3341-C973F2BA1353',
        id_user: '3049',
        chain:
         { components:
            { '0': [Object],
              '1': [Object] },
           targetComponentId: '1' },
        id_workflow_instance: '62750',
        stop_date: null,
        description: '2D Basecalling for SQK-MAP006 plus Mash',
        bucket: 'eu-west-1-metrichor-dev',
        state: 'started',
        remote_addr: '10.143.21.32',
        start_date: '2016-06-02 08:21:08',
        id_workflow_image: '597'
      }_
    Returns the instance details of a specific App Instance via an ID which you will provide. We can also call  ***metrichor.api.listInstances(callback)*** without passing any ID. This will return the same information as getInstance, but is presented as an array containing all of the App Instances that the user has started.


### Stop Instance (Quick Stop)

  * ***metrichor.api.stopInstance(instance_id, callback)***
    This does not return anything except a success flag. We can use this to stop an instance directly rather than having to join it and then stop it using the methods outlined in the first sections of this document. This is a good way to kill multiple instances quickly.




********************************************************************************




## 8. Legacy Methods

Legacy methods for accessing various parts of the api still exist where they are required. These should be considered depriciated and are libable to be removed in later versions.

  * metrichor.autoStart == metrichor.create
  * metrichor.autoJoin == metrichor.join
  * metrichor.stop_everything == metrichor.stop

And also the API Requests:

  * metrichor.workflows == metrichor.api.apps
  * metrichor.workflow_instances == metrichor.api.app_instances
  * metrichor.workflow_config == metrichor.api.app_config
  * metrichor.getInstance == metrichor.api[getApp *OR* updateApp]




********************************************************************************




##
## 9. Under the Hood (Dev Notes)
##

The fundamental application logic is broken into a main file and three class files. The main file will create a single instance of each of the three classes (api, SSD, and AWS) and these three class instances will live for the lifetime of the application and will handle all of the logic. The project is structured as below: ***/

          - /lib
            - app.js
              - /Classes
                - SSD.js
                - MetrichorAPI.js
                - AWS.js

/*** Ultimately, the methods in app.js simply call methods from its three class instances in turn. Here's a short excerpt from the app file which demonstrates the logic of the metrichor.stop() function in its entirety. **<

          function stop(done) {
            SSD.stop(function() {
              AWS.stop(function() {
                api.stopCurrentInstance(function() {
                  console.log("Stopped Running Instance");
                  done()
                })
              })
            }
          }

>** First we stop the SSD, which prevents the file batching, we then stop the AWS which prevents all file transfers. Finally we send a stop command to the api, which will actually terminate the running instance. All of app.js' functions are composed in this way.

The SSD and AWS Directories try to separate concerns as much as possible. SSD does not have access to aws-sdk and AWS does not have access to .fs.


### Code Files

* # app.js
  *"Basic application logic and routing."*
  This is the entry point of the application which specifies the functions outlined in this document and routes these commands as described. It also collates the stats from the two directory files. Singleton instances of api, remoteDirectory, and localDirectory are retained by this file.

* # SSD.js
  *"Batching, selecting, uploading, and moving files."*
  This represents the root directory of the filesystem where the .fast5 files are placed from the device. This is tasked with batching up the files in this directory (lots of files!), uploading the batches, and moving files around between various subdirectories once uploaded.

* # MetrichorAPI.js
  *"Making and parsing requests to metrichor.com. AWS Token persistance."*
  This wraps the http Metrichor API methods and takes care of instance persistance. Basically, if we are connected to an instance then MetrichorAPI's 'currentInstance' will be set, this is a truth canonical to the application.

* # AWS.js
  *"Watching for downloads, downloading files."*
  This is tasked with keeping an eye on the SQS Queue and physically downloading any files which are ready to be downloaded. This uses the MetrichorAPI.js module to generate AWS tokens.


### Literate Code

For more information about how the code logic works check out the files themselves, I've attempted to adhere to a [Literate Programming](https://en.wikipedia.org/wiki/Literate_programming) style and so much of the application logic is described in the comments above each function.




********************************************************************************
