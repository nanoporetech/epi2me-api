import sinon from 'sinon';
import assert from 'assert';
import REST from '../../src/rest';
import utils from '../../src/utils';
import EPI2ME from '../../src/epi2me';

describe('rest.read', () => {
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
    const stub = sinon.stub(utils, 'get').resolves({ id_thing: 5, name: 'thing five' });
    stubs.push(stub);
    const options = EPI2ME.parseOptObject({
      agent_version: '3.0.0',
    });
    const rest = new REST(options);

    try {
      const struct = await rest.read('thing', 5);
      assert.deepEqual(struct, { id_thing: 5, name: 'thing five' });
      assert.deepEqual(stub.lastCall.args, ['thing/5', options]);
    } catch (e) {
      assert.fail(e);
    }
  });

  it('must catch request failure with structured error', async () => {
    const fake = sinon.fake();
    const stub = sinon.stub(utils, 'get').rejects(new Error('get failure'));
    stubs.push(stub);
    const options = EPI2ME.parseOptObject({});
    const rest = new REST(options);

    try {
      await rest.read('thing', 5, fake);
      assert.fail('unexpected success');
    } catch (err) {
      assert(String(err).match(/get failure/), 'expected error');
    }
  });
});
