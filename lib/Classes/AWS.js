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
    this.gotFileList = bind(this.gotFileList, this);
    this.downloadScan = bind(this.downloadScan, this);
    this.uploadFile = bind(this.uploadFile, this);
    this.uploadScan = bind(this.uploadScan, this);
    this.fatal = bind(this.fatal, this);
    this.nextScan = bind(this.nextScan, this);
    this.options.downloadMode = this.options.downloadMode || 'data+telemetry';
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
    if (!this.ssd) {
      return typeof done === "function" ? done(new Error('No local SSD')) : void 0;
    }
    if (!this.api) {
      return typeof done === "function" ? done(new Error('No MetrichorAPI access')) : void 0;
    }
    if (!this.api.instance) {
      return typeof done === "function" ? done(new Error('No Instance')) : void 0;
    }
    if (this.isRunning) {
      return typeof done === "function" ? done(new Error("Instance already running")) : void 0;
    }
    this.stats = {
      uploading: 0,
      downloading: 0,
      failed: 0
    };
    WatchJS.watch(this.stats, (function(_this) {
      return function() {
        return _this.emit('progress');
      };
    })(this));
    this.isRunning = true;
    return this.token((function(_this) {
      return function(error) {
        if (error) {
          return typeof done === "function" ? done(new Error('No token generated')) : void 0;
        }
        return _this.generateQueues(function() {
          _this.nextScan('download', 1);
          _this.nextScan('upload', 1);
          return typeof done === "function" ? done() : void 0;
        });
      };
    })(this));
  };

  AWS.prototype.token = function(done) {
    var expires, minutesUntilExpiry, options;
    if (this.currentToken) {
      expires = new Date(this.currentToken.expiration) - new Date();
      minutesUntilExpiry = Math.floor(expires / 1000 / 60);
      if (minutesUntilExpiry < 10) {
        this.currentToken = false;
      }
    }
    if (this.currentToken) {
      return typeof done === "function" ? done(false, this.currentToken) : void 0;
    }
    options = {
      id_workflow_instance: this.api.instance.id,
      region: this.api.instance.region
    };
    this.status("Attempt to create new token");
    return this.api.getToken(options, (function(_this) {
      return function(error, token) {
        if (error) {
          _this.status("Couldn't crete token because " + error);
          return typeof done === "function" ? done(error) : void 0;
        }
        _this.status("Created new token");
        _this.currentToken = {
          s3: new AWS_SDK.S3(token),
          sqs: new AWS_SDK.SQS(token),
          expiration: token.expiration
        };
        return _this.generateQueues(done);
      };
    })(this));
  };

  AWS.prototype.generateQueues = function(done) {
    var input, output;
    input = this.api.instance.inputqueue;
    output = this.api.instance.outputqueue;
    return this.currentToken.sqs.getQueueUrl({
      QueueName: input
    }, (function(_this) {
      return function(error, input) {
        if (error) {
          return done(error);
        }
        return _this.currentToken.sqs.getQueueUrl({
          QueueName: output
        }, function(error, output) {
          if (error) {
            return done(error);
          }
          _this.api.instance.url = {
            input: input.QueueUrl,
            output: output.QueueUrl
          };
          return typeof done === "function" ? done(false, _this.currentToken) : void 0;
        });
      };
    })(this));
  };

  AWS.prototype.nextScan = function(upOrDown, delay) {
    if (!this.isRunning) {
      return;
    }
    return this[upOrDown + "Timer"] = setTimeout(this[upOrDown + "Scan"], delay || 5000);
  };

  AWS.prototype.scanFailed = function(upOrDown, error) {
    if (error.message !== 'No batches') {
      this.status(upOrDown + " Scan Failed because " + error);
    }
    return this.nextScan(upOrDown, 10000);
  };

  AWS.prototype.fatal = function(error) {
    this.emit('fatal', error);
    return this.status("Instance terminated because " + error);
  };

  AWS.prototype.uploadScan = function() {
    this.status("Upload Scan");
    return this.ssd.getBatch((function(_this) {
      return function(error, batch) {
        if (error) {
          return _this.scanFailed('upload', error);
        }
        return async.eachLimit(batch.files, 10, _this.uploadFile, function(error) {
          if (error) {
            return _this.scanFailed('upload', error);
          }
          return _this.ssd.removeEmptyBatch(batch.source, function(error) {
            if (error) {
              return _this.scanFailed('upload', error);
            }
            _this.status("Batch Uploaded");
            return _this.nextScan('upload');
          });
        });
      };
    })(this));
  };

  AWS.prototype.uploadFile = function(file, done) {
    if (!this.isRunning) {
      return;
    }
    this.status('Upload file');
    return this.token((function(_this) {
      return function(error, aws) {
        if (error) {
          return typeof done === "function" ? done(error) : void 0;
        }
        _this.stats.uploading += 1;
        return _this.ssd.getFile(file.source, function(error, data) {
          var S3Object;
          if (error) {
            return typeof done === "function" ? done(error) : void 0;
          }
          S3Object = {
            Bucket: _this.api.instance.bucket,
            Key: [_this.api.instance.keypath, file.name].join('/'),
            Body: data
          };
          return aws.s3.putObject(S3Object, function(error) {
            var SQSObject, message;
            if (!_this.isRunning) {
              return;
            }
            if (error) {
              return typeof done === "function" ? done(error) : void 0;
            }
            message = _this.api.instance.messageTemplate;
            message.utc = new Date().toISOString();
            message.path = [_this.api.instance.keypath, file.name].join('/');
            SQSObject = {
              QueueUrl: _this.api.instance.url.input,
              MessageBody: JSON.stringify(message)
            };
            return aws.sqs.sendMessage(SQSObject, function(error) {
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

  AWS.prototype.downloadScan = function() {
    this.status("Download Scan");
    return this.ssd.freeSpace((function(_this) {
      return function(error, space) {
        if (error) {
          console.log(error);
        }
        if (error) {
          return _this.fatal('Disk Full. Delete some files and try again.');
        }
        return _this.token(function(error, aws) {
          if (error) {
            return _this.scanFailed('download', error);
          }
          _this.sqsReceiveConfig.QueueUrl = _this.api.instance.url.output;
          return aws.sqs.receiveMessage(_this.sqsReceiveConfig, function(error, messages) {
            if (error) {
              return _this.scanFailed('download', error);
            }
            return _this.gotFileList(messages);
          });
        });
      };
    })(this));
  };

  AWS.prototype.gotFileList = function(messages) {
    var ref, ref1;
    if (!(messages != null ? (ref = messages.Messages) != null ? ref.length : void 0 : void 0)) {
      this.status("No SQS Messages found");
      return this.nextScan('download');
    }
    this.status((messages != null ? (ref1 = messages.Messages) != null ? ref1.length : void 0 : void 0) + " SQS Messages found");
    return async.eachLimit(messages.Messages, 1, this.downloadFile, (function(_this) {
      return function(error) {
        if (error) {
          return _this.scanFailed('download', error);
        }
        return _this.nextScan('download');
      };
    })(this));
  };

  AWS.prototype.downloadFile = function(sqsMessage, next) {
    if (!this.isRunning) {
      return;
    }
    if (!sqsMessage) {
      return typeof next === "function" ? next(new Error('No SQS message')) : void 0;
    }
    this.stats.downloading += 1;
    return this.token((function(_this) {
      return function(error, aws) {
        var body, filename, streamOptions;
        if (error) {
          return next(error);
        }
        body = JSON.parse(sqsMessage.Body);
        if (!body.telemetry) {
          return typeof next === "function" ? next(new Error('No telemetry')) : void 0;
        }
        filename = body.path.match(/[\w\W]*\/([\w\W]*?)$/)[1];
        streamOptions = {
          Bucket: body.bucket,
          Key: body.path
        };
        return _this.ssd.appendToTelemetry(body.telemetry, function() {
          var failed, mode, ref, ref1, stream;
          failed = ((ref = body.telemetry) != null ? (ref1 = ref.hints) != null ? ref1.folder : void 0 : void 0) === 'fail';
          mode = _this.options.downloadMode;
          if (mode === 'telemetry') {
            return _this.skipFile(next);
          }
          if (mode === 'success+telemetry' && failed) {
            return _this.skipFile(next);
          }
          stream = aws.s3.getObject(streamOptions).createReadStream();
          return _this.ssd.saveDownloadedFile(stream, filename, body.telemetry, function(error) {
            var deleteOptions, ref2;
            if (error) {
              _this.stats.failed += 1;
              _this.stats.downloading -= 1;
              return typeof next === "function" ? next(error) : void 0;
            }
            deleteOptions = {
              QueueUrl: (ref2 = _this.api.instance.url) != null ? ref2.output : void 0,
              ReceiptHandle: sqsMessage.ReceiptHandle
            };
            return aws.sqs.deleteMessage(deleteOptions, function(error) {
              _this.stats.downloading -= 1;
              if (error) {
                return typeof next === "function" ? next(error) : void 0;
              }
              return typeof next === "function" ? next() : void 0;
            });
          });
        });
      };
    })(this));
  };

  AWS.prototype.skipFile = function(next) {
    this.stats.downloading -= 1;
    this.ssd.stats.downloaded += 1;
    return next();
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
