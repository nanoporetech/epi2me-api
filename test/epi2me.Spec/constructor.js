"use strict";
const proxyquire     = require('proxyquire');
const assert         = require("assert");
const sinon          = require("sinon");

import EPI2ME from "../../lib/epi2me";

describe('epi2me', () => {

    describe('constructor', () => {
        it('should create an epi2me object with defaults and allow overwriting', () => {
            let client;
            assert.doesNotThrow(() => {
		client = new EPI2ME();
            }, Error, 'client obtained');

            assert.equal(client.url(), 'https://epi2me.nanoporetech.com', 'default url');
            assert.equal(client.apikey(), null, 'default apikey');
        });

        it('should create an epi2me object using the parsed options string', () => {
	    let client;
            assert.doesNotThrow(() => {
                client = new EPI2ME(JSON.stringify({
                    url: "test_url"
                }));
            }, Error, 'client obtained');
            assert.equal(client.url(), 'test_url', 'custom url');
        });

        it('should create an epi2me object with log functions', () => {
            let client,
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
            let client;
            assert.doesNotThrow(() => {
                client = new EPI2ME({
                    url: 'initial'
                });
            }, Error, 'client obtained');

            assert.equal(client.attr('url'), 'initial');
            client.attr('url', 'test');
            assert.equal(client.attr('url'), 'test');
            assert.throws(() => {
                client.attr('not_a_key', 'value')
            }, Error, 'config object does not contain property not_a_key');
        });

        it('should create an epi2me with opts', () => {
            let client;
            assert.doesNotThrow(() => {
                client = new EPI2ME({
                    url: 'https://epi2me.local:8000',
                    apikey: 'FooBar02'
                });
            }, Error, 'client obtained');
            assert.equal(client.url(), 'https://epi2me.local:8000', 'url built from constructor');
            assert.equal(client.apikey(), 'FooBar02', 'apikey built from constructor');
        });

        it('should create default loggers', () => {
            let client;
	    let stubs = {
		info: sinon.stub(console, "log").callsFake(), // special
		warn: sinon.stub(console, "warn").callsFake(),
		error: sinon.stub(console, "error").callsFake(),
		debug: sinon.stub(console, "debug").callsFake(),
	    };

            assert.doesNotThrow(() => {
                client = new EPI2ME({loglevel: "debug"});
		Object.keys(stubs).forEach((o) => {
		    client.log[o](`hello ${o}`);
		});
            }, Error, 'client obtained');

	    Object.keys(stubs).forEach((o) => {
		stubs[o].restore();
		console.log("ARGS", o, stubs[o].args[0]);
		assert.ok(stubs[o].args[0][0].match(`hello ${o}`), "correct log level called with message");
	    });
        });
    });
});
