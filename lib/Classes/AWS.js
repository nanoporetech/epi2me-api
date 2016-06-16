var AWS, AWS_SDK, EventEmitter, WatchJS, async, diff, path,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

EventEmitter = require('events').EventEmitter;

AWS_SDK = require('aws-sdk');

path = require('path');

diff = require('deep-diff').diff;

async = require('async');

WatchJS = require("watchjs");

AWS = (function(superClass) {
  extend(AWS, superClass);

  function AWS(options1, api, ssd) {
    this.options = options1;
    this.api = api;
    this.ssd = ssd;
    this.downloadFile = bind(this.downloadFile, this);
    this.uploadFile = bind(this.uploadFile, this);
    this.fatal = bind(this.fatal, this);
    this.nextUploadScan = bind(this.nextUploadScan, this);
    this.nextDownloadScan = bind(this.nextDownloadScan, this);
    this.downloadScan = bind(this.downloadScan, this);
    this.uploadScan = bind(this.uploadScan, this);
    this.sqsReceiveConfig = {
      VisibilityTimeout: 600,
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 20
    };
  }

  AWS.prototype.status = function(message) {
    return this.emit('status', message);
  };

  AWS.prototype.start = function(done) {
    if (this.isRunning) {
      return typeof done === "function" ? done(new Error("Instance already running")) : void 0;
    }
    this.stats = {
      uploading: 0,
      downloading: 0,
      failed: 0
    };
    return this.token((function(_this) {
      return function(error, aws) {
        return aws.sqs.getQueueUrl({
          QueueName: _this.instance.inputqueue
        }, function(error, input) {
          if (error) {
            return done(error);
          }
          return aws.sqs.getQueueUrl({
            QueueName: _this.instance.outputqueue
          }, function(error, output) {
            if (error) {
              return done(error);
            }
            _this.instance.url = {
              input: input.QueueUrl,
              output: output.QueueUrl
            };
            WatchJS.watch(_this.stats, function() {
              return _this.emit('progress');
            });
            return _this.ssd.createTelemetry(_this.api.loadedInstance, function() {
              _this.isRunning = true;
              _this.nextDownloadScan(1);
              _this.nextUploadScan(1);
              return typeof done === "function" ? done() : void 0;
            });
          });
        });
      };
    })(this));
  };

  AWS.prototype.token = function(done) {
    var expires, minutesUntilExpiry, options;
    if (this.currentToken) {
      expires = new Date(this.currentToken.token.expiration) - new Date();
      minutesUntilExpiry = Math.floor(expires / 1000 / 60);
      if (minutesUntilExpiry < 10) {
        this.currentToken = false;
      }
    }
    if (this.currentToken) {
      return typeof done === "function" ? done(false, this.currentToken) : void 0;
    }
    options = {
      id_workflow_instance: this.api.loadedInstance,
      region: this.instance.region
    };
    this.status("Attempt to create new token");
    return this.api.post("token", options, (function(_this) {
      return function(error, token) {
        if (error) {
          return typeof done === "function" ? done(error) : void 0;
        }
        if (!token) {
          return typeof done === "function" ? done(new Error('No Token Generated')) : void 0;
        }
        _this.status("Created new token");
        token.region = _this.instance.region;
        _this.currentToken = {
          token: token,
          s3: new AWS_SDK.S3(token),
          sqs: new AWS_SDK.SQS(token)
        };
        return typeof done === "function" ? done(false, _this.currentToken) : void 0;
      };
    })(this));
  };

  AWS.prototype.uploadScan = function() {
    return this.ssd.getBatch((function(_this) {
      return function(error, batch) {
        if (error) {
          return _this.uploadScanFailed();
        }
        if (!(batch != null ? batch.files.length : void 0)) {
          return _this.nextUploadScan();
        }
        return async.eachLimit(batch.files, 10, _this.uploadFile, function(error) {
          if (error) {
            return _this.uploadScanFailed();
          }
          return _this.ssd.removeEmptyBatch(batch.source, function(error) {
            _this.status("Batch Uploaded");
            return _this.nextUploadScan();
          });
        });
      };
    })(this));
  };

  AWS.prototype.downloadScan = function(delay) {
    return this.ssd.freeSpace((function(_this) {
      return function(error, space) {
        if (error) {
          return _this.fatal('Disk Full. Delete some files and try again.');
        }
        return _this.token(function(error, aws) {
          if (error) {
            return _this.downloadScanFailed(error);
          }
          _this.sqsReceiveConfig.QueueUrl = _this.instance.url.output;
          return aws.sqs.receiveMessage(_this.sqsReceiveConfig, function(error, messages) {
            var ref, ref1;
            if (error) {
              return _this.downloadScanFailed(error);
            }
            if (!(messages != null ? (ref = messages.Messages) != null ? ref.length : void 0 : void 0)) {
              _this.status("No SQS Messages found");
              return _this.nextDownloadScan();
            }
            _this.status((messages != null ? (ref1 = messages.Messages) != null ? ref1.length : void 0 : void 0) + " SQS Messages found");
            return async.eachLimit(messages.Messages, 1, _this.downloadFile, function(error) {
              if (error) {
                return _this.downloadScanFailed(error);
              }
              return _this.nextDownloadScan();
            });
          });
        });
      };
    })(this));
  };

  AWS.prototype.nextDownloadScan = function(delay) {
    if (!this.isRunning) {
      return;
    }
    return this.downloadTimer = setTimeout(this.downloadScan, delay || 5000);
  };

  AWS.prototype.downloadScanFailed = function(error) {
    this.status("Download Scan Failed because " + error);
    return this.nextDownloadScan(10000);
  };

  AWS.prototype.nextUploadScan = function(delay) {
    if (!this.isRunning) {
      return;
    }
    return this.uploadTimer = setTimeout(this.uploadScan, delay || 5000);
  };

  AWS.prototype.uploadScanFailed = function(error) {
    this.status("Upload Scan Failed because " + error);
    return this.nextUploadScan(10000);
  };

  AWS.prototype.fatal = function(error) {
    console.log('fatal', error);
    this.emit('fatal', error);
    return this.status("Instance terminated because " + error);
  };

  AWS.prototype.uploadFile = function(file, done) {
    this.status('Upload file');
    if (!this.isRunning) {
      return;
    }
    return this.token((function(_this) {
      return function(error, aws) {
        if (error) {
          return typeof done === "function" ? done(error) : void 0;
        }
        _this.stats.uploading += 1;
        return _this.ssd.getFile(file.source, function(error, data) {
          var S3Object;
          S3Object = {
            Bucket: _this.instance.bucket,
            Key: [_this.instance.keypath, file.name].join('/'),
            Body: data
          };
          return aws.s3.putObject(S3Object, function(error) {
            var SQSSendOptions, message;
            if (!_this.isRunning) {
              return;
            }
            if (error) {
              return typeof done === "function" ? done(error) : void 0;
            }
            message = _this.instance.messageTemplate;
            message.utc = new Date().toISOString();
            message.path = [_this.instance.path, file.name].join('/');
            SQSSendOptions = {
              QueueUrl: _this.instance.url.input,
              MessageBody: JSON.stringify(message)
            };
            return aws.sqs.sendMessage(SQSSendOptions, function(error) {
              var success;
              success = error == null;
              return _this.ssd.moveUploadedFile(file, success, function(error) {
                _this.stats.uploading -= 1;
                if (error) {
                  return typeof done === "function" ? done(error) : void 0;
                }
                return done();
              });
            });
          });
        });
      };
    })(this));
  };

  AWS.prototype.downloadFile = function(sqsMessage, done) {
    if (!this.isRunning) {
      return;
    }
    this.stats.downloading += 1;
    return this.token((function(_this) {
      return function(error, aws) {
        var body, filename, folder, mode, ref, stream, streamOptions;
        if (error) {
          return done(error);
        }
        body = JSON.parse(sqsMessage.Body);
        filename = body.path.match(/[\w\W]*\/([\w\W]*?)$/)[1];
        streamOptions = {
          Bucket: body.bucket,
          Key: body.path
        };
        if (body.telemetry) {
          _this.ssd.appendToTelemetry(body.telemetry);
        }
        folder = (ref = body.telemetry.hints) != null ? ref.folder : void 0;
        mode = _this.options.downloadMode;
        if (mode === 'telemetry') {
          return _this.skipFile(done);
        }
        if (mode === 'success+telemetry' && folder === 'fail') {
          return _this.skipFile(done);
        }
        stream = aws.s3.getObject(streamOptions).createReadStream();
        return _this.ssd.saveDownloadedFile(stream, filename, body.telemetry, function(error) {
          var deleteOptions;
          if (error) {
            _this.stats.failed += 1;
            _this.stats.downloading -= 1;
            return typeof done === "function" ? done(error) : void 0;
          }
          deleteOptions = {
            QueueUrl: _this.instance.url.output,
            ReceiptHandle: sqsMessage.ReceiptHandle
          };
          return aws.sqs.deleteMessage(deleteOptions, function(error) {
            _this.stats.downloading -= 1;
            if (error) {
              return typeof done === "function" ? done(error) : void 0;
            }
            return typeof done === "function" ? done() : void 0;
          });
        });
      };
    })(this));
  };

  AWS.prototype.skipFile = function(done) {
    this.stats.downloading -= 1;
    this.ssd.stats.downloaded += 1;
    return done();
  };

  AWS.prototype.stop = function(done) {
    this.isRunning = false;
    if (this.stats) {
      WatchJS.unwatch(this.stats);
    }
    clearTimeout(this.uploadTimer);
    clearTimeout(this.downloadTimer);
    return typeof done === "function" ? done() : void 0;
  };

  return AWS;

})(EventEmitter);

module.exports = AWS;
