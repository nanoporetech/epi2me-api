import sinon from 'sinon';
import assert from 'assert';
import { REST } from '../../src/rest';
import { utils } from '../../src/utils';
import { parseOptions } from '../../src/parseOptions';

describe('rest.list', () => {
  let stubs;

  beforeEach(() => {
    stubs = [];
  });

  afterEach(() => {
    stubs.forEach((s) => {
      s.restore();
    });
  });

  it('must invoke get with options', async () => {
    const stub = sinon.stub(utils, 'get').resolves({ things: [{ id_thing: 1, name: 'thing one' }] });
    const options = parseOptions({
      agent_version: '3.0.0',
    });
    const rest = new REST(options);
    stubs.push(stub);

    try {
      const list = await rest.list('thing');
      assert.deepEqual(list, [{ id_thing: 1, name: 'thing one' }]);
      assert.deepEqual(stub.lastCall.args, ['thing', options]);
    } catch (e) {
      assert.fail(e);
    }
  });

  it('must catch request failure with structured error', async () => {
    const fake = sinon.fake();
    const stub = sinon.stub(utils, 'get').rejects(new Error('get failure'));
    stubs.push(stub);
    const options = parseOptions({});
    const rest = new REST(options);

    try {
      await rest.list('thing', fake);
    } catch (err) {
      assert(String(err).match(/get failure/), 'expected error');
    }
  });
});
