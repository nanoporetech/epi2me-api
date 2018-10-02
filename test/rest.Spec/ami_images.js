import REST from "../../lib/rest";

const sinon  = require("sinon");
const assert = require("assert");
const bunyan = require("bunyan");

describe("rest.ami_images", () => {
    it("must invoke list with null query", () => {
        let ringbuf    = new bunyan.RingBuffer({ limit: 100 });
        let log        = bunyan.createLogger({ name: "log", stream: ringbuf });
        let stub = sinon.stub(REST.prototype, "_list").callsFake((uri, cb) => {
            assert.equal(uri, "ami_image", "default uri");
            cb();
        });
        let fake = sinon.fake();
        let rest = new REST({log: log});
        assert.doesNotThrow(() => {
            rest.ami_images(fake);
        });
        assert(fake.calledOnce, "callback invoked");
        stub.restore();
    });

    it("must bail when local", () => {
        let ringbuf    = new bunyan.RingBuffer({ limit: 100 });
        let log        = bunyan.createLogger({ name: "log", stream: ringbuf });
        let stub = sinon.stub(REST.prototype, "_list").callsFake((uri, cb) => {
            assert.equal(uri, "ami_image", "default uri");
            cb();
        });
        let fake = sinon.fake();
        let rest = new REST({log: log, local: true});
        assert.doesNotThrow(() => {
            rest.ami_images(fake);
        });
        assert(fake.calledOnce, "callback invoked");
        assert(fake.firstCall.args[0] instanceof Error);
        stub.restore();
    });
});
