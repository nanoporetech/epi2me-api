import assert from 'assert';
import path from 'path';
import tmp from 'tmp';
import fs from 'fs-extra';
import filestats from '../../src/filestats/default';

describe('epi2me.filestats', () => {
  describe('default', async () => {
    const tmpfile = path.join(tmp.dirSync().name, 'foo.txt');
    fs.writeFileSync(tmpfile, 'foobar');

    let struct;
    try {
      struct = await filestats(tmpfile);
    } catch (e) {
      assert.fail(e);
    }
    assert.deepEqual(struct, { type: 'bytes', bytes: 6 });
  });

  describe('default failure', async () => {
    const tmpfile = path.join(tmp.dirSync().name, 'bar.txt');

    try {
      await filestats(tmpfile);
      assert.fail('unexpected success');
    } catch (e) {
      assert.ok(String(e).match(/no such file/));
    }
  });
});
