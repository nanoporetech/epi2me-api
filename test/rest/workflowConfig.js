import sinon from 'sinon';
import assert from 'assert';
import { REST } from '../../src/rest';
import { utils } from '../../src/utils';
import { parseOptions } from '../../src/parseOptions';

describe('rest.workflowConfig', () => {
  it('must invoke get with options', async () => {
    const options = parseOptions({
      agent_version: '3.0.0',
    });
    const rest = new REST(options);
    const stub = sinon.stub(utils, 'get');

    try {
      await rest.workflowConfig('1234');
    } catch (e) {
      assert.fail(e);
    } finally {
      stub.restore();
    }

    assert.deepEqual(stub.args[0], ['workflow/config/1234', options], 'get args');
  });
});
