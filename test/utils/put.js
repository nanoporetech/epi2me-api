import assert from 'assert';
import sinon from 'sinon';
import axios from 'axios';
import { utils } from '../../src/utils';
import { USER_AGENT } from '../../src/UserAgent.constants';

describe('utils.put', () => {
  let stubs = [];
  let log;

  beforeEach(() => {
    stubs = [];
    log = {
      info: sinon.stub(),
      debug: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      critical: sinon.stub(),
    };
  });

  afterEach(() => {
    stubs.forEach((s) => {
      s.restore();
    });
  });

  it('should invoke put', async () => {
    stubs.push(sinon.stub(axios, 'put').resolves({ data: { data: 'data' } }));

    const data = await utils.put(
      'entity',
      123,
      {
        name: 'test entity',
      },
      {
        apikey: 'foo',
        url: 'http://epi2me.test',
        agent_version: '3.0.0',
        log,
      },
    );

    assert.deepEqual(data, { data: 'data' });
    assert.deepEqual(axios.put.args[0], [
      'http://epi2me.test/entity/123',
      { name: 'test entity' },
      {
        url: 'http://epi2me.test/entity/123',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-EPI2ME-ApiKey': 'foo',
          'X-EPI2ME-Client': USER_AGENT,
          'X-EPI2ME-Version': '3.0.0',
        },
      },
    ]);
  });

  it('should invoke put with legacy form params', async () => {
    stubs.push(sinon.stub(axios, 'put').resolves({ data: { data: 'data' } }));

    const data = await utils.put(
      'entity',
      123,
      {
        name: 'test entity',
      },
      {
        apikey: 'foo',
        url: 'http://epi2me.test',
        agent_version: '3.0.0',
        legacy_form: true,
        log,
      },
    );

    assert.deepEqual(data, { data: 'data' });

    assert.deepEqual(axios.put.args[0], [
      'http://epi2me.test/entity/123',
      'json=%7B%22name%22%3A%22test%20entity%22%7D&name=test%20entity',
      {
        url: 'http://epi2me.test/entity/123',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-EPI2ME-ApiKey': 'foo',
          'X-EPI2ME-Client': USER_AGENT,
          'X-EPI2ME-Version': '3.0.0',
        },
      },
    ]);
  });

  it('should invoke put with proxy', async () => {
    stubs.push(sinon.stub(axios, 'put').resolves({ data: { data: 'data' } }));

    const data = await utils.put(
      'entity',
      123,
      {
        name: 'test entity',
      },
      {
        apikey: 'foo',
        url: 'http://epi2me.test',
        agent_version: '3.0.0',
        proxy: 'http://proxy.internal:3128/',
        log,
      },
    );

    assert.deepEqual(data, { data: 'data' });
    assert(axios.put.args[0][2].httpsAgent, 'custom agent for tunnelled proxy');
    delete axios.put.args[0][2].httpsAgent;
    assert.deepEqual(axios.put.args[0], [
      'http://epi2me.test/entity/123',
      { name: 'test entity' },
      {
        url: 'http://epi2me.test/entity/123',
        proxy: false,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-EPI2ME-ApiKey': 'foo',
          'X-EPI2ME-Client': USER_AGENT,
          'X-EPI2ME-Version': '3.0.0',
        },
      },
    ]);
  });

  it('should handle put exception', async () => {
    stubs.push(sinon.stub(axios, 'put').rejects(new Error('request failed')));

    try {
      await utils.put(
        'entity',
        123,
        {
          name: 'test entity',
        },
        {
          apikey: 'foo',
          agent_version: '3.0.0',
          url: 'http://epi2me.test',
          log,
        },
      );
      assert.fail('unexpected success');
    } catch (err) {
      assert(String(err).match(/request failed/), 'expected error message');
    }
  });
});
