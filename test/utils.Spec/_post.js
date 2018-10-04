import utils from "../../lib/utils";

const assert  = require("assert");
const sinon   = require("sinon");
const request = require("request");

describe('utils._post', () => {
    it("should invoke post", () => {
        let req  = {};
        let stub1 = sinon.stub(request, "post").callsFake((req, cb) => {
            assert.deepEqual(req, {
                uri: "http://epi2me.test/entity",
		body: "{\"id_entity\":123,\"name\":\"test entity\"}",
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

        utils._post("entity", {
            "id_entity": 123,
            "name": "test entity"
        }, {
            apikey: "foo",
            url: "http://epi2me.test"
        }, (err, data) => {
            assert.equal(err, "one");
            assert.equal(data, "three");
        });
        stub1.restore();
        stub2.restore();
    });

    it("should invoke post with legacy form params", () => {
        let req  = {};
        let stub1 = sinon.stub(request, "post").callsFake((req, cb) => {
            assert.deepEqual(req, {
                uri: "http://epi2me.test/entity",
		body: "{\"id_entity\":123,\"name\":\"test entity\"}",
		form: {json:"{\"id_entity\":123,\"name\":\"test entity\"}", id_entity: 123, name: "test entity"},
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

        utils._post("entity", {
            "id_entity": 123,
            "name": "test entity"
        }, {
            apikey: "foo",
            url: "http://epi2me.test",
	    legacy_form: true
        }, (err, data) => {
            assert.equal(err, "one");
            assert.equal(data, "three");
        });
        stub1.restore();
        stub2.restore();
    });

    it("should invoke post with proxy", () => {
        let req  = {};
        let stub1 = sinon.stub(request, "post").callsFake((req, cb) => {
            assert.deepEqual(req, {
                uri: "http://epi2me.test/entity",
                body: "{\"id_entity\":123,\"name\":\"test entity\"}",
                gzip: true,
                proxy: "http://proxy.internal:3128/",
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

        utils._post("entity", {
            "id_entity": 123,
            "name": "test entity"
        }, {
            apikey: "foo",
            url: "http://epi2me.test",
            proxy: "http://proxy.internal:3128/"
        }, (err, data) => {
            assert.equal(err, "one");
            assert.equal(data, "three");
        });
        stub1.restore();
        stub2.restore();
    });
});
