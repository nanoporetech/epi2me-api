/* global describe, it */

import utils from "../../lib/utils";

const assert = require("assert");
const sinon  = require("sinon");

describe("utils._headers", () => {
    it("should create empty headers if none set", () => {
        let req  = {};
        let stub = sinon.stub(utils, "_sign").callsFake();
        utils._headers(req, {user_agent: "EPI2ME Test", agent_version: "0.0.1"});
        assert.deepEqual(req.headers, {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-EPI2ME-Client": "EPI2ME Test",
            "X-EPI2ME-Version": "0.0.1"
        });
        assert(stub.calledOnce);
        stub.restore();
    });

    it("should propagate existing headers", () => {
        let req  = {headers: {"accept-language":"mt"}};
        let stub = sinon.stub(utils, "_sign").callsFake();
        utils._headers(req, {user_agent: "EPI2ME Test", agent_version: "0.0.1"});
        assert.deepEqual(req.headers, {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-EPI2ME-Client": "EPI2ME Test",
            "X-EPI2ME-Version": "0.0.1",
            "accept-language":"mt"
        });
        assert(stub.calledOnce);
        stub.restore();
    });

    it("should override default headers", () => {
        let req  = {headers: {"Accept":"application/gzip", "Accept-Encoding": "gzip"}};
        let stub = sinon.stub(utils, "_sign").callsFake();
        utils._headers(req, {user_agent: "EPI2ME Test", agent_version: "0.0.1"});
        assert.deepEqual(req.headers, {
            "Accept-Encoding": "gzip",
            "Accept": "application/gzip",
            "Content-Type": "application/json",
            "X-EPI2ME-Client": "EPI2ME Test",
            "X-EPI2ME-Version": "0.0.1"
        });
        assert(stub.calledOnce);
        stub.restore();
    });

    it("should initialise options", () => {
        let req  = {headers: {"accept-language":"mt"}};
        let stub = sinon.stub(utils, "_sign").callsFake();
        utils._headers(req);
        assert.deepEqual(req.headers, {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-EPI2ME-Client": "",
            "X-EPI2ME-Version": "0",
            "accept-language":"mt"
        });
        assert(stub.calledOnce);
        stub.restore();
    });

    it("should not sign if requested", () => {
        let req  = {headers: {"accept-language":"mt"}};
        let stub = sinon.stub(utils, "_sign").callsFake();
        utils._headers(req, {_signing: false});
        assert.deepEqual(req.headers, {
            "Accept": "application/json",
            "Content-Type": "application/json",
            "X-EPI2ME-Client": "",
            "X-EPI2ME-Version": "0",
            "accept-language":"mt"
        });
        assert(stub.notCalled);
        stub.restore();
    });
});
