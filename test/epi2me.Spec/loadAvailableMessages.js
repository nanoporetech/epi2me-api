"use strict";
const proxyquire     = require('proxyquire');
const assert         = require("assert");
const sinon          = require("sinon");
const path           = require("path");
const _              = require("lodash");
const tmp            = require('tmp');
const queue          = require('queue-async');
const fs             = require('fs');
let requestProxy   = {};
let fsProxy        = {};
let mkdirpProxy    = {};
let awsProxy       = {};
proxyquire('../../lib/utils', {
    'request' : requestProxy
});
var EPI2ME;

describe('Array', () => {

    beforeEach(() => {
        EPI2ME = proxyquire('../../lib/epi2me', {
            'aws-sdk'     : awsProxy,
            'fs-extra' : fsProxy,
            'mkdirp'      : mkdirpProxy
        }).default;
    });

    describe('metrichor api', function(){

        describe('.loadAvailableDownloadMessages method', () => {
            // MC-2068 - Load messages once all jobs are done
            var client,
                parallelism = 10,
                queueLength = 50,
                messages;

            beforeEach(() => {
		console.log(".loadAvailableDownloadMessages BEFORE");
                messages = Array.apply(null, Array(queueLength)).map(Number.prototype.valueOf, 0);
                client   = new EPI2ME({});
                client.queueLength = function (url, cb) {
                    cb(messages.length);
                };
                client.sessionedSQS = function (cb) {
                    return {
                        receiveMessage: function (opts, cb) {
                            cb(null, {
                                Messages: messages.splice(0, parallelism) // fetch 10 messages each time
                            });
                        }
                    };
                };
                client.downloadWorkerPool = queue(parallelism);
                sinon.stub(client.log, "warn");
                sinon.stub(client.log, "info");
                sinon.spy(client, "processMessage");
            });

            it('should process all messages', function (done) {
                client.discoverQueue = function (qs, queueName, successCb, failureCb) {
                    successCb("queueUrl");
                };
                client.processMessage = function (msg, queueCb) {
                    setTimeout(queueCb);
                };
                sinon.spy(client, "processMessage");
                client.downloadWorkerPool
                    .await(() => {
                        client.loadAvailableDownloadMessages();
                        if (client.downloadWorkerPool.remaining() === 0) {
                            assert.equal(messages.length, 0);
                            assert.equal(client.processMessage.callCount, queueLength);
                            done();
                        }
                    });
            });

            it('should handle discoverQueue errors', function (done) {
                client.discoverQueue = function (qs, queueName, successCb, failureCb) {
                    failureCb("ErrorType");
                };
                client.downloadWorkerPool.await(() => {
                    client.loadAvailableDownloadMessages();
                    if (client.downloadWorkerPool.remaining() === 0) done();
                });
            });
        });
    });
});
