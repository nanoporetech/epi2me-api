import assert    from "assert";
import sinon     from "sinon";
import { merge } from "lodash";
import EPI2ME    from "../../lib/epi2me";

describe('epi2me.discoverQueue', () => {

    const clientFactory = (opts) => {
	return new EPI2ME(merge({
	    url: "https://epi2me-test.local",
	    log: {
		debug: sinon.stub(),
		info:  sinon.stub(),
		warn:  sinon.stub(),
		error: sinon.stub(),
	    }
	}, opts));
    };

    it('discovers successfully', async () => {
        let client = clientFactory();

	let sqs = {
	    getQueueUrl: sinon.fake((opts, callback) => {
		assert.equal(opts.QueueName, "my_queue", "sqs getqueueurl for expected queue");
		callback(null, {QueueUrl: "https://my.cloud/queues/my_queue"});
	    }),
	};

	let data;
	try {
	    data = await client
		.discoverQueue(sqs, 'my_queue');
	} catch (error) {
	    assert.fail(error);
	}

	assert.equal(data, "https://my.cloud/queues/my_queue", "success callback fired with queue url");
    });

    it('discovers with cache hit', async () => {
        let client = clientFactory();
	client.config.instance._discoverQueueCache["my_queue"] = "https://my.cloud/queues/my_queue";

	let sqs = {
	    getQueueUrl: sinon.fake((opts, callback) => {
		assert.equal(opts.QueueName, "my_queue", "sqs getqueueurl for expected queue");
		callback(null, {QueueUrl: "https://my.cloud/queues/my_queue"});
	    }),
	};

	let data;
	try {
	    data = await client
		.discoverQueue(sqs, 'my_queue');
	} catch (error) {
	    assert.fail(error);
	}

	assert.equal(data, "https://my.cloud/queues/my_queue", "success callback fired with queue url");
	sinon.assert.notCalled(sqs.getQueueUrl); // no need to run a real query
    });

    it('discovers badly', async () => {
        let client = clientFactory();

	let sqs = {
	    getQueueUrl: sinon.fake((opts, callback) => {
		assert.equal(opts.QueueName, "my_queue", "sqs getqueueurl for expected queue");
		callback(null, {xQueueUrl: "https://my.cloud/queues/my_queue"});
	    }),
	};

	try {
	    await client
		.discoverQueue(sqs, 'my_queue');
	    assert.fail("unexpected success");
	} catch (error) {
	    assert.ok(error.match(/getqueueurl failure/), "failure callback fired with message");
	};
    });

    it('fails to discover', async () => {
        let client = clientFactory();

	let sqs = {
	    getQueueUrl: sinon.fake((opts, callback) => {
		assert.equal(opts.QueueName, "my_queue", "sqs getqueueurl for expected queue");
		callback(new Error("no such queue"));
	    }),
	};

	try {
	    await client
		.discoverQueue(sqs, 'my_queue');
	    assert.fail("unexpected success");
	} catch (error) {
	    assert.ok(error.match(/getqueueurl error/), "failure callback fired with message");
	};
    });

    it('fails to discover with proxy set', async () => {
        let client = clientFactory({proxy:"https://my.proxy:3128/"});

	let sqs = {
	    getQueueUrl: sinon.fake((opts, callback) => {
		assert.equal(opts.QueueName, "my_queue", "sqs getqueueurl for expected queue");
		callback(new Error("Unexpected close tag"));
	    }),
	};

	try {
	    await client
		.discoverQueue(sqs, 'my_queue');
	    assert.fail("unexpected success");

	} catch (error) {
	    assert.ok(error.match(/getqueueurl error/), "failure callback fired with message");
	}

	assert.ok(client.log.warn.args[0][0].match(/proxy compatibility/), "check your proxy warning emitted");
    });
});
