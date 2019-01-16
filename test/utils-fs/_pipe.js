import assert  from "assert";
import sinon   from "sinon";
import tmp     from "tmp";
import fs      from "fs-extra";
import path    from "path";
import request from "request";
import {PassThrough} from "stream";
import utils   from "../../lib/utils-fs";

describe("utils-fs._pipe", () => {

    it("should pipe without progress (and with proxy)", () => {
	let cb             = sinon.fake();
	let spy            = sinon.spy(utils, "_headers");
	const mockResponse = `{"data": 123}`;
	const mockStream   = new PassThrough();

	mockStream.push(mockResponse);
	mockStream.end(); //Mark that we pushed all the data.

	//Finally keep track of how 'pipe' is going to be called
	sinon.spy(mockStream, 'pipe');

	let stub = sinon.stub(request.Request.prototype, "pipe").callsFake((stream) => {
	    return mockStream;
	});

	let outfn = path.join(tmp.dirSync().name, "magic");
	assert.doesNotThrow(() => {
	    utils._pipe("/bundle/magic",
			outfn,
			{url:"http://epi2me.local", proxy: "http://proxy.local:3128/"},
			cb);
	});
	assert.ok(utils._headers.calledOnce, "headers added");
	assert.deepEqual(utils._headers.args[0],
			 [
			     {
				 uri: "http://epi2me.local/bundle/magic",
				 gzip: true,
				 headers: {
				     "Accept-Encoding":  "gzip",
				     "Accept":           "application/gzip",
				     "Content-Type":     "application/json",
				     "X-EPI2ME-ApiKey":  undefined,
				     "X-EPI2ME-Client":  "",
				     "X-EPI2ME-Version": "0",
				 },
				 proxy: "http://proxy.local:3128/"
			     },
			     {url:"http://epi2me.local", proxy: "http://proxy.local:3128/"},
			 ]);
	//	assert.ok(cb.calledOnce, "callback fired"); // why doesn't this fire? the stream has ended...
	spy.restore();
	stub.restore();
    });

    it("should pipe with progress", async () => {
	let cb             = sinon.fake();
	let progressCb     = sinon.fake();
	let spy            = sinon.spy(utils, "_headers");
	const mockResponse = `{"data": 123}`;
	const mockStream   = new PassThrough();

	mockStream.push(mockResponse);
	mockStream.end(); //Mark that we pushed all the data.

	//Finally keep track of how 'pipe' is going to be called
	sinon.spy(mockStream, 'pipe');

	let stub = sinon.stub(request.Request.prototype, "pipe").callsFake((stream) => {
	    return mockStream;
	});

	let outfn = path.join(tmp.dirSync().name, "magic");
	assert.doesNotThrow(() => {
	    utils._pipe("/bundle/magic",
			outfn,
			{url:"http://epi2me.local"},
			cb, progressCb);
	});
	assert.ok(utils._headers.calledOnce, "headers added");
	assert.deepEqual(utils._headers.args[0],
			 [
			     {
				 uri: "http://epi2me.local/bundle/magic",
				 gzip: true,
				 headers: {
				     "Accept-Encoding":  "gzip",
				     "Accept":           "application/gzip",
				     "Content-Type":     "application/json",
				     "X-EPI2ME-ApiKey":  null,
				     "X-EPI2ME-Client":  "",
				     "X-EPI2ME-Version": "0",
				 }
			     },
			     {url:"http://epi2me.local"},
			 ]);
	// assert.ok(cb.calledOnce, "callback fired"); // why doesn't this fire? the stream has ended...
	// assert.ok(progressCb.calledOnce, "progress fired"); // why doesn't this fire? the stream has ended...
	spy.restore();
	stub.restore();
    });
});
