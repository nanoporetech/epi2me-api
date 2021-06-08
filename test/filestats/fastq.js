import assert from 'assert';
import fs from 'fs-extra';
import path from 'path';
import tmp from 'tmp';
import { fastqFileStatistics } from '../../src/filestats/fastq';

describe('epi2me.filestats.fastq', () => {
  it('should pass', async () => {
    const tmpfile = path.join(tmp.dirSync().name, 'foo.txt');
    fs.writeFileSync(tmpfile, '@A_read\nACTGCATG\n+\n12345678\n@A_nother_read\n+\nACTGACTG\n12345678\n');

    let struct;
    try {
      struct = await fastqFileStatistics(tmpfile);
    } catch (e) {
      assert.fail(e);
    }
    assert.deepEqual(struct, {
      type: 'fastq',
      bytes: 63,
      reads: 2,
    });
  });

  it('should fail', async () => {
    const tmpfile = path.join(tmp.dirSync().name, 'bar.txt');

    try {
      await fastqFileStatistics(tmpfile);
      assert.fail('unexpected success');
    } catch (e) {
      assert.ok(String(e).match(/no such file/));
    }
  });
});
