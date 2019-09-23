import assert from 'assert';
import path from 'path';
import tmp from 'tmp';
import fs from 'fs-extra';
import splitter from '../../src/splitters/fastq';

describe('epi2me.splitters.fastq', () => {
  it('should not split if no maxchunksize', async () => {
    const tmpfile = path.join(tmp.dirSync().name, 'foo.txt');
    fs.writeFileSync(
      tmpfile,
      '@A_read\nACTGCATG\n+\n12345678\n@A_nother_read\n+\nACTGACTG\n12345678\n@B_read\nACTGCATG\n+\n12345678\n@B_nother_read\n+\nACTGACTG\n12345678\n',
    );

    let struct;
    try {
      struct = await splitter(tmpfile);
    } catch (e) {
      assert.fail(e);
    }
    assert.deepEqual(
      struct,
      {
        source: tmpfile,
        split: false,
        chunks: [tmpfile],
      },
      'do not split if no maxchunksize',
    );
  });

  it('should not split if under maxchunksize', async () => {
    const tmpfile = path.join(tmp.dirSync().name, 'foo.txt');
    fs.writeFileSync(
      tmpfile,
      '@A_read\nACTGCATG\n+\n12345678\n@A_nother_read\n+\nACTGACTG\n12345678\n@B_read\nACTGCATG\n+\n12345678\n@B_nother_read\n+\nACTGACTG\n12345678\n',
    );

    let struct;
    try {
      struct = await splitter(tmpfile, 10000);
    } catch (e) {
      assert.fail(e);
    }
    assert.deepEqual(
      struct,
      {
        source: tmpfile,
        split: false,
        chunks: [tmpfile],
      },
      'do not split if under maxchunksize',
    );
  });

  it('should split if over maxchunksize', async () => {
    const tmpfile = path.join(tmp.dirSync().name, 'foo.txt');
    fs.writeFileSync(
      tmpfile,
      '@A_read\nACTGCATG\n+\n12345678\n@A_nother_read\n+\nACTGACTG\n12345678\n@B_read\nACTGCATG\n+\n12345678\n@B_nother_read\n+\nACTGACTG\n12345678\n',
    );

    let struct;
    try {
      struct = await splitter(tmpfile, 5); // tiny maxchunk size is equivalent to split on every read
    } catch (e) {
      assert.fail(e);
    }
    const dirname = path.dirname(tmpfile);
    const basename = path.basename(tmpfile, '.txt');

    assert.deepEqual(
      struct,
      {
        source: tmpfile,
        split: true,
        chunks: [
          `${dirname}/${basename}_1.txt`,
          `${dirname}/${basename}_2.txt`,
          `${dirname}/${basename}_3.txt`,
          `${dirname}/${basename}_4.txt`,
        ],
      },
      'split if over maxchunksize',
    );
  });
});
