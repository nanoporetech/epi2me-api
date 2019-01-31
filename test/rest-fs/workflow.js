import sinon from 'sinon';
import assert from 'assert';
import tmp from 'tmp';
import path from 'path';
import fs from 'fs-extra';
import bunyan from 'bunyan';
import { merge } from 'lodash';
import REST from '../../src/rest-fs';

describe('rest.workflow', () => {
  const restFactory = opts => {
    const ringbuf = new bunyan.RingBuffer({ limit: 100 });
    const log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    return new REST(merge({ log, local: true }, opts));
  };

  it('must invoke read workflow from filesystem', async () => {
    const dir = tmp.dirSync({ unsafeCleanup: true }).name;

    fs.mkdirpSync(path.join(dir, 'workflows', '12345'));
    fs.writeFileSync(
      path.join(dir, 'workflows', '12345', 'workflow.json'),
      JSON.stringify({ id_workflow: 12345, name: 'test', description: 'test workflow 12345' }),
    );

    const rest = restFactory({ url: dir });
    try {
      const data = await rest.workflow('12345');
      assert.deepEqual(data, { id_workflow: 12345, name: 'test', description: 'test workflow 12345' });
    } catch (err) {
      assert.fail(err);
    }
  });

  it('must catch a read-workflow exception from filesystem', async () => {
    const stub = sinon.stub(fs, 'readFileSync').rejects(new Error('no such file or directory'));
    const rest = restFactory({ url: '/path/to/' });

    try {
      await rest.workflow('12345');
    } catch (err) {
      assert(err instanceof Error);
    }
    stub.restore();
  });
});
