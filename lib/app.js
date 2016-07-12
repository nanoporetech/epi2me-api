var AWS, EventEmitter, MetrichorAPI, MetrichorSync, SSD, fs, os, path,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

EventEmitter = require('events').EventEmitter;

MetrichorAPI = require('./Classes/MetrichorAPI');

SSD = require('./Classes/SSD');

AWS = require('./Classes/AWS');

path = require('path');

fs = require('fs');

os = require('os');

MetrichorSync = (function(superClass) {
  extend(MetrichorSync, superClass);

  function MetrichorSync(options) {
    this.options = options;
    this.stats = bind(this.stats, this);
    this.status = bind(this.status, this);
    if (!this.options) {
      return new Error('No Options');
    }
    if (!this.options.outputFolder) {
      this.options.outputFolder = path.join(this.options.inputFolder, 'downloads');
    }
    this.api = new MetrichorAPI(this.options);
    this.ssd = new SSD(this.options);
    this.aws = new AWS(this.options, this.api, this.ssd);
    this.aws.on('progress', this.stats);
    this.ssd.on('progress', this.stats);
    this.aws.on('status', (function(_this) {
      return function(message) {
        return _this.status("AWS: " + message);
      };
    })(this));
    this.ssd.on('status', (function(_this) {
      return function(message) {
        return _this.status("SSD: " + message);
      };
    })(this));
    this.aws.on('fatal', (function(_this) {
      return function(fatalMessage) {
        if (_this.onFatal) {
          return _this.pause(function(error) {
            return _this.resetLocalDirectory(function(error) {
              return _this.onFatal(fatalMessage, false);
            });
          });
        }
      };
    })(this));
  }

  MetrichorSync.prototype.status = function(message) {
    var id, log;
    this.emit('status', message);
    id = this.api.instance.id;
    if (!id) {
      return;
    }
    if (!this.logStream) {
      log = path.join(this.options.outputFolder, "agent-" + id + ".log");
      if (!fs.existsSync(log)) {
        return;
      }
      this.logStream = fs.createWriteStream(log, {
        flags: "a"
      });
    }
    return this.logStream.write("[" + (new Date().toISOString()) + "] " + message + " " + os.EOL);
  };

  MetrichorSync.prototype.stats = function(key) {
    var ref, ref1, ref2, ref3, ref4;
    this.emit('progress', this.latestStats = {
      instance: this.api.instance.id,
      upload: {
        success: ((ref = this.ssd.stats) != null ? ref.uploaded : void 0) || 0,
        totalSize: ((ref1 = this.ssd.stats) != null ? ref1.uploaded : void 0) || 0,
        total: ((ref2 = this.ssd.stats) != null ? ref2.total : void 0) || 0
      },
      download: {
        success: (ref3 = this.ssd.stats) != null ? ref3.downloaded : void 0,
        totalSize: (ref4 = this.ssd.stats) != null ? ref4.downloaded : void 0
      },
      all: {
        ssd: this.ssd.stats,
        aws: this.aws.stats
      }
    });
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
        _this.emit('status', "Joined Instance " + _this.api.instance.id);
        if (_this.options.manualSync) {
          return typeof done === "function" ? done(false, instanceID) : void 0;
        }
        return _this.resume(done);
      };
    })(this));
  };

  MetrichorSync.prototype.stop = function(done) {
    return this.pause((function(_this) {
      return function() {
        var loadedInstance;
        loadedInstance = _this.api.instance.id;
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
    if (!this.api.instance.id) {
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
          _this.emit('status', "Instance " + _this.api.instance.id + " Paused");
          return typeof done === "function" ? done(false) : void 0;
        });
      };
    })(this));
  };

  MetrichorSync.prototype.resume = function(done) {
    this.onFatal = function(error) {
      return done(error, false);
    };
    if (!this.api.instance.id) {
      return typeof done === "function" ? done(new Error('No App Instance Found')) : void 0;
    }
    return this.ssd.freeSpace((function(_this) {
      return function(error) {
        if (error) {
          return typeof done === "function" ? done(error) : void 0;
        }
        return _this.ssd.createSubdirectories(function(error) {
          if (error) {
            return typeof done === "function" ? done(error) : void 0;
          }
          return _this.ssd.checkPermissions(function(error) {
            if (error) {
              return typeof done === "function" ? done(error) : void 0;
            }
            return _this.ssd.createTelemetry(_this.api.instance.id, function(error) {
              if (error) {
                return typeof done === "function" ? done(error) : void 0;
              }
              return _this.ssd.start(function(error) {
                if (error) {
                  return _this.pause(function() {
                    return typeof done === "function" ? done(error) : void 0;
                  });
                }
                return _this.aws.start(function(error) {
                  if (error) {
                    return _this.pause(function() {
                      return typeof done === "function" ? done(error) : void 0;
                    });
                  }
                  _this.emit('status', "Instance " + _this.api.instance.id + " Syncing");
                  _this.stats();
                  return typeof done === "function" ? done(false, {
                    id_workflow_instance: _this.api.instance.id
                  }) : void 0;
                });
              });
            });
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
