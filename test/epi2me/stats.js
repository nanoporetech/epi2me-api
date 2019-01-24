"use strict";
const assert = require("assert");
const sinon  = require("sinon");
const AWS    = require("aws-sdk");

import EPI2ME from "../../src/epi2me";
import REST from "../../src/rest";

describe("epi2me.stats", () => {

    it("should stat", () => {
	let client = new EPI2ME({});
	
	assert.doesNotThrow(() => {
	    let stat = client.stats();
	});
    });
    
    it("should stat a null value", () => {
	let client = new EPI2ME({});
	client._stats = {fake: {}};
	assert.doesNotThrow(() => {
	    let stat = client.stats("fake");
	    assert.deepEqual(stat, {queueLength: 0});
	});
    });
    
    it("should stat a regular value", () => {
	let client = new EPI2ME({});
	client._stats = {fake: {queueLength:10}};
	assert.doesNotThrow(() => {
	    let stat = client.stats("fake");
	    assert.deepEqual(stat, {queueLength: 10});
	});
    });
    
    it("should stat special upload behaviour", () => {
	let client = new EPI2ME({});
	client._stats = {upload: {queueLength:10}};
	assert.doesNotThrow(() => {
	    let stat = client.stats("upload");
	    assert.deepEqual(stat, {queueLength: 10});
	});
    });
    
    it("should stat special upload behaviour with upload queue", () => {
	let client = new EPI2ME({});
	client._stats = {upload: {queueLength:10, enqueued: 5, success: 7}};
	client._uploadedFiles = ["one","two","three"];
	assert.doesNotThrow(() => {
	    let stat = client.stats("upload");
	    assert.deepEqual(stat, {queueLength: 10, success: 7, enqueued: 5, total: 15});
	});
    });
});
