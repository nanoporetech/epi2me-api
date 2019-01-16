import assert from "assert";
import sinon from "sinon";
import path from "path";
import tmp from "tmp";
import fs from "fs-extra";
import queue from "queue-async";
import EPI2ME from "../../lib/epi2me";

describe('session fetchInstanceToken method', () => {


    let client;
    beforeEach(() => {
        client = new EPI2ME({
            log: {
                info:  sinon.stub(),
                warn:  sinon.stub(),
                error: sinon.stub(),
            },
        });
    });

    it("should call if sts_expiration unset and initialise sessionQueue", () => {
        let stub = sinon.stub(client, "fetchInstanceToken").callsFake();

        client.session();
        assert(stub.calledOnce);
    });

    it("should call if sts_expiration unset", () => {
        let stub = sinon.stub(client, "fetchInstanceToken").callsFake();
        client.sessionQueue = queue(1);
        client.session();
        assert(stub.calledOnce);
    });

    it("should call if sts_expiration expired", () => {
        let stub = sinon.stub(client, "fetchInstanceToken").callsFake();
        client._stats.sts_expiration = 1;
        client.session();
        assert(stub.calledOnce);
    });

    it("should not call if sts_expiration in the future", () => {
        let stub = sinon.stub(client, "fetchInstanceToken").callsFake();
        client._stats.sts_expiration = 1000 + new Date();
        client.session();
        assert(stub.notCalled);
    });

    it("should fire callback if sts_expiration in the future", () => {
        let stub  = sinon.stub(client, "fetchInstanceToken").callsFake();
        let stub2 = sinon.fake();
        client._stats.sts_expiration = 1000 + new Date();
        client.session(stub2);
        assert(stub.notCalled);
        assert(stub2.calledOnce);
    });

    it("should fire callback if sts_expiration expired", () => {
        let stub  = sinon.stub(client, "fetchInstanceToken").callsFake((cb) => { cb(); });
        let stub2 = sinon.fake();
        client._stats.sts_expiration = 1;
        client.session(stub2);
        assert(stub.calledOnce, "fetchInstanceToken called");
        assert(stub2.calledOnce);
    });

    it("should fire callback if sts_expiration expired, passing error", () => {
        let stub  = sinon.stub(client, "fetchInstanceToken").callsFake((cb) => { cb(new Error("fetchInstanceToken failed")); });
        let stub2 = sinon.fake();
        client._stats.sts_expiration = 1;
        client.session(stub2);
        assert(stub.calledOnce, "fetchInstanceToken called");
        assert(stub2.calledOnce);
        assert.equal(stub2.args[0][0].toString(), "Error: fetchInstanceToken failed");
    });
});
