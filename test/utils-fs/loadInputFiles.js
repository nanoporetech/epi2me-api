import assert from 'assert';
import tmp from 'tmp';
import fs from 'fs-extra';
import path from 'path';
import utils from '../../src/utils-fs';

describe('utils-fs.loadInputFiles', () => {
  let tmpInputDir;
  let batch1;
  let batch2;

  beforeEach(() => {
    tmpInputDir = tmp.dirSync({ unsafeCleanup: true });
    batch1 = path.join(tmpInputDir.name, 'batch_1');
    batch2 = path.join(tmpInputDir.name, 'batch_2');
    fs.mkdirpSync(batch2);
    fs.mkdirpSync(batch1);
  });

  afterEach(() => {
    try {
      tmpInputDir.removeCallback();
    } catch (ignore) {
      // ignore
    }
  });

  it('should only load files in batches', async () => {
    const outputFolder = path.join(tmpInputDir.name, 'downloaded');
    const uploadedFolder = path.join(tmpInputDir.name, 'uploaded');
    fs.mkdirpSync(outputFolder);
    fs.mkdirpSync(uploadedFolder);

    /**
     * Test folder structure:
     * downloaded/downloaded.fastq  should be ignored
     * uploaded/uploaded.fastq      should be ignored
     * batch_1/1.fastq              should be picked up
     * batch_2/2.fastq              should be picked up
     */
    fs.writeFileSync(path.join(batch1, '1.fastq'), '');
    fs.writeFileSync(path.join(batch2, '2.fastq'), '');
    fs.writeFileSync(path.join(batch2, '._2.fastq'), ''); // MC-6941 junk file
    fs.writeFileSync(path.join(outputFolder, 'downloaded.fastq'), '');
    fs.writeFileSync(path.join(uploadedFolder, 'uploaded.fastq'), '');

    const opts = {
      inputFolder: tmpInputDir.name,
      outputFolder,
      uploadedFolder,
      filetype: '.fastq',
    };

    // stepping through the file system as this is intented to work:
    // first load one batch, then the next, then once all files are gone, return null
    await utils.loadInputFiles(opts).then(async files => {
      assert.equal(files.length, 3, 'files1 should find the one valid file');
      assert.equal(files[0].name, '1.fastq', 'should load the folders in alphabetical order');
      fs.unlinkSync(files[0].path);
    });

    await utils.loadInputFiles(opts).then(async files2 => {
      assert.equal(files2.length, 2, 'files2 should find the one valid file');
      assert.equal(files2[0].name, '2.fastq', 'should load the folders in alphabetical order');
      fs.unlinkSync(files2[0].path);
    });

    fs.unlinkSync(path.join(uploadedFolder, 'uploaded.fastq')); // remove uploaded file

    await utils.loadInputFiles(opts).then(files3 => {
      assert.deepEqual(files3, [], 'should find no files');
    });
  });
});
