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

describe('uploadComplete', () => {
    var client;

    beforeEach(() => {
        client = new EPI2ME();
        sinon.stub(client, "sessionedSQS");
        sinon.stub(client.log, "warn");
        sinon.stub(client.log, "info");
        sinon.stub(client, "sendMessage");
        sinon.stub(client, "discoverQueue");
    });

    it('should handle error', () => {
        var errorCallback;
        client.discoverQueue = function (sqs, queueName, cb, errorCb) {
            cb();
            errorCb();
        };
        client.uploadComplete(null, 'item', () => {});
    });
});
