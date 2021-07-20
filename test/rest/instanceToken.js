import sinon from 'sinon';
import assert from 'assert';
import { REST } from '../../src/rest';
import { utils } from '../../src/utils';
import { parseOptions } from '../../src/parseOptions';

describe('rest.instanceToken', () => {
  it('must invoke post with options', async () => {
    const stub = sinon.stub(utils, 'post').resolves({ data: 'some data' });
    const options = parseOptions({
      agent_version: '3.0.0',
    });
    const rest = new REST(options);

    try {
      const response = await rest.instanceToken('12345', { id_dataset: 4567 });

      assert.deepEqual(response, { data: 'some data' }, 'callback args');
    } catch (e) {
      assert.fail(e);
    } finally {
      stub.restore();
    }

    assert.deepEqual(
      stub.args[0],
      [
        'token',
        { id_workflow_instance: '12345', id_dataset: 4567 },
        {
          ...options,
          legacy_form: true,
        },
      ],
      'post args',
    );
  });

  it('must handle error', async () => {
    const stub = sinon.stub(utils, 'post').rejects(new Error('token fail'));
    const options = parseOptions({});
    const rest = new REST(options);
    try {
      await rest.instanceToken('12345');
      assert.fail('unexpected success');
    } catch (e) {
      assert.ok(String(e).match(/token fail/));
    } finally {
      stub.restore();
    }
  });
});
