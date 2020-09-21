import sinon from 'sinon';
import assert from 'assert';
import os from 'os';
import { REST } from '../../src/rest';
import { utils } from '../../src/utils';
import { EPI2ME } from '../../src/epi2me';

describe('rest.register', () => {
  let stubs;

  beforeEach(() => {
    stubs = [];
  });

  afterEach(() => {
    stubs.forEach((s) => {
      s.restore();
    });
  });

  it('must invoke post with details', async () => {
    const stub = sinon.stub(utils, 'put').resolves({});
    stubs.push(stub);
    stubs.push(
      sinon.stub(os, 'userInfo').callsFake(() => ({
        username: 'testuser',
      })),
    );
    stubs.push(sinon.stub(os, 'hostname').callsFake(() => 'testhost'));
    const options = EPI2ME.parseOptObject({
      agent_version: '3.0.0',
    });
    const rest = new REST(options);

    try {
      await rest.register('abcdefg');
      //    assert(fake.calledOnce, 'callback invoked');
      assert.deepEqual(
        stub.lastCall.args,
        [
          'reg',
          'abcdefg',
          {
            description: 'testuser@testhost',
          },
          { ...options, signing: false },
        ],
        'put args',
      );
    } catch (e) {
      assert.fail(e);
    }
  });
});
