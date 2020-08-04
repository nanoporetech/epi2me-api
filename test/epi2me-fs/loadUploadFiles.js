import assert from 'assert';
import sinon from 'sinon';
import { merge } from 'lodash';
import EPI2ME from '../../src/epi2me-fs';
import utils from '../../src/utils-fs';

describe('epi2me.loadUploadFiles', () => {
  let stubs = [];
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
            json: sinon.stub(),
          },
        },
        opts,
      ),
    );

    client.stopped = false;
    return client;
  };

  beforeEach(() => {
    stubs = [];
  });

  afterEach(() => {
    stubs.forEach(s => {
      s.restore();
    });
  });

  it('should resolve with no work done if dirScanInProgress', async () => {
    const client = clientFactory();
    stubs.push(sinon.stub(client, 'enqueueUploadFiles').resolves());
    stubs.push(sinon.stub(utils, 'loadInputFiles').resolves());

    client.dirScanInProgress = true;

    try {
      await client.loadUploadFiles();
    } catch (err) {
      assert.fail(err);
    }

    assert(client.enqueueUploadFiles.notCalled, 'enqueueUploadFiles not invoked');
    utils.loadInputFiles.restore();
  });

  it('should do work and resolve if work to do', async () => {
    const client = clientFactory();
    stubs.push(sinon.stub(client, 'enqueueUploadFiles').resolves());
    stubs.push(sinon.stub(utils, 'loadInputFiles').resolves(['file-a.fastq', 'file-b.fastq']));

    client.inputBatchQueue = [];
    client.inputBatchQueue.remaining = 0;
    client.dirScanInProgress = false;

    try {
      await client.loadUploadFiles();
    } catch (err) {
      assert.fail(err);
    }

    assert.deepEqual(
      client.enqueueUploadFiles.lastCall.args[0],
      ['file-a.fastq', 'file-b.fastq'],
      'invoked with files',
    );
    assert.equal(client.dirScanInProgress, false, 'semaphore state updated');
    utils.loadInputFiles.restore();
  });

  it('should handle errors during loadInputFiles', async () => {
    const client = clientFactory();
    stubs.push(sinon.stub(client, 'enqueueUploadFiles').resolves());
    stubs.push(sinon.stub(utils, 'loadInputFiles').rejects(new Error('no such directory')));

    client.inputBatchQueue = [];
    client.inputBatchQueue.remaining = 0;
    client.dirScanInProgress = false;

    try {
      await client.loadUploadFiles();
    } catch (err) {
      assert.fail(err);
    }
    assert(client.log.error.lastCall.args[0].match('no such directory'));
    assert.equal(client.dirScanInProgress, false, 'semaphore state updated');
    utils.loadInputFiles.restore();
  });
});
