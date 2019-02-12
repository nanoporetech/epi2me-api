import assert from 'assert';
import sinon from 'sinon';
import { merge } from 'lodash';
import EPI2ME from '../../src/epi2me';

describe('epi2me.uploadJob', () => {
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

  it('should handle file object with skip and no readCount', async () => {
    const client = clientFactory();

    sinon.stub(client, 'moveFile').callsFake(file => {
      assert.deepEqual(file, { skip: true });
      return Promise.resolve();
    });
    sinon.stub(client, 'uploadHandler');
    client.states.upload.enqueued = 10;

    try {
      const x = { skip: true };
      await client.uploadJob(x);
    } catch (e) {
      assert.fail(e);
    }

    assert(client.moveFile.calledOnce);
    assert.equal(client.states.upload.enqueued, 9);
    assert.equal(client.states.upload.queueLength, 0);
  });

  it('should handle file object with skip and readCount', async () => {
    const client = clientFactory();

    sinon.stub(client, 'moveFile').callsFake(file => {
      assert.deepEqual(file, { skip: true, readCount: 5 });
      return Promise.resolve();
    });
    sinon.stub(client, 'uploadHandler');
    client.states.upload.enqueued = 10;

    try {
      const x = { skip: true, readCount: 5 };
      await client.uploadJob(x);
    } catch (e) {
      assert.fail(e);
    }

    assert(client.moveFile.calledOnce);
    assert.equal(client.states.upload.enqueued, 5);
    assert.equal(client.states.upload.queueLength, 0);
  });

  it('should handle file object with skip and queueLength', async () => {
    const client = clientFactory();

    sinon.stub(client, 'moveFile').callsFake(file => {
      assert.deepEqual(file, { skip: true, readCount: 5 });
      return Promise.resolve();
    });
    sinon.stub(client, 'uploadHandler');
    client.states.upload.enqueued = 10;
    client.states.upload.queueLength = 10;

    try {
      const x = { skip: true, readCount: 5 };
      await client.uploadJob(x);
    } catch (e) {
      assert.fail(e);
    }

    assert(client.moveFile.calledOnce);
    assert.equal(client.states.upload.enqueued, 5);
    assert.equal(client.states.upload.queueLength, 5);
  });

  it('should handle callback with error and no tally', async () => {
    const clock = sinon.useFakeTimers();
    const client = clientFactory();

    sinon.stub(client, 'uploadHandler').rejects(new Error('uploadHandler failed'));
    delete client.states.upload.failure;

    try {
      const x = { id: 72 };
      await client.uploadJob(x);
      clock.tick(1000);
    } catch (err) {
      assert.fail(err);
    }

    assert(client.log.info.lastCall.args[0].match(/uploadHandler failed/), 'error message propagated');
    clock.restore();
  });

  it('should handle callback with error and empty tally', async () => {
    const clock = sinon.useFakeTimers();
    const client = clientFactory();

    sinon.stub(client, 'uploadHandler').rejects(new Error('uploadHandler failed'));
    client.states.upload.failure = {}; // empty error tally

    try {
      const x = { id: 72 };
      await client.uploadJob(x);
      clock.tick(1000);
    } catch (err) {
      assert.fail(err);
    }

    assert(client.log.info.lastCall.args[0].match(/uploadHandler failed/), 'error message propagated');
    assert.deepEqual(client.states.upload.failure, { 'Error: uploadHandler failed': 1 }, 'error counted');

    clock.restore();
  });

  it('should handle callback with error and initialised tally', async () => {
    const clock = sinon.useFakeTimers();
    const client = clientFactory();

    sinon.stub(client, 'uploadHandler').rejects(new Error('uploadHandler failed'));
    client.states.upload.failure = { 'Error: uploadHandler failed': 7 }; // empty error tally

    try {
      const x = { id: 72 };
      await client.uploadJob(x);
      clock.tick(1000);
    } catch (e) {
      assert.fail(e);
    }

    assert(client.log.info.lastCall.args[0].match(/uploadHandler failed/), 'error message propagated');
    assert.deepEqual(client.states.upload.failure, { 'Error: uploadHandler failed': 8 }, 'error counted');

    clock.restore();
  });

  it('should handle callback without error', async () => {
    const clock = sinon.useFakeTimers();
    const client = clientFactory();

    sinon.stub(client, 'uploadHandler').callsFake(file => Promise.resolve(file));

    try {
      const x = { id: 72 };
      await client.uploadJob(x);
      clock.tick(1000);
    } catch (e) {
      assert.fail(e);
    }

    assert(client.log.info.lastCall.args[0].match(/completely done/), 'completion info message');

    clock.restore();
  });

  it('should handle callback without error and with counts', async () => {
    const clock = sinon.useFakeTimers();
    const client = clientFactory();

    sinon.stub(client, 'uploadHandler').callsFake(file => Promise.resolve(file));

    client.states.upload.queueLength = 8192;
    client.states.upload.success = 25;

    try {
      const x = { id: 72, readCount: 4096 };
      await client.uploadJob(x);
      clock.tick(1000);
    } catch (e) {
      assert.fail(e);
    }

    assert(client.log.info.lastCall.args[0].match(/completely done/), 'completion info message');
    assert.deepEqual(
      client.states,
      {
        download: {
          fail: 0,
          failure: {},
          queueLength: 0,
          success: 0,
          totalSize: 0,
        },
        upload: {
          enqueued: -4096,
          failure: {},
          queueLength: 4096,
          success: 4121,
          totalSize: 0,
        },
        warnings: [],
      },
      'stats tallied',
    );
    clock.restore();
  });
});
