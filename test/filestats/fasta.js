import assert from 'assert';
import path from 'path';
import tmp from 'tmp';
import fs from 'fs-extra';
import filestats from '../../src/filestats/fasta';

describe('epi2me.filestats', () => {
  describe('fasta', async () => {
    const tmpfile = path.join(tmp.dirSync().name, 'foo.txt');
    fs.writeFileSync(tmpfile, '>A_read\nACTGCATG\n>A_nother_read\nACTGACTG\n');

    let struct;
    try {
      struct = await filestats(tmpfile);
    } catch (e) {
      assert.fail(e);
    }
    assert.deepEqual(struct, { type: 'fasta', bytes: 41, sequences: 2 });
  });

  describe('fasta failure', async () => {
    const tmpfile = path.join(tmp.dirSync().name, 'bar.txt');

    try {
      await filestats(tmpfile);
      assert.fail('unexpected success');
    } catch (e) {
      assert.ok(String(e).match(/no such file/));
    }
  });
});
