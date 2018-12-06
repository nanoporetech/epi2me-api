import REST from "../../lib/rest";

const sinon  = require("sinon");
const assert = require("assert");
const bunyan = require("bunyan");

describe("rest.ami_images", () => {
    let ringbuf;
    let log;
    let stubs;
    beforeEach(() => {
	ringbuf = new bunyan.RingBuffer({ limit: 100 });
        log     = bunyan.createLogger({ name: "log", stream: ringbuf });
	stubs   = [];
    });

    afterEach(() => {
	stubs.forEach((s) => { s.restore(); });
    });

    it("must invoke list with null query", () => {
        let fake = sinon.fake();
        let rest = new REST({log: log});
        let stub = sinon.stub(rest, "_list").callsFake((uri, cb) => {
            assert.equal(uri, "ami_image", "default uri");
            cb();
        });
	stubs.push(stub);
        assert.doesNotThrow(() => {
            rest.ami_images(fake);
        });
        assert(fake.calledOnce, "callback invoked");
    });

    it("must bail when local", () => {
        let fake = sinon.fake();
        let rest = new REST({log: log, local: true});
        let stub = sinon.stub(rest, "_list").callsFake((uri, cb) => {
            assert.equal(uri, "ami_image", "default uri");
            cb();
        });
	stubs.push(stub);
        assert.doesNotThrow(() => {
            rest.ami_images(fake);
        });
        assert(fake.calledOnce, "callback invoked");
        assert(fake.firstCall.args[0] instanceof Error);
    });
});
