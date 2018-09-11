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
var EPI2ME;

describe('Array', () => {

    beforeEach(() => {
        EPI2ME = proxyquire('../../build/lib/epi2me', {
            'aws-sdk'  : awsProxy,
            'fs-extra' : fsProxy,
            'mkdirp'   : mkdirpProxy
        }).default;
    });

    describe('metrichor api', function(){

        describe('.processMessage method', () => {
            var client;

            beforeEach(() => {
                client = new EPI2ME({downloadMode: "telemetry"});
                client.sessionedSQS = function (cb) { cb(); };
                sinon.stub(client.log, "info");
                sinon.stub(client.log, "warn");
                sinon.stub(client.log, "error");
                sinon.stub(client, "deleteMessage");
                fsProxy.createWriteStream = () => {};
                mkdirpProxy.sync = () => {};
                sinon.spy(fsProxy, 'createWriteStream');
                client.sessionedS3 = () => {};
                sinon.spy(client, 'sessionedS3');
            });

            afterEach(() => {
                delete fsProxy.createWriteStream;
                delete mkdirpProxy.sync;
            });

            it('should handle bad message json', function (done) {
                var msg = { Body: '{message: body}' };
                client.processMessage(msg, () => {
                    assert(client.deleteMessage.calledWith(msg));
                    assert(client.log.error.calledOnce);
                    done();
                });
            });

            it('should parse message json', () => {
                client.sessionedS3 = function (cb) {
                    cb('error message');
                };
                sinon.spy(client, 'sessionedS3');

                client.processMessage({
                    Body: '{"message": "body"}'
                }, () => {});
                assert(client.log.warn.calledOnce); // No path
            });
        });
    });
});
