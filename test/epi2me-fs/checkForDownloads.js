import assert from 'assert';
import sinon from 'sinon';
import { merge } from 'lodash';
import { EPI2ME_FS as EPI2ME } from '../../src/epi2me-fs';

describe('epi2me.checkForDownloads', () => {
  let debug;
  let warn;
  const clientFactory = (opts) =>
    new EPI2ME(
      merge(
        {
          url: 'https://epi2me-test.local',
          log: {
            debug,
            info: sinon.stub(),
            warn,
            error: sinon.stub(),
            json: sinon.stub(),
          },
        },
        opts,
      ),
    );

  beforeEach(() => {
    debug = sinon.stub();
    warn = sinon.stub();
  });

  it('should bail if already running', async () => {
    const client = clientFactory();
    sinon.stub(client, 'discoverQueue').resolves('http://queue.url/');
    sinon.stub(client, 'queueLength').resolves(); // undefined
    sinon.stub(client, 'downloadAvailable').callsFake();
    client.checkForDownloadsRunning = true;

    try {
      await client.checkForDownloads();
    } catch (e) {
      assert.fail(e);
    }

    assert(client.discoverQueue.notCalled);
  });

  it('should process undefined messages', async () => {
    const client = clientFactory();
    sinon.stub(client, 'discoverQueue').resolves('http://queue.url/');
    sinon.stub(client, 'queueLength').resolves(); // undefined
    sinon.stub(client, 'downloadAvailable').callsFake();

    try {
      await client.checkForDownloads();
    } catch (e) {
      assert.fail(e);
    }

    assert(debug.lastCall.args[0].match(/no downloads available/));
    assert(client.downloadAvailable.notCalled);
  });

  it('should process null messages', async () => {
    const client = clientFactory();
    sinon.stub(client, 'discoverQueue').resolves('http://queue.url/');
    sinon.stub(client, 'queueLength').resolves(null); // null
    sinon.stub(client, 'downloadAvailable').callsFake();

    try {
      await client.checkForDownloads();
    } catch (e) {
      assert.fail(e);
    }

    assert(debug.lastCall.args[0].match(/no downloads available/));
    assert(client.downloadAvailable.notCalled);
  });

  it('should process zero messages', async () => {
    const client = clientFactory();
    sinon.stub(client, 'discoverQueue').resolves('http://queue.url/');
    sinon.stub(client, 'queueLength').resolves(0); // zero
    sinon.stub(client, 'downloadAvailable').callsFake();

    try {
      await client.checkForDownloads();
    } catch (e) {
      assert.fail(e);
    }

    assert(debug.lastCall.args[0].match(/no downloads available/));
    assert(client.downloadAvailable.notCalled);
  });

  it('should process n messages', async () => {
    const client = clientFactory();
    sinon.stub(client, 'discoverQueue').resolves('http://queue.url/');
    sinon.stub(client, 'queueLength').resolves(50); // n
    sinon.stub(client, 'downloadAvailable').callsFake();

    try {
      await client.checkForDownloads();
    } catch (e) {
      assert.fail(e);
    }

    assert(debug.lastCall.args[0].match(/downloads available: 50/));
    assert(client.downloadAvailable.calledOnce);
  });

  it('should handle new error', async () => {
    const client = clientFactory();
    sinon.stub(client, 'discoverQueue').rejects(new Error('discoverQueue failed'));

    try {
      await client.checkForDownloads();
    } catch (e) {
      assert.fail(e);
    }

    assert(warn.lastCall.args[0].match(/checkForDownloads error/));
    assert.deepEqual(client.states.download.failure, {
      'Error: discoverQueue failed': 1,
    });
    assert.equal(client.checkForDownloadsRunning, false, 'semaphore unset');
  });

  it('should handle subsequent error', async () => {
    const client = clientFactory();
    sinon.stub(client, 'discoverQueue').rejects(new Error('discoverQueue failed'));
    client.states.download.failure = {
      'Error: discoverQueue failed': 1,
    };

    try {
      await client.checkForDownloads();
    } catch (e) {
      assert.fail(e);
    }

    assert(warn.lastCall.args[0].match(/checkForDownloads error/));
    assert.deepEqual(client.states.download.failure, {
      'Error: discoverQueue failed': 2,
    });
    assert.equal(client.checkForDownloadsRunning, false, 'semaphore unset');
  });
});
