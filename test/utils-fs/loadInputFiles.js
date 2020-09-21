import assert from 'assert';
import fs from 'fs-extra';
import mock from 'mock-fs';
import path from 'path';
import tmp from 'tmp';
import { utilsFS as utils } from '../../src/utils-fs';

describe('utils-fs.loadInputFiles', () => {
  let tmpInputDir;
  let batch1;
  let batch2;

  beforeEach(() => {
    tmpInputDir = tmp.dirSync({
      unsafeCleanup: true,
    });
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
      inputFolders: [tmpInputDir.name],
      outputFolder,
      uploadedFolder,
      filetype: '.fastq',
    };

    // stepping through the file system as this is intented to work:
    // first load one batch, then the next, then once all files are gone, return null
    await utils.loadInputFiles(opts).then(async (files) => {
      assert.equal(files.length, 3, 'files1 should find the one valid file');
      assert.equal(files[0].name, '1.fastq', 'should load the folders in alphabetical order');
      fs.unlinkSync(files[0].path);
    });

    await utils.loadInputFiles(opts).then(async (files2) => {
      assert.equal(files2.length, 2, 'files2 should find the one valid file');
      assert.equal(files2[0].name, '2.fastq', 'should load the folders in alphabetical order');
      fs.unlinkSync(files2[0].path);
    });

    fs.unlinkSync(path.join(uploadedFolder, 'uploaded.fastq')); // remove uploaded file

    await utils.loadInputFiles(opts).then((files3) => {
      assert.deepEqual(files3, [], 'should find no files');
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
      filetype: '.fastq',
    };

    await utils.loadInputFiles(opts).then(async (files) => {
      assert.deepEqual(files, [
        {
          name: '1.fastq',
          path: path.join(inputFolder, '1.fastq'),
          relative: '/1.fastq',
          size: 0,
          id: 'FILE_6',
        },
        {
          name: '1.fastq',
          path: path.join(inputFolder, 'pass', '1.fastq'),
          relative: '/pass/1.fastq',
          size: 0,
          id: 'FILE_7',
        },
      ]);
    });

    await fs.remove(inputFolder);
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
      filetype: '.fastq',
    };

    await utils.loadInputFiles(opts).then(async (files) => {
      assert.deepEqual(files, [
        {
          name: '1.fastq',
          path: path.join(inputFolder, '1.fastq'),
          relative: '/1.fastq',
          size: 0,
          id: 'FILE_8',
        },
        {
          name: '1.fastq',
          path: path.join(inputFolder, 'pass', '1.fastq'),
          relative: '/pass/1.fastq',
          size: 0,
          id: 'FILE_9',
        },
      ]);
    });

    await fs.remove(inputFolder);
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
      filetype: ['.fastq', '.fastq.gz', 'fq', 'fq.gz'],
    };

    await utils.loadInputFiles(opts).then(async (files) => {
      assert.deepEqual(files, [
        {
          name: '1.fastq',
          path: path.join(inputFolder, '1.fastq'),
          relative: '/1.fastq',
          size: 0,
          id: 'FILE_10',
        },
        {
          name: '1.fastq.gz',
          path: path.join(inputFolder, '1.fastq.gz'),
          relative: '/1.fastq.gz',
          size: 0,
          id: 'FILE_11',
        },
        {
          name: '1.fq',
          path: path.join(inputFolder, 'pass', '1.fq'),
          relative: '/pass/1.fq',
          size: 0,
          id: 'FILE_12',
        },
        {
          name: '1.fq.gz',
          path: path.join(inputFolder, 'pass', '1.fq.gz'),
          relative: '/pass/1.fq.gz',
          size: 0,
          id: 'FILE_13',
        },
      ]);
    });

    await fs.remove(inputFolder);
  });

  it('MC-6788 should support recursive find through a file', async () => {
    const inputFolder = path.join(tmpInputDir.name, 'data');
    const inputFile = path.join(inputFolder, 'SeqLenti fasta reformat.fasta');
    fs.mkdirpSync(inputFolder);
    fs.writeFileSync(inputFile, '');

    const opts = {
      inputFolders: [inputFile],
      outputFolder: path.join(inputFolder, 'output'),
      filetype: ['.fasta', '.fasta.gz', 'fa', 'fa.gz'],
    };

    await utils.loadInputFiles(opts).then(async (files) => {
      assert.deepEqual(files, [
        {
          name: 'SeqLenti fasta reformat.fasta',
          path: path.join(inputFolder, 'SeqLenti fasta reformat.fasta'),
          relative: '/SeqLenti fasta reformat.fasta',
          size: 0,
          id: 'FILE_14',
        },
      ]);
    });

    await fs.remove(inputFolder);
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
        filetype: '.fastq',
      };
      await utils.loadInputFiles(opts).then(async (files) => {
        assert.deepEqual(files, [
          {
            name: '1.fastq',
            path: path.join(experiment1Path, '1.fastq'),
            relative: '/1.fastq',
            size: 17,
            id: 'FILE_15',
          },
          {
            name: '1.fastq',
            path: path.join(experiment2Path, '1.fastq'),
            relative: '/1.fastq',
            size: 17,
            id: 'FILE_16',
          },
        ]);
      });
    });
    it('should accept a single file', async () => {
      const opts = {
        inputFolders: [`${experiment1Path}/1.fastq`],
        outputFolder,
        filetype: '.fastq',
      };
      await utils.loadInputFiles(opts).then(async (files) => {
        assert.deepEqual(files, [
          {
            name: '1.fastq',
            path: path.join(experiment1Path, '1.fastq'),
            relative: '/1.fastq',
            size: 17,
            id: 'FILE_17',
          },
        ]);
      });
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
        filetype: ['fasta'],
      };
      await utils.loadInputFiles(opts).then(async (files) => {
        assert.deepEqual(files, [
          {
            name: '1.fasta',
            path: path.join(experiment1Path, '1.fasta'),
            relative: '/1.fasta',
            size: 17,
            id: 'FILE_18',
          },
        ]);
      });
    });
  });
});
