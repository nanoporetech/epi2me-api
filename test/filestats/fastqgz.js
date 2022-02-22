import assert from 'assert';
import fs from 'fs-extra';
import path from 'path';
import tmp from 'tmp';
import { gzipSync } from 'zlib';
import { filestats } from '../../src/filestats';

describe('epi2me.filestats.fastqgz', () => {
  it('should pass', async () => {
    const tmpfile = path.join(tmp.dirSync().name, 'foo.fq.gz');
    const buf = gzipSync('@A_read\nACTGCATG\n+\n12345678\n@A_nother_read\n+\nACTGACTG\n12345678\n');
    await fs.writeFile(tmpfile, buf);

    let struct;
    try {
      struct = await filestats(tmpfile);
    } catch (e) {
      assert.fail(e);
    }
    assert.deepEqual(struct, {
      type: 'gz',
      bytes: 65,
      reads: 2,
    });
  });
});
