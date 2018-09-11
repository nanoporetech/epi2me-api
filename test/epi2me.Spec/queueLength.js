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
proxyquire('../../build/lib/utils', {
    'request' : requestProxy
});
var EPI2ME = proxyquire('../../build/lib/epi2me', {
    'aws-sdk'     : awsProxy,
    'fs-extra' : fsProxy,
    'mkdirp'      : mkdirpProxy
}).default;

describe('.queueLength method', () => {
    var client, queueUrl = 'queueUrl';
    beforeEach(() => {
        client = new EPI2ME({});
        sinon.stub(client.log, "warn");
        sinon.stub(client.log, "error");
        sinon.stub(client.log, "info");
    });

    it('should return sqs queue', function (done) {
        client.sessionedSQS = function (cb) {
            return {
                getQueueAttributes: function (opts, cb) {
                    assert.equal(opts.QueueUrl, queueUrl);
                    cb(null, { Attributes: { ApproximateNumberOfMessages: 10 } });
                    assert(completeCb.calledOnce);
                    assert.equal(completeCb.lastCall.args[0], 10);
                    cb("Error");
                    assert(client.log.warn.calledOnce);
                    assert(completeCb.calledTwice);
                    done();
                }
            };
        };

        var completeCb = sinon.spy();
        client.queueLength(queueUrl, completeCb);
    });

    it('should handle sessionedSQS errors', () => {
        client.sessionedSQS = () => {
            return {
                getQueueAttributes: function (opts, cb) {
                    throw Error;
                }
            };
        };

        var completeCb = sinon.spy();
        client.queueLength(queueUrl, completeCb);
        // assert(completeCb.calledTwice, 'call callback even for errors');
        assert.equal(completeCb.firstCall.args[0], undefined);
        // assert.equal(completeCb.secondCall.args[0], undefined);
        assert(client.log.error.calledOnce);
        assert.doesNotThrow(() => {
            client.queueLength(queueUrl);
            client.queueLength();
        }, 'Error');
    });
});
