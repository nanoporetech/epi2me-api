import REST      from "../../lib/rest";
import sinon     from "sinon";
import assert    from "assert";
import bunyan    from "bunyan";
import tmp       from "tmp";

describe("rest.dataset", () => {
    let rest, log, ringbuf;

    beforeEach(() => {
	ringbuf = new bunyan.RingBuffer({ limit: 100 });
        log     = bunyan.createLogger({ name: "log", stream: ringbuf });
	rest    = new REST({
	    log:   log,
	    local: true,
	    url:   tmp.dirSync().name,
	});
    });

    it("must invoke read with id", () => {
	rest.options.local = false;
	sinon.stub(rest, "_read").callsFake((type, id, cb) => {
	    assert.equal(type, "dataset", "type passed");
	    assert.equal(id, 27, "id passed");
	    cb();
	});
	let fake = sinon.fake();

	assert.doesNotThrow(() => {
	    rest.dataset(27, fake);
	});
	assert(fake.calledOnce, "callback invoked");
    });

    it("must filter local datasets", () => {
	rest.options.local = true;

	sinon.stub(rest, "datasets").callsFake((cb) => {
	    return cb(null, [
		{id_dataset: 1, name: "one"},
		{id_dataset: 27, name: "twenty seven"}
	    ]);
	});

	let fake = sinon.fake();

	assert.doesNotThrow(() => {
	    rest.dataset(27, fake);
	});

	assert(fake.calledOnce, "callback invoked");
	assert.deepEqual(fake.args[0], [
	    null,
	    {id_dataset: 27, name: "twenty seven"}
	], "callback with dataset object");
    });
});
