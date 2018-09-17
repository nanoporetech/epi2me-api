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

        describe('.receiveMessages method', () => {
            // MC-2068 - Load messages once all jobs are done
            var client;

            beforeEach(() => {
                client = new EPI2ME({});
                client.processMessage = function (msg, queueCb) {
                    setTimeout(queueCb, 1);
                };
                client.downloadWorkerPool = queue(10);
                sinon.stub(client.log, "warn");
                sinon.stub(client.log, "info");
            });

            it('should handle error and log warning', () => {
                client.receiveMessages('Error Message');
                assert(client.log.warn.calledOnce);
            });

            it('should ignore empty message', () => {
                client.receiveMessages(null, {});
                assert(client.log.info.calledWith("complete (empty)"));
            });

            it('should queue and process download messages using downloadWorkerPool', function (done) {
                client.receiveMessages(null, { Messages: [1, 2, 3, 4] }, () => {
                    assert.equal(client.downloadWorkerPool.remaining(), 4);
                });
                client.downloadWorkerPool.await(() => {
                    assert.equal(client.downloadWorkerPool.remaining(), 0);
                    done();
                });
            });
        });
    });
});
