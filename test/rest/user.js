import assert from 'assert';
import sinon from 'sinon';
import { REST } from '../../src/rest';
import { utils } from '../../src/utils';
import { parseOptions } from '../../src/parseOptions';

describe('rest.user', () => {
  it('must invoke get with options', async () => {
    const options = parseOptions({});
    const rest = new REST(options);
    const stub = sinon.stub(utils, 'get');

    try {
      await rest.user();
    } catch (e) {
      assert.fail(`unexpected failure: ${String(e)}`);
    } finally {
      stub.restore();
    }

    assert.deepEqual(stub.args[0], ['user', options], 'get args');
  });

  it('must yield fake local user', async () => {
    const options = parseOptions({
      local: true,
    });
    const rest = new REST(options);
    const stub = sinon.stub(utils, 'get');

    let user;
    try {
      user = await rest.user();
    } catch (e) {
      assert.fail(`unexpected error ${String(e)}`);
    } finally {
      stub.restore();
    }

    assert(stub.notCalled);

    assert.deepEqual(user, {
      accounts: [
        {
          id_user_account: 'none',
          number: 'NONE',
          name: 'None',
        },
      ],
    });
  });
});
