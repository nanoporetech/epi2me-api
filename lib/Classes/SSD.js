var EventEmitter, SSD, WatchJS, async, chokidar, completeBatch, deleteEmpty, disk, fast5, fs, isBatch, isPartial, isProcessing, mkdirp, mv, os, partialBatch, path, pathRoot, split,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

fs = require('fs.extra');

mv = require('mv');

mkdirp = require('mkdirp');

path = require('path');

chokidar = require('chokidar');

async = require('async');

EventEmitter = require('events').EventEmitter;

WatchJS = require("watchjs");

os = require('os');

disk = require('diskspace');

pathRoot = require('path-root');

split = require('split');

deleteEmpty = require('delete-empty');

fast5 = function(item) {
  return item.slice(-6) === '.fast5';
};

isBatch = function(item) {
  return item.slice(0, 6) === 'batch_';
};

isProcessing = function(item) {
  return item.slice(-11) === '.processing';
};

isPartial = function(item) {
  return item.slice(-8) === '_partial' || isProcessing(item);
};

completeBatch = function(item) {
  return isBatch(item) && !isPartial(item);
};

partialBatch = function(item) {
  return isBatch(item) && isPartial(item);
};

SSD = (function(superClass) {
  extend(SSD, superClass);

  function SSD(options) {
    this.options = options;
    this.countLinesInFile = bind(this.countLinesInFile, this);
    this.createTelemetry = bind(this.createTelemetry, this);
    this.checkPermissions = bind(this.checkPermissions, this);
    this.freeSpace = bind(this.freeSpace, this);
    this.saveDownloadedFile = bind(this.saveDownloadedFile, this);
    this.moveUploadedFile = bind(this.moveUploadedFile, this);
    this.batchSize = 100;
    this.isRunning = false;
    this.sub = {
      pending: path.join(this.options.inputFolder, 'pending'),
      uploaded: path.join(this.options.inputFolder, 'uploaded'),
      upload_failed: path.join(this.options.inputFolder, 'upload_failed'),
      downloads: this.options.outputFolder
    };
  }

  SSD.prototype.start = function(done) {
    if (this.isRunning) {
      return typeof done === "function" ? done(new Error("Directory already started")) : void 0;
    }
    return this.createSubdirectories((function(_this) {
      return function(error) {
        if (error) {
          return typeof done === "function" ? done(error) : void 0;
        }
        return _this.initialStats(function(error) {
          if (error) {
            return typeof done === "function" ? done(error) : void 0;
          }
          _this.isRunning = true;
          return _this.convertToBatches(true, function(error) {
            if (error) {
              return typeof done === "function" ? done(error) : void 0;
            }
            _this.createFileWatcher();
            return typeof done === "function" ? done() : void 0;
          });
        });
      };
    })(this));
  };

  SSD.prototype.createSubdirectories = function(done) {
    return mkdirp(this.sub.pending, (function(_this) {
      return function(error) {
        if (error) {
          return typeof done === "function" ? done(error) : void 0;
        }
        return mkdirp(_this.sub.uploaded, function(error) {
          if (error) {
            return typeof done === "function" ? done(error) : void 0;
          }
          return mkdirp(_this.sub.upload_failed, function(error) {
            if (error) {
              return typeof done === "function" ? done(error) : void 0;
            }
            return mkdirp(_this.sub.downloads, function(error) {
              if (error) {
                return typeof done === "function" ? done(error) : void 0;
              }
              return done();
            });
          });
        });
      };
    })(this));
  };

  SSD.prototype.createFileWatcher = function() {
    this.watcher = chokidar.watch(this.options.inputFolder, {
      depth: 0,
      ignoreInitial: true
    });
    return this.watcher.on('add', (function(_this) {
      return function(path) {
        if (!fast5(path)) {
          return;
        }
        _this.stats.pending += 1;
        _this.stats.total += 1;
        if (_this.isBatching) {
          return;
        }
        _this.isBatching = true;
        return _this.convertToBatches(true, function(error) {
          return _this.isBatching = false;
        });
      };
    })(this));
  };

  SSD.prototype.initialStats = function(done) {
    this.stats = {};
    return fs.readdir(this.sub.pending, (function(_this) {
      return function(error, pending) {
        if (error) {
          return done(error);
        }
        return fs.readdir(_this.sub.uploaded, function(error, uploaded) {
          if (error) {
            return done(error);
          }
          return fs.readdir(_this.sub.upload_failed, function(error, upload_failed) {
            if (error) {
              return done(error);
            }
            return fs.readdir(_this.options.inputFolder, function(error, inputFolder) {
              if (error) {
                return done(error);
              }
              return _this.countTelemetry(function(lines) {
                var batched, i, len, partial, ref, source, total;
                batched = pending.filter(completeBatch).length * _this.batchSize;
                _this.stats = {
                  pending: batched + inputFolder.filter(fast5).length,
                  uploaded: uploaded.filter(fast5).length,
                  upload_failed: upload_failed.filter(fast5).length,
                  downloaded: lines,
                  uploadedSize: 0,
                  downloadedSize: 0
                };
                ref = pending.filter(partialBatch);
                for (i = 0, len = ref.length; i < len; i++) {
                  partial = ref[i];
                  source = path.join(_this.sub.pending, partial);
                  _this.stats.pending += fs.readdirSync(source).filter(fast5).length;
                }
                total = _this.stats.pending + _this.stats.uploaded + _this.stats.upload_failed;
                _this.stats.total = total;
                WatchJS.watch(_this.stats, function() {
                  return _this.emit('progress');
                });
                return typeof done === "function" ? done() : void 0;
              });
            });
          });
        });
      };
    })(this));
  };

  SSD.prototype.convertToBatches = function(enforceBatchSize, done) {
    return fs.readdir(this.options.inputFolder, (function(_this) {
      return function(error, files) {
        var batches, createBatch, last_batch;
        if (error) {
          return typeof done === "function" ? done(error) : void 0;
        }
        files = files.filter(fast5);
        batches = ((function() {
          var results;
          results = [];
          while (files.length) {
            results.push(files.splice(0, this.batchSize));
          }
          return results;
        }).call(_this));
        last_batch = batches[batches.length - 1];
        if (enforceBatchSize && (last_batch != null ? last_batch.length : void 0) < _this.batchSize) {
          batches.pop();
        }
        if (!batches.length) {
          return typeof done === "function" ? done() : void 0;
        }
        createBatch = function(batch, next) {
          var destination, moveFile;
          if (!_this.isRunning) {
            return done();
          }
          moveFile = function(file, next) {
            if (!_this.isRunning) {
              return done();
            }
            return mv(file.source, file.destination, {
              mkdirp: true
            }, function(error) {
              if (error) {
                return typeof done === "function" ? done(error) : void 0;
              }
              return async.setImmediate(next);
            });
          };
          destination = path.join(_this.sub.pending, "batch_" + (Date.now()));
          if (!enforceBatchSize) {
            destination += '_partial';
          }
          batch = batch.map(function(file) {
            return file = {
              source: path.join(_this.options.inputFolder, file),
              destination: path.join(destination, file)
            };
          });
          return async.eachSeries(batch, moveFile, function(error) {
            if (error) {
              return typeof done === "function" ? done(error) : void 0;
            }
            return async.setImmediate(next);
          });
        };
        return async.eachSeries(batches, createBatch, done);
      };
    })(this));
  };

  SSD.prototype.getBatch = function(done) {
    return fs.readdir(this.sub.pending, (function(_this) {
      return function(error, batches) {
        if (error) {
          return done(error);
        }
        batches = batches != null ? batches.filter(isBatch) : void 0;
        if (!(batches != null ? batches.length : void 0)) {
          return fs.readdir(_this.options.inputFolder, function(error, files) {
            if (!files.filter(fast5).length) {
              return done(new Error('No batches'));
            }
            return _this.convertToBatches(false, function() {
              return _this.getBatch(done);
            });
          });
        }
        return _this.markAsProcessing(path.join(_this.sub.pending, batches[0]), function(error, batch) {
          return fs.readdir(batch, function(error, files) {
            var response;
            if (error) {
              return done(error);
            }
            files = files.map(function(file) {
              return file = {
                name: file,
                source: path.join(batch, file)
              };
            });
            if (!files.length) {
              _this.emit('status', "Batch was empty, kill it and get another");
              return _this.removeEmptyBatch(batch, function() {
                return _this.getBatch(done);
              });
            }
            return done(false, response = {
              source: batch,
              files: files
            });
          });
        });
      };
    })(this));
  };

  SSD.prototype.getFile = function(source, done) {
    return fs.readFile(source, function(error, data) {
      if (error) {
        return done(error);
      }
      return done(false, data);
    });
  };

  SSD.prototype.markAsProcessing = function(source, done) {
    if (isProcessing(source)) {
      return done(false, source);
    }
    return mv(source, source + ".processing", {
      mkdirp: true
    }, function(error) {
      if (error) {
        return done(error);
      }
      return done(false, source + ".processing");
    });
  };

  SSD.prototype.moveUploadedFile = function(file, success, done) {
    var destination, sub;
    sub = success ? 'uploaded' : 'upload_failed';
    destination = path.join(this.options.inputFolder, sub, file.name);
    return fs.stat(file.source, (function(_this) {
      return function(error, stats) {
        if (error) {
          return done;
        }
        if (stats && stats.size) {
          _this.stats.uploadedSize += stats.size;
        }
        return mv(file.source, destination, function(error) {
          if (error) {
            return done(error);
          }
          _this.stats[sub] += 1;
          return done();
        });
      };
    })(this));
  };

  SSD.prototype.saveDownloadedFile = function(stream, filename, telemetry, done) {
    var destination, failed, folder, localFile, localPath, ref, ref1, saveFailed, successful, timeout;
    failed = false;
    saveFailed = (function(_this) {
      return function() {
        if (failed) {
          return;
        }
        failed = true;
        clearTimeout(timeout);
        _this.emit('status', "Download Failed " + filename);
        return done(new Error("Download failed"));
      };
    })(this);
    timeout = setTimeout(saveFailed, 30000);
    destination = this.sub.downloads;
    if (this.options.filter !== 'off') {
      if (telemetry != null ? (ref = telemetry.hints) != null ? ref.folder : void 0 : void 0) {
        destination = path.join(destination, telemetry.hints.folder);
      } else if (telemetry != null ? (ref1 = telemetry.json) != null ? ref1.exit_status : void 0 : void 0) {
        successful = telemetry.json.exit_status.match(/workflow[ ]successful/i);
        folder = path.join(folder, successful ? 'pass' : 'fail');
      }
    }
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination);
    }
    localPath = path.join(destination, filename);
    localFile = fs.createWriteStream(localPath);
    stream.on('error', (function(_this) {
      return function() {
        return saveFailed();
      };
    })(this));
    stream.on('data', (function(_this) {
      return function() {
        if (failed) {
          return;
        }
        clearTimeout(timeout);
        return timeout = setTimeout(saveFailed, 30000);
      };
    })(this));
    stream.on('end', (function(_this) {
      return function() {
        if (failed) {
          return;
        }
        _this.stats.downloaded += 1;
        clearTimeout(timeout);
        failed = true;
        return fs.stat(localPath, function(error, stats) {
          if (error) {
            return done;
          }
          if (stats && stats.size) {
            _this.stats.downloadedSize += stats.size;
          }
          return typeof done === "function" ? done() : void 0;
        });
      };
    })(this));
    return stream.pipe(localFile);
  };

  SSD.prototype.removeEmptyBatch = function(batch, done) {
    if (fs.existsSync(batch)) {
      fs.rmdir(batch);
      return typeof done === "function" ? done() : void 0;
    }
    return typeof done === "function" ? done(new Error('Batch not found')) : void 0;
  };

  SSD.prototype.freeSpace = function(done) {
    var minimumFree;
    minimumFree = 100;
    if (this.options.downloadMode === 'telemetry') {
      return done();
    }
    return disk.check(pathRoot(this.sub.downloads), function(error, total, free, status) {
      var megabytes_free;
      if (error) {
        return done(error);
      }
      megabytes_free = Math.floor(free / 1024 / 1000);
      if (megabytes_free <= minimumFree) {
        return done(new Error('No disk space'));
      }
      return done();
    });
  };

  SSD.prototype.checkPermissions = function(done) {
    return fs.access(this.options.inputFolder, fs.R_OK, (function(_this) {
      return function(error) {
        if (error) {
          return done(error);
        }
        return fs.access(_this.sub.downloads, fs.W_OK, function(error) {
          if (error) {
            return done(error);
          }
          return done();
        });
      };
    })(this));
  };

  SSD.prototype.createTelemetry = function(instanceID, done) {
    this.telePath = path.join(this.sub.downloads, "telemetry-" + instanceID + ".log");
    this.telemetry = fs.createWriteStream(this.telePath, {
      flags: "a"
    });
    this.emit('status', "Logging telemetry to " + this.telePath);
    return done(false);
  };

  SSD.prototype.appendToTelemetry = function(data, done) {
    if (!data) {
      return done();
    }
    return this.telemetry.write(JSON.stringify(data) + os.EOL, function() {
      return done();
    });
  };

  SSD.prototype.countTelemetry = function(done) {
    if (!fs.existsSync(this.telePath)) {
      return done(0);
    }
    return this.countLinesInFile(this.telePath, function(error, lines) {
      return done(error ? 0 : lines);
    });
  };

  SSD.prototype.stop = function(done) {
    var batchingDone;
    batchingDone = (function(_this) {
      return function() {
        _this.isRunning = false;
        if (_this.watcher) {
          _this.watcher.unwatch(_this.options.inputFolder).close();
        }
        if (_this.stats) {
          WatchJS.unwatch(_this.stats);
        }
        return _this.reset(done);
      };
    })(this);
    if (!this.isBatching) {
      return batchingDone();
    }
    return setTimeout(((function(_this) {
      return function() {
        return _this.stop(done);
      };
    })(this)), 100);
  };

  SSD.prototype.reset = function(done) {
    var rootWalker;
    if (this.isRunning) {
      return typeof done === "function" ? done(new Error("Cannot reset while instance is running")) : void 0;
    }
    rootWalker = fs.walk(this.sub.pending);
    rootWalker.on("file", (function(_this) {
      return function(directory, stat, next) {
        var full;
        full = path.join(_this.options.inputFolder, stat.name);
        return mv(path.join(directory, stat.name), full, next);
      };
    })(this));
    return rootWalker.on('end', (function(_this) {
      return function() {
        var emptyWalker;
        emptyWalker = fs.walk(_this.options.inputFolder);
        emptyWalker.on("directory", function(directory, stat, next) {
          try {
            return fs.rmdir(path.join(directory, stat.name), next);
          } catch (undefined) {}
        });
        return emptyWalker.on('end', function() {
          return typeof done === "function" ? done(false) : void 0;
        });
      };
    })(this));
  };

  SSD.prototype.countLinesInFile = function(filePath, done) {
    var lineCount, readError;
    lineCount = 0;
    readError = false;
    return fs.createReadStream(filePath).pipe(split()).on('data', (function(_this) {
      return function(line) {
        return lineCount++;
      };
    })(this)).on('end', (function(_this) {
      return function() {
        if (readError) {
          return;
        }
        return done(null, lineCount - 1);
      };
    })(this)).on('error', (function(_this) {
      return function(error) {
        readError = true;
        return done(error);
      };
    })(this));
  };

  return SSD;

})(EventEmitter);

module.exports = SSD;
