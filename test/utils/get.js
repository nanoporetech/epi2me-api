import assert from 'assert';
import sinon from 'sinon';
import axios from 'axios';
import { utils } from '../../src/utils';
import { USER_AGENT } from '../../src/UserAgent.constants';
import ProxyAgent from 'proxy-agent'

describe('utils.get', () => {
  let stubs = [];
  let log;

  before(() => {
    log = {
      info: sinon.stub(),
      debug: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      critical: sinon.stub(),
    };
  });

  beforeEach(() => {
    stubs = [];
  });

  afterEach(() => {
    stubs.forEach((s) => {
      s.restore();
    });
    utils.setProxyAgent(undefined)
  });

  it('should invoke get', async () => {
    stubs.push(sinon.stub(axios, 'get').resolves({ data: { data: 'data' } }));
    const data = await utils.get('entity/123', {
      apikey: 'foo',
      url: 'http://epi2me.test',
      agent_version: '3.0.0',
      log,
    });

    assert.deepEqual(data, { data: 'data' });

    assert.deepEqual(axios.get.args[0], [
      'http://epi2me.test/entity/123',
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

  it('should invoke get without url mangling', async () => {
    stubs.push(sinon.stub(axios, 'get').resolves({ data: { data: 'data' } }));
    const data = await utils.get('https://epi2me.internal/entity/123', {
      skip_url_mangle: true,
      apikey: 'foo',
      url: 'http://epi2me.test',
      agent_version: '3.0.0',
      log,
    });

    assert.deepEqual(data, { data: 'data' });

    assert.deepEqual(axios.get.args[0], [
      'https://epi2me.internal/entity/123',
      {
        url: 'https://epi2me.internal/entity/123',
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

  it('should invoke get with proxy', async () => {
    stubs.push(sinon.stub(axios, 'get').resolves({ data: { data: 'data' } }));
    const proxy = 'http://proxy.internal:3128/'
    utils.setProxyAgent(ProxyAgent(proxy));
    const data = await utils.get('entity/123', {
      proxy,
      apikey: 'foo',
      url: 'http://epi2me.test',
      agent_version: '3.0.0',
      log,
    });

    assert.deepEqual(data, { data: 'data' });
    assert(axios.get.args[0][1].httpsAgent, 'custom agent for tunnelled proxy');
    delete axios.get.args[0][1].httpsAgent;
    assert.deepEqual(axios.get.args[0], [
      'http://epi2me.test/entity/123',
      {
        url: 'http://epi2me.test/entity/123',
        proxy: false, // disabled when using custom agent
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

  it('should handle request failure', async () => {
    stubs.push(sinon.stub(axios, 'get').rejects(new Error('request failed')));
    try {
      await utils.get('entity/123', {
        apikey: 'foo',
        url: 'http://epi2me.test',
        log,
      });
      assert.fail('unexpected success');
    } catch (err) {
      assert(String(err).match(/request failed/), 'expected error message');
    }
  });
});
