var AWS, EventEmitter, MetrichorAPI, MetrichorSync, SSD,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

EventEmitter = require('events').EventEmitter;

MetrichorAPI = require('./Classes/MetrichorAPI');

SSD = require('./Classes/SSD');

AWS = require('./Classes/AWS');

MetrichorSync = (function(superClass) {
  extend(MetrichorSync, superClass);

  function MetrichorSync(options) {
    this.options = options;
    this.stats = bind(this.stats, this);
    if (!this.options) {
      return new Error('No Options');
    }
    this.api = new MetrichorAPI(this.options);
    this.ssd = new SSD(this.options);
    this.aws = new AWS(this.api, this.ssd);
    this.aws.on('progress', this.stats);
    this.ssd.on('progress', this.stats);
    this.aws.on('status', (function(_this) {
      return function(status) {
        return _this.emit('status', "AWS: " + status);
      };
    })(this));
    this.ssd.on('status', (function(_this) {
      return function(status) {
        return _this.emit('status', "SSD: " + status);
      };
    })(this));
  }

  MetrichorSync.prototype.stats = function(key) {
    var aws, complete, last_complete, local, processed, ref, ref1, ref2, ref3, ref4, ref5, uploading;
    local = this.ssd.stats;
    aws = this.aws.stats;
    uploading = aws.uploading;
    processed = local.downloaded + aws.sqs.output.visible + aws.sqs.output.flight;
    if (this.latestStats) {
      processed = Math.max(processed, this.latestStats.progress.processed);
    }
    complete = Math.min(1, (local.downloaded + local.uploaded + processed + ((aws.downloading + uploading) / 4)) / (local.total * 3));
    if (this.latestStats) {
      last_complete = ((ref = this.latestStats) != null ? ref.complete : void 0) || 0;
      complete = Math.max(last_complete, complete);
    }
    processed = Math.min(processed, local.total);
    this.emit('progress', this.latestStats = {
      instance: this.api.loadedInstance,
      progress: {
        files: local.total,
        uploaded: local.uploaded,
        processed: processed,
        downloaded: local.downloaded
      },
      transfer: {
        uploading: uploading,
        processing: ((ref1 = aws.sqs.input) != null ? ref1.flight : void 0) + ((ref2 = aws.sqs.input) != null ? ref2.visible : void 0),
        downloading: aws.downloading,
        failed: local.upload_failed + aws.failed
      },
      complete: parseFloat(complete.toFixed(3)),
      upload: {
        success: processed,
        failure: {},
        queueLength: 0,
        totalSize: processed,
        total: (ref3 = this.ssd.stats) != null ? ref3.total : void 0
      },
      download: {
        success: (ref4 = this.ssd.stats) != null ? ref4.downloaded : void 0,
        fail: 0,
        failure: {},
        queueLength: 0,
        totalSize: (ref5 = this.ssd.stats) != null ? ref5.downloaded : void 0
      }
    });
    console.log(this.latestStats);
    if (key) {
      return this.latestStats[key];
    }
    return this.latestStats;
  };

  MetrichorSync.prototype.create = function(config, done) {
    return this.api.createNewInstance(config, (function(_this) {
      return function(error, instanceID) {
        if (error) {
          return typeof done === "function" ? done(error) : void 0;
        }
        _this.emit('status', "Created Instance " + instanceID);
        return _this.join(instanceID, done);
      };
    })(this));
  };

  MetrichorSync.prototype.join = function(instanceID, done) {
    return this.api.loadInstance(instanceID, (function(_this) {
      return function(error, instance) {
        if (error) {
          return typeof done === "function" ? done(error) : void 0;
        }
        _this.emit('status', "Joined Instance " + _this.api.loadedInstance);
        if (_this.options.manualSync) {
          return typeof done === "function" ? done(false, instanceID) : void 0;
        }
        _this.aws.instance = instance;
        return _this.resume(done);
      };
    })(this));
  };

  MetrichorSync.prototype.stop = function(done) {
    return this.pause((function(_this) {
      return function() {
        var loadedInstance;
        loadedInstance = _this.api.loadedInstance;
        _this.aws.instance = false;
        _this.latestStats = {};
        return _this.api.stopLoadedInstance(function(error, response) {
          if (error) {
            return typeof done === "function" ? done(error) : void 0;
          }
          _this.emit('status', "Stopped Instance " + loadedInstance);
          return typeof done === "function" ? done(false) : void 0;
        });
      };
    })(this));
  };

  MetrichorSync.prototype.resetLocalDirectory = function(done) {
    return this.ssd.reset((function(_this) {
      return function(error) {
        if (error) {
          return typeof done === "function" ? done(error) : void 0;
        }
        _this.emit('status', "Local Directory Reset");
        return typeof done === "function" ? done() : void 0;
      };
    })(this));
  };

  MetrichorSync.prototype.pause = function(done) {
    if (!this.api.loadedInstance) {
      return typeof done === "function" ? done(new Error('No App Instance Running')) : void 0;
    }
    return this.ssd.stop((function(_this) {
      return function(error) {
        if (error) {
          return typeof done === "function" ? done(error) : void 0;
        }
        return _this.aws.stop(function(error) {
          if (error) {
            return typeof done === "function" ? done(error) : void 0;
          }
          _this.emit('status', "Instance " + _this.api.loadedInstance + " Paused");
          return typeof done === "function" ? done(false) : void 0;
        });
      };
    })(this));
  };

  MetrichorSync.prototype.resume = function(done) {
    if (!this.api.loadedInstance) {
      return typeof done === "function" ? done(new Error('No App Instance Found')) : void 0;
    }
    return this.ssd.start((function(_this) {
      return function(error) {
        return _this.ssd.createTelemetry(_this.api.loadedInstance, function(error, done) {
          if (error) {
            _this.ssd.stop();
            return typeof done === "function" ? done(error) : void 0;
          }
          return _this.aws.start(_this.aws.instance, function(error) {
            if (error) {
              _this.ssd.stop();
              _this.aws.stop();
              return typeof done === "function" ? done(error) : void 0;
            }
            _this.emit('status', "Instance " + _this.api.loadedInstance + " Syncing");
            _this.stats();
            return typeof done === "function" ? done(false, {
              id_workflow_instance: _this.api.loadedInstance
            }) : void 0;
          });
        });
      };
    })(this));
  };

  MetrichorSync.prototype.url = function() {
    return this.options.url;
  };

  MetrichorSync.prototype.apikey = function() {
    return this.options.apikey;
  };

  MetrichorSync.prototype.attr = function(key, value) {
    return this.options[key] = value || this.options[key];
  };

  MetrichorSync.prototype.autoStart = function(config, done) {
    return this.create(config, done);
  };

  MetrichorSync.prototype.autoJoin = function(id, done) {
    return this.join(id, done);
  };

  MetrichorSync.prototype.stop_everything = function(done) {
    return this.stop(done);
  };

  MetrichorSync.prototype.workflows = function(done) {
    return this.api.listApps(done);
  };

  MetrichorSync.prototype.workflow_instances = function(done) {
    return this.api.listInstances(done);
  };

  MetrichorSync.prototype.workflow_config = function(id, done) {
    return this.api.getAppConfig(id, done);
  };

  MetrichorSync.prototype.workflow = function(id, done) {
    return this.api.getApp(id, done);
  };

  return MetrichorSync;

})(EventEmitter);

module.exports.version = '2.50.0';

module.exports = MetrichorSync;
