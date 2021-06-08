import assert from 'assert';
import fs from 'fs-extra';
import mock from 'mock-fs';
import path from 'path';
import tmp from 'tmp';

import { loadInputFiles } from '../../src/inputScanner';

describe('loadInputFiles', () => {
  let tmpInputDir;
  let batch1;
  let batch2;
  let batch3;

  beforeEach(() => {
    tmpInputDir = tmp.dirSync({
      unsafeCleanup: true,
    });

    batch1 = path.join(tmpInputDir.name, 'batch_1');
    batch2 = path.join(tmpInputDir.name, 'batch_2');
    batch3 = path.join(tmpInputDir.name, 'batch_3');

    fs.mkdirpSync(batch3);
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

  it('should only load valid files', async () => {
    const outputFolder = path.join(tmpInputDir.name, 'downloaded');
    const uploadedFolder = path.join(tmpInputDir.name, 'uploaded');
    fs.mkdirpSync(outputFolder);
    fs.mkdirpSync(uploadedFolder);

    /**
     * Test folder structure:
     * downloaded/downloaded.fastq  should be ignored
     * uploaded/uploaded.fastq      should be picked up
     * batch_1/1.fastq              should be picked up
     * batch_2/2.fastq              should be picked up
     * batch_2/._2.fastq            should be ignored
     */

    const found = new Set();
    const foundFilter = async (filepath) => {
      if (found.has(filepath)) {
        return false;
      }
      found.add(filepath);
      return true;
    };
    // NOTE "uploadedFolder" is a legacy thing, it used to be ignored but now we treat it like any
    // normal folder
    fs.writeFileSync(path.join(batch1, '1.fastq'), '');
    fs.writeFileSync(path.join(batch2, '2.fastq'), '');
    fs.writeFileSync(path.join(batch2, '._2.fastq'), ''); // MC-6941 junk file
    fs.writeFileSync(path.join(outputFolder, 'downloaded.fastq'), '');
    fs.writeFileSync(path.join(uploadedFolder, 'uploaded.fastq'), '');

    const opts = {
      inputFolders: [tmpInputDir.name],
      outputFolder,
      filetypes: '.fastq',
      filter: foundFilter,
    };

    const files1 = await loadInputFiles(opts);
    assert.strictEqual(files1.length, 3, 'should find 3 valid files');

    const files2 = await loadInputFiles(opts);
    assert.strictEqual(files2.length, 0, 'should find no files');

    fs.writeFileSync(path.join(batch3, '3.fastq'), '');

    const files3 = await loadInputFiles(opts);
    assert.strictEqual(files3.length, 1, 'should find 1 new file');
  });

  it('generates a sane file description', async () => {
    fs.writeFileSync(path.join(batch1, '1.fastq'), '');

    const [description] = await loadInputFiles({
      inputFolders: [batch1],
      filetypes: '.fastq',
    });

    assert.deepStrictEqual(description, {
      name: '1.fastq',
      path: path.join(batch1, '1.fastq'),
      relative: '1.fastq',
      size: 0,
      // 5 reads in this test suite, 10 in "fileUploader" = 15
      id: 'FILE_0015',
    });
  });

  it('MC-7215 should skip undesirable file types', async () => {
    const inputFolder = path.join(tmpInputDir.name, 'data');
    const oneFolder = path.join(inputFolder, 'one');
    const twoFolder = path.join(inputFolder, 'two');
    const passFolder = path.join(inputFolder, 'pass');
    fs.mkdirpSync(inputFolder);
    fs.mkdirpSync(oneFolder);
    fs.mkdirpSync(twoFolder);
    fs.mkdirpSync(passFolder);

    /**
     * Test folder structure:
     * data/1.txt
     * data/fail/1.fast5
     * data/fastq_fail/1.fastq
     * data/pass/1.fastq
     */
    fs.writeFileSync(path.join(oneFolder, '1.txt'), '');
    fs.writeFileSync(path.join(twoFolder, '1.fast5'), '');
    fs.writeFileSync(path.join(passFolder, '1.fastq'), '');
    fs.writeFileSync(path.join(inputFolder, '1.fastq'), '');

    const opts = {
      inputFolders: [inputFolder],
      outputFolder: path.join(inputFolder, 'output'),
      filetypes: '.fastq',
    };

    const files = await loadInputFiles(opts);

    assert.deepStrictEqual(
      new Set(files.map((file) => file.path)),
      new Set([path.join(inputFolder, '1.fastq'), path.join(inputFolder, 'pass', '1.fastq')]),
    );
  });

  it('MC-7214 should skip both fail and fastq_fail', async () => {
    const inputFolder = path.join(tmpInputDir.name, 'data');
    const failFolder = path.join(inputFolder, 'fail');
    const fastqFailFolder = path.join(inputFolder, 'fastq_fail');
    const passFolder = path.join(inputFolder, 'pass');
    fs.mkdirpSync(inputFolder);
    fs.mkdirpSync(failFolder);
    fs.mkdirpSync(fastqFailFolder);
    fs.mkdirpSync(passFolder);

    /**
     * Test folder structure:
     * data/1.fastq
     * data/fail/1.fastq
     * data/fastq_fail/1.fastq
     * data/pass/1.fastq
     */
    fs.writeFileSync(path.join(failFolder, '1.fastq'), '');
    fs.writeFileSync(path.join(fastqFailFolder, '1.fastq'), '');
    fs.writeFileSync(path.join(passFolder, '1.fastq'), '');
    fs.writeFileSync(path.join(inputFolder, '1.fastq'), '');

    const opts = {
      inputFolders: [inputFolder],
      outputFolder: path.join(inputFolder, 'output'),
      filetypes: '.fastq',
    };

    const files = await loadInputFiles(opts);

    assert.deepStrictEqual(
      new Set(files.map((file) => file.path)),
      new Set([path.join(inputFolder, '1.fastq'), path.join(inputFolder, 'pass', '1.fastq')]),
    );
  });

  it('MC-6727 should support array of desirable types (and "." addition)', async () => {
    const inputFolder = path.join(tmpInputDir.name, 'data');
    const oneFolder = path.join(inputFolder, 'one');
    const twoFolder = path.join(inputFolder, 'two');
    const passFolder = path.join(inputFolder, 'pass');
    fs.mkdirpSync(inputFolder);
    fs.mkdirpSync(oneFolder);
    fs.mkdirpSync(twoFolder);
    fs.mkdirpSync(passFolder);

    /**
     * Test folder structure:
     * data/1.txt
     * data/fail/1.fast5
     * data/fastq_fail/1.fastq
     * data/pass/1.fastq
     */
    fs.writeFileSync(path.join(oneFolder, '1.txt'), '');
    fs.writeFileSync(path.join(twoFolder, '1.fast5'), '');
    fs.writeFileSync(path.join(passFolder, '1.fq'), '');
    fs.writeFileSync(path.join(passFolder, '1.fq.gz'), '');
    fs.writeFileSync(path.join(inputFolder, '1.fastq'), '');
    fs.writeFileSync(path.join(inputFolder, '1.fastq.gz'), '');

    const opts = {
      inputFolders: [inputFolder],
      outputFolder: path.join(inputFolder, 'output'),
      filetypes: ['.fastq', '.fastq.gz', 'fq', 'fq.gz'],
    };

    const files = await loadInputFiles(opts);

    assert.deepStrictEqual(
      new Set(files.map((file) => file.path)),
      new Set([
        path.join(inputFolder, '1.fastq'),
        path.join(inputFolder, '1.fastq.gz'),
        path.join(inputFolder, 'pass', '1.fq'),
        path.join(inputFolder, 'pass', '1.fq.gz'),
      ]),
    );
  });

  it('MC-6788 should support recursive find through a file', async () => {
    const inputFolder = path.join(tmpInputDir.name, 'data');
    const inputFile = path.join(inputFolder, 'SeqLenti fasta reformat.fasta');
    fs.mkdirpSync(inputFolder);
    fs.writeFileSync(inputFile, '');

    const opts = {
      inputFolders: [inputFile],
      outputFolder: path.join(inputFolder, 'output'),
      filetypes: ['.fasta', '.fasta.gz', 'fa', 'fa.gz'],
    };

    const files = await loadInputFiles(opts);

    assert.deepStrictEqual(
      new Set(files.map((file) => file.path)),
      new Set([path.join(inputFolder, 'SeqLenti fasta reformat.fasta')]),
    );
  });
  describe('MC-7480', () => {
    let root;
    let experiment1Path;
    let experiment2Path;
    let outputFolder;
    beforeEach(() => {
      root = '/data';
      experiment1Path = `${root}/experiment/pass`;
      experiment2Path = `${root}/experiment2/pass`;
      outputFolder = `${root}/output/`;

      mock({
        [experiment1Path]: {
          '1.fastq': 'file content here',
        },
        [experiment2Path]: {
          '1.fastq': 'file content here',
        },
        [outputFolder]: {},
      });
    });

    afterEach(() => {
      mock.restore();
    });
    it('should accept an array of folders to watch', async () => {
      const opts = {
        inputFolders: [experiment1Path, experiment2Path],
        outputFolder,
        filetypes: '.fastq',
      };

      const files = await loadInputFiles(opts);

      assert.deepStrictEqual(
        new Set(files.map((file) => file.path)),
        new Set([path.join(experiment1Path, '1.fastq'), path.join(experiment2Path, '1.fastq')]),
      );
    });
    it('should accept a single file', async () => {
      const opts = {
        inputFolders: [`${experiment1Path}/1.fastq`],
        outputFolder,
        filetypes: '.fastq',
      };

      const files = await loadInputFiles(opts);

      assert.deepStrictEqual(new Set(files.map((file) => file.path)), new Set([path.join(experiment1Path, '1.fastq')]));
    });
  });
  describe('MC-7698', () => {
    let root;
    let experiment1Path;
    let outputFolder;
    beforeEach(() => {
      root = '/data';
      experiment1Path = `${root}/reference`;

      mock({
        [experiment1Path]: {
          '1.fasta': 'file content here',
        },
        [outputFolder]: {},
      });
    });

    afterEach(() => {
      mock.restore();
    });

    it('should identify a fasta file', async () => {
      const opts = {
        inputFolders: [`${experiment1Path}/1.fasta`],
        outputFolder,
        filetypes: ['fasta'],
      };

      const files = await loadInputFiles(opts);

      assert.deepStrictEqual(new Set(files.map((file) => file.path)), new Set([path.join(experiment1Path, '1.fasta')]));
    });
  });
});
