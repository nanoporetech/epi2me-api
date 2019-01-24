/* global describe, it, beforeEach, afterEach */
import assert  from "assert";
import sinon   from "sinon";
import request from "request";
import utils   from "../../src/utils";

describe("utils._post", () => {
    let stub1, stub2;

    beforeEach(() => {
        stub1 = sinon.stub(request, "post").callsFake((req, cb) => {
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

    it("should invoke post", () => {
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

        assert.deepEqual(stub1.args[0][0], {
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
    });

    it("should invoke post with legacy form params", () => {
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

        assert.deepEqual(stub1.args[0][0], {
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
            },
	});
    });

    it("should invoke post with proxy", () => {
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

        assert.deepEqual(stub1.args[0][0], {
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
            }
	});
    });
});
