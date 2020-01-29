import sinon from 'sinon';
import assert from 'assert';
import bunyan from 'bunyan';
import { merge } from 'lodash';
import REST from '../../src/rest';

describe('rest.workflow', () => {
  const restFactory = opts => {
    const ringbuf = new bunyan.RingBuffer({
      limit: 100,
    });
    const log = bunyan.createLogger({
      name: 'log',
      stream: ringbuf,
    });
    return new REST(
      merge(
        {
          log,
        },
        opts,
      ),
    );
  };

  it('must invoke list with options', async () => {
    const rest = restFactory();
    const stub = sinon.stub(rest, 'list').resolves([]);

    let data;
    try {
      data = await rest.workflows();
    } catch (e) {
      assert.fail(e);
    }

    assert.deepEqual(stub.lastCall.args[0], 'workflow', 'list-request args');
    assert.deepEqual(data, [], 'list data');
  });
});
