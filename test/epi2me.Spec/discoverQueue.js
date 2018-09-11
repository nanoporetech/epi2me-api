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
        EPI2ME = proxyquire('../../lib/epi2me.js', {
            'aws-sdk'     : awsProxy,
            'fs-extra' : fsProxy,
            'mkdirp'      : mkdirpProxy
        });
    });

    describe('metrichor api', function(){

        describe('.discoverQueue method', () => {
            var client, queueUrl = 'queueUrl';
            beforeEach(() => {
                client = new EPI2ME({});
                sinon.stub(client.log, "warn");
                sinon.stub(client.log, "error");
                sinon.stub(client.log, "info");
            });

            /*it('should return sqs queue', () => {
             var sqs = {
             getQueueUrl: function (opts, cb) {
             cb("Error");
             assert(client.log.warn.calledOnce);
             cb(null, { QueueUrl: "result" });
             assert(client.log.warn.calledOnce);
             throw Error
             }
             };
             var successCb = sinon.spy();
             var faliureCb = sinon.spy();
             client.discoverQueue(sqs, 'queueName', successCb, faliureCb);
             assert.equal(successCb.firstCall.args[0], "result");
             assert.equal(faliureCb.firstCall.args[0], "getqueueurl error");
             assert.equal(faliureCb.lastCall.args[0], "getqueueurl exception");
             client.discoverQueue(sqs, 'queueName', successCb, faliureCb);
             });*/

            it('should handle sessionedSQS errors', () => {
                sinon.stub(client, "sessionedSQS");
                var completeCb = sinon.spy();
                client.queueLength(queueUrl, completeCb);
                //assert(completeCb.calledTwice, 'call callback even for errors');
                assert.equal(completeCb.firstCall.args[0], undefined);
                //assert.equal(completeCb.secondCall.args[0], undefined);
                assert(client.log.error.calledOnce);
                assert.doesNotThrow(() => {
                    client.queueLength(queueUrl);
                    client.queueLength();
                }, 'Error');
            });
        });
    });
});
