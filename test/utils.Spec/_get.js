import utils from "../../lib/utils";

const assert  = require("assert");
const sinon   = require("sinon");
const request = require("request");

describe('utils._headers', () => {
    it("should invoke get", () => {
	let req  = {};
	let stub1 = sinon.stub(request, "get").callsFake((req, cb) => {
	    assert.deepEqual(req, {
		uri: "http://epi2me.test/entity/123",
		gzip: true,
		headers: {
		    "Accept": "application/json",
		    "Content-Type": "application/json",
		    "X-EPI2ME-ApiKey": "foo",
		    "X-EPI2ME-Client": "",
		    "X-EPI2ME-Version": "0"
		}});
	    cb("one", "two", "three");
	});
	let stub2 = sinon.stub(utils, "_responsehandler").callsFake((err, res, body, cb) => {
	    assert.equal(err, "one");
	    assert.equal(res, "two");
	    assert.equal(body, "three");
	});

	utils._get("entity/123", {
	    apikey: "foo",
	    url: "http://epi2me.test"
	}, (err, data) => {
	    assert.equal(err, "one");
	    assert.equal(data, "three");
	});
	stub1.restore();
	stub2.restore();
    });

    it("should invoke get without url mangling", () => {
	let req  = {};
	let stub1 = sinon.stub(request, "get").callsFake((req, cb) => {
	    assert.deepEqual(req, {
		uri: "https://epi2me.internal/entity/123",
		gzip: true,
		headers: {
		    "Accept": "application/json",
		    "Content-Type": "application/json",
		    "X-EPI2ME-ApiKey": "foo",
		    "X-EPI2ME-Client": "",
		    "X-EPI2ME-Version": "0"
		}});
	    cb("one", "two", "three");
	});
	let stub2 = sinon.stub(utils, "_responsehandler").callsFake((err, res, body, cb) => {
	    assert.equal(err, "one");
	    assert.equal(res, "two");
	    assert.equal(body, "three");
	});

	utils._get("https://epi2me.internal/entity/123", {
	    skip_url_mangle: true,
	    apikey: "foo",
	    url: "http://epi2me.test"
	}, (err, data) => {
	    assert.equal(err, "one");
	    assert.equal(data, "three");
	});
	stub1.restore();
	stub2.restore();
    });

    it("should invoke get with proxy", () => {
	let req  = {};
	let stub1 = sinon.stub(request, "get").callsFake((req, cb) => {
	    assert.deepEqual(req, {
		uri: "http://epi2me.test/entity/123",
		proxy: "http://proxy.internal:3128/",
		gzip: true,
		headers: {
		    "Accept": "application/json",
		    "Content-Type": "application/json",
		    "X-EPI2ME-ApiKey": "foo",
		    "X-EPI2ME-Client": "",
		    "X-EPI2ME-Version": "0"
		}});
	    cb("one", "two", "three");
	});
	let stub2 = sinon.stub(utils, "_responsehandler").callsFake((err, res, body, cb) => {
	    assert.equal(err, "one");
	    assert.equal(res, "two");
	    assert.equal(body, "three");
	});

	utils._get("entity/123", {
	    proxy: "http://proxy.internal:3128/",
	    apikey: "foo",
	    url: "http://epi2me.test"
	}, (err, data) => {
	    assert.equal(err, "one");
	    assert.equal(data, "three");
	});
	stub1.restore();
	stub2.restore();
    });
});
