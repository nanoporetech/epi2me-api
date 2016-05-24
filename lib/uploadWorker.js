var fs = require("graceful-fs");
var path = require("path");
var _cnf;

/*global require, module, $, metrichor, Promise, const */
function uploadWorker(cnf) {
    _cnf = cnf;

    /**
     * Constructor for Metrichor API downloadWorker
     * config: {
     *  message:      JSON message to be parsed
     *  options: ...
     *  s3,
     *  sqs
     * }
     */

    this.created = Date.now();
    if (!config.options.file) {
        throw new Error("invalid options. file is required");
    }

    return this;
}

uploadWorker.prototype = {
    start: function () {
        var that = this;
        return new Promise(function (resolve, reject) {
            that.uploadHandler()
                .then(that.moveFile.bind(that))
                .then(resolve)
                .catch(function (err) {
                    reject();
                    _cnf.log.error(err);
                });
        });
    },

    moveFile: function () {
        /**
         * Move uploaded file to uploaded folder
         */
    },

    sendMessage: function (sqs, objectId, item, successCb) {
        var that    = this,
            message = {
                bucket:               _config.instance.bucket,
                outputQueue:          _config.instance.outputQueueName,
                remote_addr:          _config.instance.remote_addr,
                user_defined:         _config.instance.user_defined || null, // MC-2397 - bind param_config to each sqs message
                apikey:               _config.options.apikey,
                id_workflow_instance: _config.instance.id_workflow_instance,
                utc:                  new Date().toISOString(),
//                message.inputFolder = that.runFolder; // MC-960 folder aggregation messages
                path:                 objectId,
                // components        // chained workflow structure
                // targetComponentId // first component to run
            };

        if (_config.instance.chain) {
            try {
                message.components        = JSON.parse(JSON.stringify(_config.instance.chain.components)); // low-frills object clone
                message.targetComponentId = _config.instance.chain.targetComponentId; // first component to run
            } catch (jsonException) {
                that.log.error("exception parsing components JSON " + String(jsonException));
                return successCb("json exception");// close the queue job
            }
        }
        // MC-1304 - attach geo location and ip
        if (_config.options.agent_address) {
            message.agent_address = _config.options.agent_address;
        }

        if (message.components) {
            // optionally populate input + output queues
            Object.keys(message.components).forEach(function (o) {
                if (message.components[o].inputQueueName === 'uploadMessageQueue') {
                    message.components[o].inputQueueName = that.uploadMessageQueue;
                }

                if (message.components[o].inputQueueName === 'downloadMessageQueue') {
                    message.components[o].inputQueueName = that.downloadMessageQueue;
                }
            });
        }

        try {
            sqs.sendMessage({
                QueueUrl:    _config.instance.inputQueueURL,
                MessageBody: JSON.stringify(message)
            }, function (sendMessageError) {
                if (sendMessageError) {
                    that.log.warn("error sending message " + String(sendMessageError));
                    return successCb("sendmessage error"); // close the queue job
                }
                that._uploadedFiles.push(item); // flag as uploaded
                that._moveUploadedFile(item, successCb);
            });
        } catch (sendMessageException) {
            that.log.error("exception sending message " + String(sendMessageException));
            if (successCb) {
                successCb("sendmessage exception");
            } // close the queue job
        }
    },

    _moveUploadedFile: function (fileName, successCb) {

        var that = this, folderTo, fileTo, fileFrom, streamErrorFlag, readStream, writeStream, renameComplete;

        if (_config.options.uploadedFolder && _config.options.uploadedFolder !== '+uploaded') {
            folderTo =  _config.options.uploadedFolder;
        } else {
            folderTo = path.join(_config.options.inputFolder, "uploaded");
        }
        fileFrom = path.join(_config.options.inputFolder, fileName);
        fileTo = path.join(folderTo, fileName);

        function done() {
            if (!renameComplete) {
                that._uploadedFiles[fileName] = true;
                renameComplete = true;
                successCb();
            }
        }

        function statFile(fileName) {
            fs.stat(fileName, function fsStatCallback(err, stats) {
                if (err) {
                    that.log.warn("failed to fs.stat uploaded file: " + err);
                } else if (stats && stats.size) {
                    that._stats.upload.totalSize += stats.size;
                }
            });
        }

        function deleteFile(outputFile) {
            try {
                fs.unlink(outputFile, function (err) {
                    if (err) {
                        that._uploadedFiles[fileName] = true; // flag as uploaded
                        that.log.warn("failed to remove uploaded file " + fileFrom + " : " + err);
                    }
                });
            } catch (unlinkException) {
                that.log.warn("failed to remove file. unlinkException: " + outputFile + ' ' + String(unlinkException));
            }
        }

        function onError(err) {
            done(); // close the queue job
            if (err && !streamErrorFlag) {
                that.log.error("_moveUploadedFile error: " + err);
                streamErrorFlag = true; // flag as uploaded
                try {
                    statFile(fileFrom);
                    writeStream.close();
                    if (readStream.destroy) {
                        that.log.error("destroying upload readstream for " + fileName);
                        readStream.destroy();
                    }
                    deleteFile(fileTo);
                } catch (e) {
                    that.log.error("error removing uploaded target file " + fileTo + " : " + e);
                }
            }
        }

        mkdirp(folderTo, function (mkdirException) {
            if (mkdirException && !String(mkdirException).match(/EEXIST/)) {
                that.log.error("mkdirpException " + String(mkdirException));
                streamErrorFlag = true; // flag as uploaded
                statFile(fileFrom);
                done();
            } else {
                // MC-2389 - fs.rename can cause "EXDEV, Cross-device link" exception
                // Ref: http://stackoverflow.com/questions/4568689/how-do-i-move-file-a-to-a-different-partition-or-device-in-node-js

                try {
                    readStream = fs.createReadStream(fileFrom);
                    writeStream = fs.createWriteStream(fileTo);

                    writeStream.on("error", function (writeStreamError) {
                        onError("uploaded file writeStream error: " + writeStreamError);
                    });

                    readStream
                        .on('close', function () {
                            if (!streamErrorFlag) {
                                // don't delete if there's an error
                                deleteFile(fileFrom);
                            }
                            statFile(fileTo);
                            that.log.info("marked " + fileFrom + " as done");
                            done(); // close the queue job // SUCCESS
                        })
                        .on("error", function (readStreamError) {
                            onError("failed to rename uploaded file. " + readStreamError);
                        })
                        .pipe(writeStream);

                } catch (renameStreamException) {
                    onError("failed to move uploaded file into upload folder: " + String(renameStreamException));
                }
            }
        });
    },

    uploadComplete: function (objectId) {
        var that = this;
        return new Promise(function (resolve, reject) {
            _cnf.log.info("uploaded " + item + " to " + objectId);

            if (_cnf.instance.inputQueueURL) {
                return that.sendMessage(_cnf.sqs, objectId, item, successCb);
            }

            _cnf.discoverQueue(_cnf.sqs, _cnf.instance.inputQueueName,
                function (queueURL) {
                    _cnf.instance.inputQueueURL = queueURL;
                    return that.sendMessage(sqs, objectId, item, successCb);
                },
                function (discoverQueueErr) {
                    _cnf.log.warn(discoverQueueErr);
                    successCb(discoverQueueErr);
                });
        });
    },

    uploadHandler: function () {
        /** open readStream and pipe to S3.upload */
        return new Promise(function (resolve, reject) {

            var rs,
                fileId   = path.join(_cnf.options.inputFolder, _cnf.file),
                objectId = _cnf.instance.bucketFolder + "/" + (_cnf.instance.inputQueueName ? _cnf.instance.inputQueueName + "/" : "") + item;

            try {
                rs = fs.createReadStream(fileId);
            } catch (createReadStreamException) {
                return done("createReadStreamException exception" + String(createReadStreamException)); // close the queue job
            }

            function destroy() {
                if (rs.destroy) {
                    rs.destroy();
                }
            }

            rs.on("error", function (readStreamError) {
                rs.close();
                if (String(readStreamError).match(/ENOENT/)) {
                    // fs.watch probably fired for something which just moved - don't tally as an error. "fs.exists is an antipattern" my arse
                    return reject("ENOENT");
                }

                _cnf.log.warn("error in upload readstream: " + readStreamError);
                // successCb("readstream error"); successCb will be caught by the try catch below
                // close the queue job
            });

            rs.on("open", function () {
                var params, options;

                params   = {
                    Bucket: _config.instance.bucket,
                    Key:    objectId,
                    Body:   rs
                };
                options  = { partSize: 10 * 1024 * 1024, queueSize: 1};

                _cnf.s3.upload(params, options, function (uploadStreamErr) {
                    if (uploadStreamErr) {
                        _cnf.log.warn("uploadStreamError " + String(uploadStreamErr));
                        reject("uploadStreamError " + String(uploadStreamErr));
                    }
                    resolve(objectId);
                    //that.uploadComplete(objectId, item, done);
                    destroy();
                });
            });

            rs.on('end', destroy);
        });
    }
};

module.exports = uploadWorker;