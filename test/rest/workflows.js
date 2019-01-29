import fs from 'fs-extra';
import sinon from 'sinon';
import assert from 'assert';
import bunyan from 'bunyan';
import tmp from 'tmp';
import path from 'path';
import { merge } from 'lodash';
import REST from '../../src/rest';

describe('rest.workflow', () => {
  const restFactory = opts => {
    const ringbuf = new bunyan.RingBuffer({ limit: 100 });
    const log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    return new REST(merge({ log }, opts));
  };

  it('must invoke list with options', async () => {
    const rest = restFactory();
    const stub = sinon.stub(rest, 'list').resolves([]);

    const fake = sinon.fake();
    try {
      await rest.workflows(fake);
    } catch (e) {
      assert.fail(e);
    }
    assert(fake.called, 'callback invoked');
    assert.deepEqual(stub.lastCall.args[0], 'workflow', 'list-request args');
    assert.deepEqual(fake.lastCall.args, [null, []], 'callback data');
  });
});
