import assert from 'assert';
import path from 'path';
import tmp from 'tmp';
import fs from 'fs-extra';
import { fastaFileStatistics } from '../../src/filestats/fasta';

describe('epi2me.filestats.fasta', () => {
  it('should stat', async () => {
    const tmpfile = path.join(tmp.dirSync().name, 'foo.txt');
    fs.writeFileSync(tmpfile, '>A_read\nACTGCATG\n>A_nother_read\nACTGACTG\n');

    let struct;
    try {
      struct = await fastaFileStatistics(tmpfile);
    } catch (e) {
      assert.fail(e);
    }
    assert.deepEqual(struct, {
      type: 'fasta',
      bytes: 41,
      sequences: 2,
    });
  });

  it('should fail', async () => {
    const tmpfile = path.join(tmp.dirSync().name, 'bar.txt');

    try {
      await fastaFileStatistics(tmpfile);
      assert.fail('unexpected success');
    } catch (e) {
      assert.ok(String(e).match(/no such file/));
    }
  });
});
