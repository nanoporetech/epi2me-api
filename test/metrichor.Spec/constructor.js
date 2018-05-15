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
        EPI2ME = proxyquire('../../lib/metrichor.js', {
            'aws-sdk'     : awsProxy,
            'graceful-fs' : fsProxy,
            'mkdirp'      : mkdirpProxy
        });
    });

    describe('metrichor constructor', () => {
        it('should create a metrichor object with defaults and allow overwriting', () => {
            var client;
            assert.doesNotThrow(() => {
		client = new EPI2ME();
            }, Error, 'client obtained');

            assert.equal(client.url(), 'https://epi2me.nanoporetech.com', 'default url');
            assert.equal(client.apikey(), null, 'default apikey');
        });

        it('should create a metrichor object using the parsed options string', () => {
	    var client;
            assert.doesNotThrow(() => {
                client = new EPI2ME(JSON.stringify({
                    url: "test_url"
                }));
            }, Error, 'client obtained');
            assert.equal(client.url(), 'test_url', 'custom url');
        });

        it('should create a metrichor object with log functions', () => {
            var client,
                customLogging = {
                    debug: () => {},
                    info:  () => {},
                    warn:  () => {},
                    error: () => {}
                };

            // Default
            assert.doesNotThrow(() => {
                client = new EPI2ME();
            }, Error, 'client obtained');

            // Custom logging

            assert.doesNotThrow(() => {
                client = new EPI2ME({
                    log: customLogging
                });
                delete requestProxy.get;
            }, Error, 'client obtained');
            assert.deepEqual(client.log, customLogging, 'custom logging');

            // Validating custom logging
            assert.throws(() => {
                client = new EPI2ME({
                    log: {}
                });
            }, Error, 'expected log object to have "error", "info" and "warn" methods');
        });

        it('should get and overwrite config properties', () => {
            var client;
            assert.doesNotThrow(() => {
                client = new EPI2ME({
                    url: 'initial'
                });
                delete requestProxy.get;
            }, Error, 'client obtained');

            assert.equal(client.attr('url'), 'initial');
            client.attr('url', 'test');
            assert.equal(client.attr('url'), 'test');
            assert.throws(() => {
                client.attr('not_a_key', 'value')
            }, Error, 'config object does not contain property not_a_key');
        });

        it('should create a metrichor with opts', () => {
            var client;
            assert.doesNotThrow(() => {
                client = new EPI2ME({
                    url: 'https://metrichor.local:8000',
                    apikey: 'FooBar02'
                });
                delete requestProxy.get;
            }, Error, 'client obtained');
            assert.equal(client.url(), 'https://metrichor.local:8000', 'url built from constructor');
            assert.equal(client.apikey(), 'FooBar02', 'apikey built from constructor');
        });
    });
});