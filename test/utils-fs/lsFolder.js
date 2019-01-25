import assert from 'assert';
import sinon from 'sinon';
import tmp from 'tmp';
import fs from 'fs-extra';
import path from 'path';
import utils from '../../src/utils-fs';

describe('utils-fs.lsFolder', () => {
  let tmpInputDir;

  beforeEach(() => {
    tmpInputDir = tmp.dirSync({ unsafeCleanup: true });
    fs.mkdirpSync(path.join(tmpInputDir.name, 'batch_1'));
    fs.mkdirpSync(path.join(tmpInputDir.name, 'batch_2'));

    fs.writeFileSync(path.join(tmpInputDir.name, 'aa.fastq'), ''); // should not pass ignore()
    fs.writeFileSync(path.join(tmpInputDir.name, '1.fastq'), '123'); // file size of 3
    fs.writeFileSync(path.join(tmpInputDir.name, '1.fastq.tmp'), '');
  });

  afterEach(() => {
    try {
      tmpInputDir.removeCallback();
    } catch (e) {} // ignore
  });

  it('should only load files and folders passing the filter', () => {
    const ignore = fn => fn.match(/[1-9]/);

    assert.doesNotThrow(
      async () => {
        await utils.lsFolder(tmpInputDir.name, ignore, '.fastq').then(({ files, folders }) => {
          assert.equal(files.length, 1, 'should find the one valid file');
          assert.equal(files[0].name, '1.fastq', 'should add file name to file object');
          assert.equal(files[0].size, 3, 'should add file size to file object');
          assert.equal(folders.length, 2, 'should find the two batch folder');
        });
      },
      () => {},
      'lsFolder',
    );
  });

  it('should load all files and folders', () => {
    assert.doesNotThrow(
      async () => {
        await utils.lsFolder(tmpInputDir.name, null, '.fastq').then(({ files, folders }) => {
          assert.equal(files.length, 2, 'should find the one valid file');
          assert.equal(files[0].name, '1.fastq', 'should add file name to file object');
          assert.equal(files[0].size, 3, 'should add file size to file object');
          assert.equal(folders.length, 2, 'should find the two batch folder');
        });
      },
      () => {},
      'lsFolder',
    );
  });
});
