import sinon from 'sinon';
import assert from 'assert';
import bunyan from 'bunyan';
import { REST } from '../../src/rest';
import { utils } from '../../src/utils';

describe('rest.stopWorkflow', () => {
  it('must invoke put with details', async () => {
    const ringbuf = new bunyan.RingBuffer({
      limit: 100,
    });
    const log = bunyan.createLogger({
      name: 'log',
      stream: ringbuf,
    });
    const stub = sinon.stub(utils, 'put').callsFake((uri, id, payload, options) => {
      assert.equal(uri, 'workflow_instance/stop', 'type passed');
      assert.equal(id, 123456, 'id passed');
      assert.deepEqual(payload, {}, 'payload passed');
      assert.ok(options.log instanceof bunyan, 'options off');
    });

    const rest = new REST({
      log,
    });

    try {
      await rest.stopWorkflow('123456');
    } catch (e) {
      assert.fail(`unexpected failure: ${String(e)}`);
    } finally {
      stub.restore();
    }
  });
});
