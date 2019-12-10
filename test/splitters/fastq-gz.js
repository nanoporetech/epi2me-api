import assert from 'assert';
import path from 'path';
import tmp from 'tmp';
import fs from 'fs-extra';
import sinon from 'sinon';
import zlib from 'zlib';
import splitter from '../../src/splitters/fastq-gz';

describe('epi2me.splitters.fastq-gz', () => {
  beforeEach(() => {
    sinon.stub(fs, 'unlink').resolves();
  });

  afterEach(() => {
    fs.unlink.restore();
  });

  it('should not split if no maxchunksize', async () => {
    const tmpfile = path.join(tmp.dirSync().name, 'foo.fq.gz');
    await new Promise(resolve => {
      zlib.gzip(
        '@A_read\nACTGCATG\n+\n12345678\n@A_nother_read\n+\nCTGACTGA\n23456781\n@B_read\nTGCATGAC\n+\n34567812\n@B_nother_read\n+\nGACTGACT\n45678123\n',
        (_, buf) => fs.writeFile(tmpfile, buf).then(resolve),
      );
    });

    let struct;
    try {
      struct = await splitter(tmpfile, null, () => {
        return Promise.resolve();
      });
    } catch (e) {
      assert.fail(e);
    }
    assert.deepEqual(
      struct, {
        source: tmpfile,
        split: false,
        chunks: [tmpfile],
      },
      'do not split if no maxchunksize',
    );
  });

  it('should not split if under maxchunksize', async () => {
    const tmpfile = path.join(tmp.dirSync().name, 'foo.fq.gz');
    await new Promise(resolve => {
      zlib.gzip(
        '@A_read\nACTGCATG\n+\n12345678\n@A_nother_read\n+\nCTGACTGA\n23456781\n@B_read\nTGCATGAC\n+\n34567812\n@B_nother_read\n+\nGACTGACT\n45678123\n',
        (_, buf) => fs.writeFile(tmpfile, buf).then(resolve),
      );
    });

    let struct;
    try {
      struct = await splitter(
        tmpfile, {
          maxChunkBytes: 10000,
        },
        () => {
          return Promise.resolve();
        },
      );
    } catch (e) {
      assert.fail(e);
    }
    assert.deepEqual(
      struct, {
        source: tmpfile,
        split: false,
        chunks: [tmpfile],
      },
      'do not split if under maxchunksize',
    );
  });

  it('should pretend to split if under maxchunkreads', async () => {
    const tmpfile = path.join(tmp.dirSync().name, 'foo.fq.gz');
    await new Promise(resolve => {
      zlib.gzip(
        '@A_read\nACTGCATG\n+\n12345678\n@A_nother_read\n+\nCTGACTGA\n23456781\n@B_read\nTGCATGAC\n+\n34567812\n@B_nother_read\n+\nGACTGACT\n45678123\n',
        (_, buf) => fs.writeFile(tmpfile, buf).then(resolve),
      );
    });

    let struct;
    try {
      struct = await splitter(
        tmpfile, {
          maxChunkReads: 10000,
        },
        () => {
          return Promise.resolve();
        },
      );
    } catch (e) {
      assert.fail(e);
    }

    const dirname = path.dirname(tmpfile);
    const basename = path.basename(tmpfile, '.fq.gz');
    assert.deepEqual(
      struct, {
        source: tmpfile,
        split: true,
        chunks: [`${dirname}/${basename}_1.fq.gz`],
      },
      'do not split if under maxchunkreads',
    );
  });

  it('should split if over maxchunksize', async () => {
    const tmpfile = path.join(tmp.dirSync().name, 'foo.fq.gz');
    await new Promise(resolve => {
      zlib.gzip(
        '@A_read\nACTGCATG\n+\n12345678\n@A_nother_read\n+\nCTGACTGA\n23456781\n@B_read\nTGCATGAC\n+\n34567812\n@B_nother_read\n+\nGACTGACT\n45678123\n',
        (_, buf) => fs.writeFile(tmpfile, buf).then(resolve),
      );
    });

    let struct;
    try {
      struct = await splitter(
        tmpfile, {
          maxChunkBytes: 5,
        },
        () => {
          return Promise.resolve();
        },
      ); // tiny maxchunk size is equivalent to split on every read
    } catch (e) {
      assert.fail(e);
    }
    const dirname = path.dirname(tmpfile);
    const basename = path.basename(tmpfile, '.fq.gz');
    assert.deepEqual(
      struct, {
        source: tmpfile,
        split: true,
        chunks: [
          `${dirname}/${basename}_1.fq.gz`,
          `${dirname}/${basename}_2.fq.gz`,
          `${dirname}/${basename}_3.fq.gz`,
          `${dirname}/${basename}_4.fq.gz`,
        ],
      },
      'split if over maxchunksize',
    );
    assert.equal(fs.statSync(`${dirname}/${basename}_1.fq.gz`).size, 48, `${dirname}/${basename}_1.fq.gz`);
    assert.equal(fs.statSync(`${dirname}/${basename}_2.fq.gz`).size, 52, `${dirname}/${basename}_2.fq.gz`);
    assert.equal(fs.statSync(`${dirname}/${basename}_3.fq.gz`).size, 48, `${dirname}/${basename}_3.fq.gz`);
    assert.equal(fs.statSync(`${dirname}/${basename}_4.fq.gz`).size, 52, `${dirname}/${basename}_4.fq.gz`);
  });

  it('should split if over maxchunkreads', async () => {
    const tmpfile = path.join(tmp.dirSync().name, 'foo.fq.gz');
    await new Promise(resolve => {
      zlib.gzip(
        '@A_read\nACTGCATG\n+\n12345678\n@A_nother_read\n+\nCTGACTGA\n23456781\n@B_read\nTGCATGAC\n+\n34567812\n@B_nother_read\n+\nGACTGACT\n45678123\n',
        (_, buf) => fs.writeFile(tmpfile, buf).then(resolve),
      );
    });

    let struct;
    try {
      struct = await splitter(
        tmpfile, {
          maxChunkReads: 2,
        },
        () => {
          return Promise.resolve();
        },
      ); // tiny maxchunk size is equivalent to split on every read
    } catch (e) {
      assert.fail(e);
    }
    const dirname = path.dirname(tmpfile);
    const basename = path.basename(tmpfile, '.fq.gz');

    assert.deepEqual(
      struct, {
        source: tmpfile,
        split: true,
        chunks: [`${dirname}/${basename}_1.fq.gz`, `${dirname}/${basename}_2.fq.gz`],
      },
      'split if over maxchunksize',
    );
    assert.equal(
      fs.statSync(`${dirname}/${basename}_1.fq.gz`).size,
      71,
      `${dirname}/${basename}_1.fq.gz size ${fs.statSync(`${dirname}/${basename}_1.fq.gz`).size}`,
    );
    assert.equal(
      fs.statSync(`${dirname}/${basename}_2.fq.gz`).size,
      71,
      `${dirname}/${basename}_2.fq.gz size ${fs.statSync(`${dirname}/${basename}_2.fq.gz`).size}`,
    );
  });
});
