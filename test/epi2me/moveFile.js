import assert from 'assert';
import sinon from 'sinon';
import fs from 'fs-extra';
import tmp from 'tmp';
import path from 'path';
import { merge } from 'lodash';
import EPI2ME from '../../src/epi2me';

describe('epi2me.moveFile', () => {
  let debug;
  let info;
  let warn;
  let error;

  const clientFactory = opts =>
    new EPI2ME(
      merge(
        {
          url: 'https://epi2me-test.local',
          log: {
            debug,
            info,
            warn,
            error,
          },
        },
        opts,
      ),
    );

  beforeEach(() => {
    // reset loggers
    debug = sinon.stub();
    info = sinon.stub();
    warn = sinon.stub();
    error = sinon.stub();
  });

  it('should handle mkdirp error without unlink error', async () => {
    const workingDir = tmp.dirSync().name;
    fs.mkdirpSync(path.join(workingDir, 'uploaded'));
    const client = clientFactory({
      inputFolder: workingDir,
    });
    client.uploadedFiles = [];
    client.states.upload.totalSize = 0;

    const mkdirp = sinon.stub(fs, 'mkdirp').rejects(new Error('mkdirp failed'));
    const file = {
      id: 'my-file',
      size: 10,
      name: 'fileA.fq',
      batch: 'batchB',
      path: path.join(workingDir, 'batchB', 'fileA.fq'),
    };

    let err;
    try {
      await client.moveFile(file, 'upload');
    } catch (e) {
      err = e;
    }

    assert.ok(String(err).match(/mkdirp failed/), 'mkdirp error propagated');

    mkdirp.restore();
  });

  it('should handle mkdirp error with unlink error', async () => {
    const workingDir = tmp.dirSync().name;
    fs.mkdirpSync(path.join(workingDir, 'uploaded'));
    const client = clientFactory({
      inputFolder: workingDir,
    });
    client.uploadedFiles = [];
    client.states.upload.totalSize = 0;

    const remove = sinon.stub(fs, 'remove').rejects(new Error('failed to remove'));
    const mkdirp = sinon.stub(fs, 'mkdirp').rejects(new Error('mkdirp failed'));

    const file = {
      id: 'my-file',
      size: 10,
      name: 'fileA.fq',
      batch: 'batchB',
      path: path.join(workingDir, 'batchB', 'fileA.fq'),
    };

    let err;
    try {
      await client.moveFile(file, 'upload');
    } catch (e) {
      err = e;
    }

    assert.ok(String(err).match(/mkdirp failed/), 'mkdirp error propagated');
    assert.ok(
      warn.args[0][0].match(/my-file upload additionally failed to delete.*failed to remove/),
      'deletion failure logged',
    );

    mkdirp.restore();
    remove.restore();
  });

  it('should handle no mkdirp error with move error', async () => {
    const workingDir = tmp.dirSync().name;
    fs.mkdirpSync(path.join(workingDir, 'uploaded'));
    const client = clientFactory({
      inputFolder: workingDir,
    });
    client.uploadedFiles = [];
    client.states.upload.totalSize = 0;

    fs.mkdirpSync(path.join(workingDir, 'batchB')); // source folder present
    fs.mkdirpSync(path.join(workingDir, 'uploaded', 'batchB')); // target folder present

    const file = {
      id: 'my-file',
      size: 10,
      name: 'fileA.fq',
      batch: 'batchB',
      path: path.join(workingDir, 'batchB', 'fileA.fq'),
    };

    let err;
    try {
      await client.moveFile(file, 'upload');
    } catch (e) {
      err = e;
    }

    assert.ok(String(err).match(/no such file/), 'error message returned');
  });

  it('should handle no mkdirp error and no move error', async () => {
    const workingDir = tmp.dirSync().name;
    fs.mkdirpSync(path.join(workingDir, 'uploaded'));
    const client = clientFactory({
      inputFolder: workingDir,
    });
    client.uploadedFiles = [];
    client.states.upload.totalSize = 0;

    fs.mkdirpSync(path.join(workingDir, 'batchB')); // source folder present
    fs.mkdirpSync(path.join(workingDir, 'uploaded', 'batchB')); // target folder present
    fs.writeFileSync(path.join(workingDir, 'batchB', 'fileA.fq')); // source file present

    const file = {
      id: 'my-file',
      size: 10,
      name: 'fileA.fq',
      batch: 'batchB',
      path: path.join(workingDir, 'batchB', 'fileA.fq'),
    };

    let err;
    try {
      await client.moveFile(file, 'upload');
    } catch (e) {
      err = e;
    }

    if (err) {
      assert.fail(err);
    }

    assert.ok(!err, 'no error thrown');
    // check successful filesystem state here
  });
  /*
    it('should move file to upload folder', () => {
    });
    it("should handle EXDIR cross-filesystem errors (fs-extra)", () => {
    });
    it('should handle non-existing input file', () => {
    }); */
});
