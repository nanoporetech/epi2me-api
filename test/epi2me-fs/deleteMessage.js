import assert from 'assert';
import sinon from 'sinon';
import { merge } from 'lodash';
import AWS from 'aws-sdk';
import { expect } from 'chai';
import { syncify } from '../../test-helpers/syncify';
import { EPI2ME_FS as EPI2ME } from '../../src/epi2me-fs';

describe('epi2me.deleteMessage', () => {
  const clientFactory = (opts) => {
    const client = new EPI2ME({
      url: 'https://epi2me-test.local',
      log: {
        debug: sinon.stub(),
        info: sinon.stub(),
        warn: sinon.stub(),
        error: sinon.stub(),
        critical: sinon.stub(),
      },
      ...opts,
    });
    client.config.instance.outputQueueName = "example output queue";
    return client;
  }

  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });
  afterEach(() => {
    clock.restore();
  });

  it('should invoke discoverqueue with callbacks', async () => {
    const client = clientFactory();
    client.config.instance.outputQueueName = 'my-output-queue';

    const sqs = new AWS.SQS();
    const sessionedSQS = sinon.stub(client, 'sessionedSQS').callsFake(
      () =>
        // don't do any portal sessioning
        sqs,
    );
    const discoverQueue = sinon.stub(client, 'discoverQueue').resolves();
    sinon.stub(sqs, 'deleteMessage').callsFake(() => ({
      promise: () => Promise.resolve(),
    }));

    try {
      await client.deleteMessage({
        ReceiptHandle: 'test message',
      });
    } catch (error) {
      assert.fail(error);
    }

    assert(sessionedSQS.calledOnce);
    assert(discoverQueue.calledOnce);
    assert.equal(discoverQueue.lastCall.args[0], 'my-output-queue', 'queue name passed');
  });

  it('should invoke sqs.deleteMessage without error', async () => {
    const client = clientFactory();
    const sqs = new AWS.SQS();
    sinon.stub(client, 'sessionedSQS').callsFake(
      () =>
        // don't do any portal sessioning
        sqs,
    );

    sinon.stub(client, 'discoverQueue').resolves('http://my-output-queue.eu-test-1.aws.com');
    const deleteMessage = sinon.stub(sqs, 'deleteMessage').callsFake(() => ({
      promise: () => Promise.resolve(),
    }));

    try {
      await client.deleteMessage({
        message: 'test message',
        ReceiptHandle: 'abcd-1234',
      });
    } catch (error) {
      assert.fail(error);
    }

    assert(deleteMessage.calledOnce, 'sqs.deleteMessage invoked');
    assert.deepEqual(deleteMessage.args[0][0], {
      QueueUrl: 'http://my-output-queue.eu-test-1.aws.com',
      ReceiptHandle: 'abcd-1234',
    });
  });

  it('should invoke sqs.deleteMessage with error', async () => {
    const client = clientFactory();
    const sqs = new AWS.SQS();
    sinon.stub(client, 'sessionedSQS').callsFake(
      () =>
        // don't do any portal sessioning
        sqs,
    );

    sinon.stub(client, 'discoverQueue').resolves('http://my-output-queue.eu-test-1.aws.com');
    sinon.stub(sqs, 'deleteMessage').callsFake(() => ({
      promise: () => Promise.reject(new Error('deleteMessage failed')),
    }));

    try {
      await client.deleteMessage({
        message: 'test message',
        ReceiptHandle: 'abcd-1234',
      });
    } catch (error) {
      assert.ok(String(error).match(/deleteMessage failed/), 'thrown error message');
    }
    //    console.log(client.log.debug.args);
    // assert.ok(client.log.error.args[0][0].match(/deleteMessage failed/), 'error message logged');
  });

  it('should invoke sqs.deleteMessage with exception', async () => {
    const client = clientFactory();
    const sqs = new AWS.SQS();
    sinon.stub(client, 'sessionedSQS').callsFake(
      () =>
        // don't do any portal sessioning
        sqs,
    );

    sinon.stub(client, 'discoverQueue').resolves('http://my-output-queue.eu-test-1.aws.com');
    sinon.stub(sqs, 'deleteMessage').throws(new Error('deleteMessage failed'));

    const testMessage = {
      message: 'test message',
      ReceiptHandle: 'abcd-1234',
    };

    const syncResult = await syncify(() => client.deleteMessage(testMessage));

    expect(syncResult).to.throw('deleteMessage error\n\tdeleteMessage failed');
    expect(client.log.error.firstCall.firstArg).equals('deleteMessage error\n\tdeleteMessage failed');
  });

  it('should invoke sqs.deleteMessage with discovery failure and counter set', async () => {
    const client = clientFactory();
    const sqs = new AWS.SQS();
    sinon.stub(client, 'sessionedSQS').callsFake(
      () =>
        // don't do any portal sessioning
        sqs,
    );

    sinon.stub(client, 'discoverQueue').rejects(new Error('could not connect'));
    const deleteMessage = sinon.stub();

    const testMessage = {
      message: 'test message',
      ReceiptHandle: 'abcd-1234',
    };

    const syncResult = await syncify(() => client.deleteMessage(testMessage));

    expect(syncResult).to.throw('deleteMessage error\n\tcould not connect');
    expect(deleteMessage.notCalled).to.be.true;
    expect(client.states.download.failure['deleteMessage error\n\tcould not connect']).equals(1);
  });

  it('should invoke sqs.deleteMessage with discovery failure and counter increment', async () => {
    const client = clientFactory();
    const sqs = new AWS.SQS();
    sinon.stub(client, 'sessionedSQS').callsFake(
      () =>
        // don't do any portal sessioning
        sqs,
    );

    sinon.stub(client, 'discoverQueue').rejects(new Error('could not connect'));
    const deleteMessage = sinon.stub();

    client.states.download.failure = {
      'deleteMessage error\n\tcould not connect': 7,
    };

    const testMessage = {
      message: 'test message',
      ReceiptHandle: 'abcd-1234',
    };

    const syncResult = await syncify(() => client.deleteMessage(testMessage));

    expect(syncResult).to.throw('deleteMessage error\n\tcould not connect');
    expect(deleteMessage.notCalled).to.be.true;
    expect(client.states.download.failure['deleteMessage error\n\tcould not connect']).equals(8);
  });
});
