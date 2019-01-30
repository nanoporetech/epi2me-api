import assert from 'assert';
import sinon from 'sinon';
import { merge } from 'lodash';
import AWS from 'aws-sdk';
import REST from '../../src/rest';
import EPI2ME from '../../src/epi2me';

describe('epi2me.deleteMessage', () => {
  const clientFactory = opts =>
    new EPI2ME(
      merge(
        {
          url: 'https://epi2me-test.local',
          log: {
            debug: sinon.stub(),
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub(),
          },
        },
        opts,
      ),
    );

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

    const sessionedSQS = sinon.stub(client, 'sessionedSQS').callsFake(() => ({ sqs: 'obj' }));
    const discoverQueue = sinon.stub(client, 'discoverQueue').resolves();

    try {
      await client.deleteMessage({ message: 'test message' });
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
    const sessionedSQS = sinon.stub(client, 'sessionedSQS').callsFake(
      () =>
        // don't do any portal sessioning
        sqs,
    );

    const discoverQueue = sinon.stub(client, 'discoverQueue').resolves('http://my-output-queue.eu-test-1.aws.com');
    const deleteMessage = sinon.stub(sqs, 'deleteMessage').callsFake(() => ({
      promise: () => Promise.resolve(),
    }));

    try {
      await client.deleteMessage({ message: 'test message', ReceiptHandle: 'abcd-1234' });
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
    const sessionedSQS = sinon.stub(client, 'sessionedSQS').callsFake(
      () =>
        // don't do any portal sessioning
        sqs,
    );

    const discoverQueue = sinon.stub(client, 'discoverQueue').resolves('http://my-output-queue.eu-test-1.aws.com');
    const deleteMessage = sinon.stub(sqs, 'deleteMessage').callsFake(() => ({
      promise: () => Promise.reject(new Error('deleteMessage failed')),
    }));

    try {
      await client.deleteMessage({ message: 'test message', ReceiptHandle: 'abcd-1234' });
    } catch (error) {
      assert.fail(error);
    }

    assert.ok(client.log.error.args[0][0].match(/deleteMessage failed/), 'error message logged');
  });

  it('should invoke sqs.deleteMessage with exception', async () => {
    const client = clientFactory();
    const sqs = new AWS.SQS();
    const sessionedSQS = sinon.stub(client, 'sessionedSQS').callsFake(
      () =>
        // don't do any portal sessioning
        sqs,
    );

    const discoverQueue = sinon.stub(client, 'discoverQueue').resolves('http://my-output-queue.eu-test-1.aws.com');
    const deleteMessage = sinon.stub(sqs, 'deleteMessage').throws(new Error('deleteMessage failed'));

    try {
      await client.deleteMessage({ message: 'test message', ReceiptHandle: 'abcd-1234' });
    } catch (error) {
      assert.fail(error);
    }

    assert.ok(client.log.error.args[0][0].match(/exception.*deleteMessage failed/), 'exception message logged');
  });

  it('should invoke sqs.deleteMessage with discovery failure and counter set', async () => {
    const client = clientFactory();
    const sqs = new AWS.SQS();
    const sessionedSQS = sinon.stub(client, 'sessionedSQS').callsFake(
      () =>
        // don't do any portal sessioning
        sqs,
    );

    const discoverQueue = sinon.stub(client, 'discoverQueue').rejects('could not connect');
    const deleteMessage = sinon.stub();

    try {
      await client.deleteMessage({ message: 'test message', ReceiptHandle: 'abcd-1234' });
    } catch (error) {
      assert.fail(error);
    }

    assert.ok(deleteMessage.notCalled, 'sqs.deleteMessage is not invoked if queue discovery fails');
    assert.equal(client.states.download.failure['could not connect'], 1, 'failure type counter set');
  });

  it('should invoke sqs.deleteMessage with discovery failure and counter increment', async () => {
    const client = clientFactory();
    const sqs = new AWS.SQS();
    const sessionedSQS = sinon.stub(client, 'sessionedSQS').callsFake(
      () =>
        // don't do any portal sessioning
        sqs,
    );

    const discoverQueue = sinon.stub(client, 'discoverQueue').rejects('could not connect');
    const deleteMessage = sinon.stub();

    client.states.download.failure['could not connect'] = 7;

    try {
      await client.deleteMessage({ message: 'test message', ReceiptHandle: 'abcd-1234' });
    } catch (error) {
      assert.fail(error);
    }

    assert.ok(deleteMessage.notCalled, 'sqs.deleteMessage is not invoked if queue discovery fails');
    assert.equal(client.states.download.failure['could not connect'], 8, 'failure type counter incremented');
  });
});
