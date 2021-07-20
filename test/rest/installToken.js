import sinon from 'sinon';
import assert from 'assert';
import { REST } from '../../src/rest';
import { utils } from '../../src/utils';
import { parseOptions } from '../../src/parseOptions';

describe('rest.installToken', () => {
  it('must invoke post with options', async () => {
    const stub = sinon.stub(utils, 'post').resolves({
      data: 'some data',
    });

    const options = parseOptions({
      agent_version: '3.0.0',
    });
    const rest = new REST(options);

    let token;
    try {
      token = await rest.installToken('12345');
    } catch (e) {
      assert.fail(e);
    } finally {
      stub.restore();
    }

    assert.deepEqual(
      stub.args[0],
      [
        'token/install',
        {
          id_workflow: '12345',
        },
        {
          ...options,
          legacy_form: true,
        },
      ],
      'post args',
    );
    assert.deepEqual(
      token,
      {
        data: 'some data',
      },
      'token content',
    );
  });

  it('must handle error', async () => {
    const stub = sinon.stub(utils, 'post').rejects(new Error('token fail'));
    const options = parseOptions({});
    const rest = new REST(options);

    let err;
    try {
      await rest.installToken('12345');
    } catch (e) {
      err = e;
    } finally {
      stub.restore();
    }
    assert(String(err).match(/token fail/), 'expected error');
  });
});
