import assert    from "assert";
import sinon     from "sinon";
import { merge } from "lodash";
import AWS       from "aws-sdk";
import REST      from "../../lib/rest";
import EPI2ME    from "../../lib/epi2me";

describe("epi2me.fetchInstanceToken", () => {

    const clientFactory = (opts) => {
	return new EPI2ME(merge({
	    url: "https://epi2me-test.local",
	    log: {
		debug: sinon.stub(),
		info: sinon.stub(),
		warn: sinon.stub(),
		error: sinon.stub(),
	    }
	}, opts));
    };

    let clock;

    beforeEach(() => {
	clock = sinon.useFakeTimers();
    });
    afterEach(() => {
	clock.restore();
    });

    it("should invoke discoverqueue with callbacks", () => {
	let client = clientFactory();
	client.config.instance.outputQueueName = "my-output-queue";

	let sessionedSQS  = sinon.stub(client, "sessionedSQS").callsFake(() => { return {"sqs":"obj"} });
	let discoverQueue = sinon.stub(client, "discoverQueue");
	assert.doesNotThrow(() => {
	    client.deleteMessage({"message": "test message"});
	});
	assert(sessionedSQS.calledOnce);
	assert(discoverQueue.calledOnce);
	assert.deepEqual(discoverQueue.args[0][0], {"sqs":"obj"}, "sqs object passed");
	assert.equal(discoverQueue.args[0][1], "my-output-queue", "queue name passed");
	assert.ok(discoverQueue.args[0][2] instanceof Function, "accept callback type");
	assert.ok(discoverQueue.args[0][3] instanceof Function, "reject callback type");
    });

    it("should invoke sqs.deleteMessage without error", () => {
	let client        = clientFactory();
	let sqs           = new AWS.SQS();
	let sessionedSQS  = sinon.stub(client, "sessionedSQS").callsFake(() => { // don't do any portal sessioning
	    return sqs;
	});
	
	let discoverQueue = sinon.stub(client, "discoverQueue").callsFake((sqs, outputqueue, accept, reject) =>{
	    accept("http://my-output-queue.eu-test-1.aws.com");
	});

	let deleteMessage = sinon.stub(sqs, "deleteMessage").callsFake();

	assert.doesNotThrow(() => {
	    client.deleteMessage({"message": "test message", "ReceiptHandle": "abcd-1234"});
	});

	assert(deleteMessage.calledOnce, "sqs.deleteMessage invoked");
	assert.deepEqual(deleteMessage.args[0][0], {
	    QueueUrl: "http://my-output-queue.eu-test-1.aws.com",
	    ReceiptHandle: "abcd-1234",
	});
	assert(deleteMessage.args[0][1] instanceof Function, "failure callback passed");
    });

    it("should invoke sqs.deleteMessage with error", () => {
	let client        = clientFactory();
	let sqs           = new AWS.SQS();
	let sessionedSQS  = sinon.stub(client, "sessionedSQS").callsFake(() => { // don't do any portal sessioning
	    return sqs;
	});
	
	let discoverQueue = sinon.stub(client, "discoverQueue").callsFake((sqs, outputqueue, accept, reject) =>{
	    accept("http://my-output-queue.eu-test-1.aws.com");
	});

	let deleteMessage = sinon.stub(sqs, "deleteMessage").callsFake((details, errorCallback) => {
	    errorCallback(new Error("deleteMessage failed"));
	});

	assert.doesNotThrow(() => {
	    client.deleteMessage({"message": "test message", "ReceiptHandle": "abcd-1234"});
	});

	assert.ok(client.log.warn.args[0][0].match(/deleteMessage failed/), "error message logged");
    });

    it("should invoke sqs.deleteMessage with exception", () => {
	let client        = clientFactory();
	let sqs           = new AWS.SQS();
	let sessionedSQS  = sinon.stub(client, "sessionedSQS").callsFake(() => { // don't do any portal sessioning
	    return sqs;
	});
	
	let discoverQueue = sinon.stub(client, "discoverQueue").callsFake((sqs, outputqueue, accept, reject) =>{
	    accept("http://my-output-queue.eu-test-1.aws.com");
	});

	let deleteMessage = sinon.stub(sqs, "deleteMessage").throws(new Error("deleteMessage failed"));

	assert.doesNotThrow(() => {
	    client.deleteMessage({"message": "test message", "ReceiptHandle": "abcd-1234"});
	});

	assert.ok(client.log.error.args[0][0].match(/exception.*deleteMessage failed/), "exception message logged");
    });

    it("should invoke sqs.deleteMessage with discovery failure and counter set", () => {
	let client        = clientFactory();
	let sqs           = new AWS.SQS();
	let sessionedSQS  = sinon.stub(client, "sessionedSQS").callsFake(() => { // don't do any portal sessioning
	    return sqs;
	});
	
	let discoverQueue = sinon.stub(client, "discoverQueue").callsFake((sqs, outputqueue, accept, reject) =>{
	    reject("could not connect");
	});

	let deleteMessage = sinon.stub();

	assert.doesNotThrow(() => {
	    client.deleteMessage({"message": "test message", "ReceiptHandle": "abcd-1234"});
	});

	assert.ok(deleteMessage.notCalled, "sqs.deleteMessage is not invoked if queue discovery fails");
	assert.equal(client._stats.download.failure["could not connect"], 1, "failure type counter set");
    });

    it("should invoke sqs.deleteMessage with discovery failure and counter increment", () => {
	let client        = clientFactory();
	let sqs           = new AWS.SQS();
	let sessionedSQS  = sinon.stub(client, "sessionedSQS").callsFake(() => { // don't do any portal sessioning
	    return sqs;
	});
	
	let discoverQueue = sinon.stub(client, "discoverQueue").callsFake((sqs, outputqueue, accept, reject) =>{
	    reject("could not connect");
	});

	let deleteMessage = sinon.stub();

	client._stats.download.failure["could not connect"] = 7;

	assert.doesNotThrow(() => {
	    client.deleteMessage({"message": "test message", "ReceiptHandle": "abcd-1234"});
	});

	assert.ok(deleteMessage.notCalled, "sqs.deleteMessage is not invoked if queue discovery fails");
	assert.equal(client._stats.download.failure["could not connect"], 8, "failure type counter incremented");
    });
});
