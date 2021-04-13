import assert from 'assert';
import sinon from 'sinon';
import { EPI2ME_FS as EPI2ME } from '../../src/epi2me-fs';
import { utilsFS as utils } from '../../src/utils-fs';
import tmp from 'tmp';
import path from 'path';
import fs from 'fs-extra';

describe('epi2me.loadUploadFiles', () => {
  let stubs = [];
  let tmpInputDir;
  let batch1;
  const clientFactory = (opts) => {
    const client = new EPI2ME({
      url: 'https://epi2me-test.local',
      log: {
        debug: sinon.stub(),
        info: sinon.stub(),
        warn: sinon.stub(),
        error: sinon.stub(),
        json: sinon.stub(),
      },
      ...opts,
    });

    client.stopped = false;
    return client;
  };

  beforeEach(() => {
    stubs = [];
    tmpInputDir = tmp.dirSync({
      unsafeCleanup: true,
    });

    batch1 = path.join(tmpInputDir.name, 'batch_1');

    fs.mkdirpSync(batch1);

    fs.writeFileSync(path.join(batch1, 'file-a.fastq'), '');
    fs.writeFileSync(path.join(batch1, 'file-b.fastq'), '');
  });

  afterEach(() => {
    stubs.forEach((s) => {
      s.restore();
    });
    try {
      tmpInputDir.removeCallback();
    } catch (ignore) {
      // ignore
    }
  });

  it('should resolve with no work done if dirScanInProgress', async () => {
    const client = clientFactory();
    stubs.push(sinon.stub(client, 'enqueueUploadFiles').resolves());

    client.dirScanInProgress = true;

    try {
      await client.loadUploadFiles();
    } catch (err) {
      assert.fail(err);
    }

    assert(client.enqueueUploadFiles.notCalled, 'enqueueUploadFiles not invoked');
  });

  it('should do work and resolve if work to do', async () => {
    const client = clientFactory({
      inputFolders: [batch1],
    });
    client.uploadState$.next(true);

    stubs.push(sinon.stub(client, 'enqueueUploadFiles').resolves());

    client.inputBatchQueue = [];
    client.inputBatchQueue.remaining = 0;
    client.dirScanInProgress = false;
    client.db = {
      seenUpload() {
        return false;
      },
    };

    try {
      await client.loadUploadFiles();
    } catch (err) {
      assert.fail(err);
    }

    const files = client.enqueueUploadFiles.lastCall.args[0];
    assert.strictEqual(files[0].name, 'file-a.fastq');
    assert.strictEqual(files[1].name, 'file-b.fastq');

    assert.equal(client.dirScanInProgress, false, 'semaphore state updated');
  });

  it('should handle errors during loadInputFiles', async () => {
    const client = clientFactory({
      inputFolders: [path.join(tmpInputDir.name, 'batch_2')],
    });
    stubs.push(sinon.stub(client, 'enqueueUploadFiles').resolves());

    client.inputBatchQueue = [];
    client.inputBatchQueue.remaining = 0;
    client.dirScanInProgress = false;

    await client.loadUploadFiles();

    assert(client.log.error.lastCall.args[0].match('ENOENT: no such file or directory'));
    assert.strictEqual(client.dirScanInProgress, false, 'semaphore state updated');
  });
});
