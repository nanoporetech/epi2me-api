var MetrichorAPI, unirest,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

unirest = require('unirest');

MetrichorAPI = (function() {
  function MetrichorAPI(options) {
    this.options = options;
    this.listInstances = bind(this.listInstances, this);
    this.listApps = bind(this.listApps, this);
    this.getAppConfig = bind(this.getAppConfig, this);
    this.getApp = bind(this.getApp, this);
    this.options.url = this.options.url || 'https://metrichor.com';
    this.options.user_agent = this.options.user_agent || 'Metrichor API';
    this.options.downloadMode = this.options.downloadMode || 'data+telemetry';
    this.options.region = this.options.region || 'eu-west-1';
    this.options.agent_address = this.options.agent_address || {
      geo: {
        lat: 52,
        lng: 0
      }
    };
  }

  MetrichorAPI.prototype.createNewInstance = function(config, done) {
    if (config.app) {
      config.workflow = config.app;
    }
    return this.post('workflow_instance', {
      json: config
    }, (function(_this) {
      return function(error, instance) {
        if (instance.state === 'stopped') {
          return typeof done === "function" ? done(new Error("Didn't start")) : void 0;
        }
        return typeof done === "function" ? done(error, instance.id_workflow_instance) : void 0;
      };
    })(this));
  };

  MetrichorAPI.prototype.loadInstance = function(instanceID, done) {
    return this.get("workflow_instance/" + instanceID, (function(_this) {
      return function(error, instance) {
        if (!instance) {
          return typeof done === "function" ? done(new Error("App Instance not found")) : void 0;
        }
        if (instance.state === 'stopped') {
          return typeof done === "function" ? done(new Error("Didn't start")) : void 0;
        }
        instance.id = instance.id_workflow_instance;
        instance.keypath = [instance.outputqueue, instance.id_user, instance.id_workflow_instance, instance.inputqueue].join('/');
        instance.apikey = _this.options.apikey;
        instance.messageTemplate = {
          bucket: instance.bucket,
          outputQueue: instance.outputqueue,
          remote_addr: instance.remote_addr,
          user_defined: instance.user_defined || null,
          apikey: instance.apikey,
          id_workflow_instance: instance.id,
          agent_address: _this.options.agent_address
        };
        if (instance.chain) {
          instance.messageTemplate.components = instance.chain.components;
          instance.messageTemplate.targetComponentId = instance.chain.targetComponentId;
        }
        _this.loadedInstance = instance.id;
        return typeof done === "function" ? done(error, instance) : void 0;
      };
    })(this));
  };

  MetrichorAPI.prototype.stopLoadedInstance = function(done) {
    if (!this.loadedInstance) {
      return typeof done === "function" ? done(new Error("No App Instance running")) : void 0;
    }
    return this.stopInstance(this.loadedInstance, (function(_this) {
      return function(error) {
        _this.loadedInstance = false;
        return typeof done === "function" ? done(error) : void 0;
      };
    })(this));
  };

  MetrichorAPI.prototype.user = function(done) {
    return this.get('user', done);
  };

  MetrichorAPI.prototype.getApp = function(id, done) {
    return this.listApps(function(error, apps) {
      return typeof done === "function" ? done(error, apps.filter(function(app) {
        return app.id_workflow === id;
      })[0]) : void 0;
    });
  };

  MetrichorAPI.prototype.getAppConfig = function(appID, done) {
    return this.get("workflow/config/" + appID, function(error, json) {
      if ((error != null ? error.message : void 0) === 'Response is not an object') {
        return done(new Error('No config found for that instance'));
      }
      return typeof done === "function" ? done(error, json) : void 0;
    });
  };

  MetrichorAPI.prototype.listApps = function(done) {
    return this.get('workflow', function(error, json) {
      console.log(error, json);
      return typeof done === "function" ? done(error, json != null ? json.workflows : void 0) : void 0;
    });
  };

  MetrichorAPI.prototype.getInstance = function(instanceID, done) {
    return this.get("workflow_instance/" + instanceID, (function(_this) {
      return function(error, json) {
        return typeof done === "function" ? done(error, json) : void 0;
      };
    })(this));
  };

  MetrichorAPI.prototype.listInstances = function(done) {
    return this.get('workflow_instance', function(error, json) {
      return typeof done === "function" ? done(error, json.workflow_instances) : void 0;
    });
  };

  MetrichorAPI.prototype.stopInstance = function(id, done) {
    return this.put("workflow_instance/stop/" + id, {}, done);
  };

  MetrichorAPI.prototype.get = function(resource, done) {
    return unirest.get(this.options.url + "/" + resource + ".js").proxy(this.options.proxy).headers({
      "X-Metrichor-Client": this.options.user_agent
    }).query({
      apikey: this.options.apikey,
      agent_version: this.options.agent_version || ''
    }).end((function(_this) {
      return function(response) {
        return _this.parseResponse(response, done);
      };
    })(this));
  };

  MetrichorAPI.prototype.postOrPut = function(verb, resource, form, done) {
    if (form.json) {
      form.json = JSON.stringify(form.json);
    }
    form.apikey = this.options.apikey;
    form.agent_version = this.options.agent_version || '';
    return unirest[verb](this.options.url + "/" + resource + ".js").proxy(this.options.proxy).headers({
      "X-Metrichor-Client": this.options.user_agent
    }).form(form).end((function(_this) {
      return function(response) {
        return _this.parseResponse(response, done);
      };
    })(this));
  };

  MetrichorAPI.prototype.post = function(resource, object, done) {
    return this.postOrPut('post', resource, object, done);
  };

  MetrichorAPI.prototype.put = function(resource, object, done) {
    return this.postOrPut('put', resource, object, done);
  };

  MetrichorAPI.prototype.parseResponse = function(response, done) {
    var error1, ref;
    if (!response.ok) {
      return done(new Error(response.code));
    }
    if (!(response != null ? response.body : void 0)) {
      return done(new Error('No response'));
    }
    if (typeof response.body === 'string') {
      try {
        response.body = JSON.parse(response.body);
      } catch (error1) {
        return done(new Error('Response is not an object'));
      }
    }
    if ((ref = response.body) != null ? ref.error : void 0) {
      return done(response.body.error);
    }
    return done(false, response.body);
  };

  return MetrichorAPI;

})();

module.exports = MetrichorAPI;
