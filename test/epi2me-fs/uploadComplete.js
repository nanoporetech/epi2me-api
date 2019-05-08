import assert from 'assert';
import sinon from 'sinon';
import { merge } from 'lodash';
import AWS from 'aws-sdk';
import tmp from 'tmp';
import EPI2ME from '../../src/epi2me-fs';
import DB from '../../src/db';

describe('epi2me.uploadComplete', () => {
  const clientFactory = opts => {
    const client = new EPI2ME(
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
    client.db = new DB(tmp.dirSync().name);
    return client;
  };

  it('sqs callback failure should handle error and log warning', async () => {
    const client = clientFactory();
    const sqs = new AWS.SQS();

    sinon.stub(client, 'discoverQueue').resolves('http://my-queue/');
    sinon.stub(client, 'sessionedSQS').resolves(sqs);
    sinon.stub(sqs, 'sendMessage').callsFake(() => ({
      promise: () => Promise.reject(new Error('uploadComplete failed')),
    }));

    try {
      await client.uploadComplete('object-id', { id: 'my-file', path: 'path/to/file.fastq' });
      assert.fail('unexpected success');
    } catch (e) {
      assert(client.log.error.lastCall.args[0].match(/exception sending SQS/));
      assert.ok(String(e).match(/uploadComplete failed/));
    }
  });

  it('sqs callback exception should handle error and log error', async () => {
    const client = clientFactory();
    const sqs = new AWS.SQS();

    sinon.stub(client, 'discoverQueue').resolves('http://my-queue/');
    sinon.stub(client, 'sessionedSQS').callsFake(() => sqs);
    sinon.stub(sqs, 'sendMessage').callsFake(() => ({
      promise: () => Promise.reject(new Error('uploadComplete failed')),
    }));

    let err;
    try {
      await client.uploadComplete('object-id', { id: 'my-file', path: 'path/to/file.fastq' });
    } catch (e) {
      err = e;
    }
    assert(client.log.error.lastCall.args[0].match(/exception sending SQS/));
    assert.ok(String(err).match(/uploadComplete failed/));
  });

  it('sqs callback success should move file and log info', async () => {
    const client = clientFactory();
    const sqs = new AWS.SQS();
    const clock = sinon.useFakeTimers();

    sinon.stub(client, 'discoverQueue').resolves('http://my-queue/');
    sinon.stub(client, 'sessionedSQS').callsFake(() => sqs);

    sinon.stub(sqs, 'sendMessage').callsFake(obj => {
      assert.deepEqual(
        JSON.parse(obj.MessageBody),
        {
          bucket: null,
          outputQueue: null,
          remote_addr: null,
          user_defined: null,
          utc: '1970-01-01T00:00:00.000Z',
          path: 'object-id',
          prefix: '',
        },
        'uploadComplete payload',
      );
      return {
        promise: () => Promise.resolve(),
      };
    });

    try {
      await client.uploadComplete('object-id', { id: 'my-file', path: 'path/to/file.fastq' });
    } catch (e) {
      assert.fail(e);
    }

    assert(client.log.info.lastCall.args[0].match(/my-file SQS message sent/), 'info message logged');
    clock.restore();
  });

  it('should handle chain info with exception', async () => {
    const client = clientFactory();
    const sqs = new AWS.SQS();

    sinon.stub(client, 'discoverQueue').resolves('http://my-queue/');
    sinon.stub(client, 'sessionedSQS').resolves(sqs);
    sinon.stub(sqs, 'sendMessage').resolves();

    client.config.instance.chain = {}; // components undefined

    let err;
    try {
      await client.uploadComplete('object-id', { id: 'my-file', path: 'path/to/file.fastq' });
    } catch (e) {
      err = e;
    }

    assert(client.log.error.lastCall.args[0].match(/exception parsing/), 'exception message logged');
    assert(String(err).match(/Unexpected token/), 'error message passed back');
  });

  it('should handle & propagate additional metadata', async () => {
    const clock = sinon.useFakeTimers();
    const client = clientFactory();
    const sqs = new AWS.SQS();

    sinon.stub(client, 'discoverQueue').resolves('http://my-queue/');
    sinon.stub(client, 'sessionedSQS').callsFake(() => sqs);

    sinon.stub(sqs, 'sendMessage').callsFake(obj => {
      assert.deepEqual(
        JSON.parse(obj.MessageBody),
        {
          bucket: null,
          outputQueue: null,
          remote_addr: null,
          user_defined: null,
          utc: '1970-01-01T00:00:00.000Z',
          path: 'object-id',
          prefix: '',
          targetComponentId: 1, // this
          components: [], // this
          key_id: 'data-secret', // this
          agent_address: {
            // this
            city: 'Cambridge',
            ip: '127.0.0.1',
          },
        },
        'uploadComplete payload',
      );
      return {
        promise: () => Promise.resolve(),
      };
    });

    client.config.instance.chain = { components: [], targetComponentId: 1 };
    client.config.instance.key_id = 'data-secret';
    client.config.options.agent_address = JSON.stringify({ city: 'Cambridge', ip: '127.0.0.1' });

    try {
      await client.uploadComplete('object-id', { id: 'my-file', path: 'path/to/file.fastq' });
    } catch (e) {
      assert.fail(e);
    }

    assert(client.log.info.lastCall.args[0].match(/my-file SQS message sent/), 'info message logged');
    clock.restore();
  });

  it('should handle bad agent_address', async () => {
    const clock = sinon.useFakeTimers();
    const client = clientFactory();
    const sqs = new AWS.SQS();

    sinon.stub(client, 'discoverQueue').resolves('http://my-queue/');
    sinon.stub(client, 'sessionedSQS').callsFake(() => sqs);

    sinon.stub(sqs, 'sendMessage').callsFake(obj => {
      assert.deepEqual(
        JSON.parse(obj.MessageBody),
        {
          bucket: null,
          outputQueue: null,
          remote_addr: null,
          user_defined: null,
          utc: '1970-01-01T00:00:00.000Z',
          path: 'object-id',
          prefix: '',
          targetComponentId: 1, // this
          components: [], // this
          key_id: 'data-secret', // this
        },
        'uploadComplete payload',
      );
      return {
        promise: () => Promise.resolve(),
      };
    });

    client.config.instance.chain = { components: [], targetComponentId: 1 };
    client.config.instance.key_id = 'data-secret';
    client.config.options.agent_address = 'bad json data';

    try {
      await client.uploadComplete('object-id', { id: 'my-file', path: 'path/to/file.fastq' });
    } catch (e) {
      assert.fail(e);
    }

    assert(client.log.error.args[0][0].match(/Could not parse agent_address/), 'error message logged');
    clock.restore();
  });

  it('should inject upload & download message queues. is this used?', async () => {
    const clock = sinon.useFakeTimers();
    const client = clientFactory();
    const sqs = new AWS.SQS();

    sinon.stub(client, 'discoverQueue').resolves('http://my-queue/');
    sinon.stub(client, 'sessionedSQS').callsFake(() => sqs);

    sinon.stub(sqs, 'sendMessage').callsFake(obj => {
      assert.deepEqual(
        JSON.parse(obj.MessageBody).components,
        [{ id: 1, inputQueueName: 'upload-q' }, { id: 2, inputQueueName: 'download-q' }],
        'uploadComplete replaced component queue names',
      );
      return {
        promise: () => Promise.resolve(),
      };
    });

    client.uploadMessageQueue = 'upload-q';
    client.downloadMessageQueue = 'download-q';
    client.config.instance.chain = {
      components: [{ id: 1, inputQueueName: 'uploadMessageQueue' }, { id: 2, inputQueueName: 'downloadMessageQueue' }],
    };

    try {
      await client.uploadComplete('object-id', { id: 'my-file', path: 'path/to/file.fastq' });
    } catch (e) {
      assert.fail(e);
    }
    assert(client.log.info.lastCall.args[0].match(/my-file SQS message sent/), 'info message logged');
    clock.restore();
  });
});
