import assert  from "assert";
import sinon   from "sinon";
import request from "request";
import utils   from "../../lib/utils";

describe('utils._get', () => {
    let stub1, stub2;

    beforeEach(() => {
	stub1 = sinon.stub(request, "get").callsFake((req, cb) => {
	    cb("one", "two", "three");
	});

	stub2 = sinon.stub(utils, "_responsehandler").callsFake((err, res, body, cb) => {
	    assert.equal(err, "one");
	    assert.equal(res, "two");
	    assert.equal(body, "three");
	});
    });

    afterEach(() => {
	stub1.restore();
	stub2.restore();
    });
    
    it("should invoke get", () => {
	utils._get("entity/123", {
	    apikey: "foo",
	    url: "http://epi2me.test"
	}, (err, data) => {
	    assert.equal(err, "one");
	    assert.equal(data, "three");
	});

	assert.deepEqual(stub1.args[0][0], {
	    uri: "http://epi2me.test/entity/123",
	    gzip: true,
	    headers: {
		"Accept": "application/json",
		"Content-Type": "application/json",
		"X-EPI2ME-ApiKey": "foo",
		"X-EPI2ME-Client": "",
		"X-EPI2ME-Version": "0"
	    }});
    });

    it("should invoke get without url mangling", () => {
	utils._get("https://epi2me.internal/entity/123", {
	    skip_url_mangle: true,
	    apikey: "foo",
	    url: "http://epi2me.test"
	}, (err, data) => {
	    assert.equal(err, "one");
	    assert.equal(data, "three");
	});

	assert.deepEqual(stub1.args[0][0], {
	    uri: "https://epi2me.internal/entity/123",
	    gzip: true,
	    headers: {
		"Accept": "application/json",
		"Content-Type": "application/json",
		"X-EPI2ME-ApiKey": "foo",
		"X-EPI2ME-Client": "",
		"X-EPI2ME-Version": "0"
	    }});
    });

    it("should invoke get with proxy", () => {
	utils._get("entity/123", {
	    proxy: "http://proxy.internal:3128/",
	    apikey: "foo",
	    url: "http://epi2me.test"
	}, (err, data) => {
	    assert.equal(err, "one");
	    assert.equal(data, "three");
	});

	assert.deepEqual(stub1.args[0][0], {
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
    });
});
