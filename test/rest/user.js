import REST from '../../src/rest';
import utils from '../../src/utils';

const sinon = require('sinon');
const assert = require('assert');
const bunyan = require('bunyan');

describe('rest.user', () => {
  it('must invoke get with options', async () => {
    const ringbuf = new bunyan.RingBuffer({
      limit: 100,
    });
    const log = bunyan.createLogger({
      name: 'log',
      stream: ringbuf,
    });
    const stub = sinon.stub(utils, 'get').callsFake((uri, optionsIn) => {
      const options = optionsIn;
      delete options.agent_version;
      assert.deepEqual(
        options,
        {
          local: false,
          url: 'https://epi2me.nanoporetech.com',
          user_agent: 'EPI2ME API',
          signing: true,
          log,
        },
        'options passed',
      );
      assert.equal(uri, 'user', 'url passed');
    });

    const rest = new REST({
      log,
    });
    try {
      await rest.user();
    } catch (e) {
      assert.fail(`unexpected failure: ${String(e)}`);
    } finally {
      stub.restore();
    }
  });

  it('must yield fake local user', async () => {
    const ringbuf = new bunyan.RingBuffer({
      limit: 100,
    });
    const logger = bunyan.createLogger({
      name: 'log',
      stream: ringbuf,
    });
    const stub = sinon.stub(utils, 'get').callsFake((uri, options) => {
      const { log } = options;
      assert.equal(logger, log, 'options passed');
      assert.equal(uri, 'user', 'url passed');
    });

    const rest = new REST({
      log: logger,
      local: true,
    });

    let user;
    try {
      user = await rest.user();
    } catch (e) {
      assert.fail(`unexpected error ${String(e)}`);
    }

    assert.deepEqual(user, {
      accounts: [
        {
          id_user_account: 'none',
          number: 'NONE',
          name: 'None',
        },
      ],
    });
    stub.restore();
  });
});
