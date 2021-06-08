import assert from 'assert';
import sinon from 'sinon';
import axios from 'axios';
import { utils } from '../../src/utils';

describe('utils.post', () => {
  let stubs = [];
  let log;
  const versionBackup = `${utils.version}`;

  before(() => {
    utils.version = '3.0.0';
  });

  after(() => {
    utils.version = versionBackup;
  });

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

  it('should invoke post', async () => {
    stubs.push(
      sinon.stub(axios, 'post').resolves({
        data: {
          data: 'data',
        },
      }),
    );
    const data = await utils.post(
      'entity',
      {
        id_entity: 123,
        name: 'test entity',
      },
      {
        apikey: 'foo',
        url: 'http://epi2me.test',
        log,
      },
    );

    assert.deepEqual(data, {
      data: 'data',
    });

    assert.deepEqual(axios.post.args[0], [
      'http://epi2me.test/entity',
      {
        id_entity: 123,
        name: 'test entity',
      },
      {
        url: 'http://epi2me.test/entity',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-EPI2ME-ApiKey': 'foo',
          'X-EPI2ME-Client': 'api',
          'X-EPI2ME-Version': '3.0.0',
        },
      },
    ]);
  });

  it('should invoke post with legacy form params', async () => {
    stubs.push(
      sinon.stub(axios, 'post').resolves({
        data: {
          data: 'data',
        },
      }),
    );
    const data = await utils.post(
      'entity',
      {
        id_entity: 123,
        name: 'test entity',
      },
      {
        apikey: 'foo',
        url: 'http://epi2me.test',
        legacy_form: true,
        log,
      },
    );

    assert.deepEqual(data, {
      data: 'data',
    });

    assert.deepEqual(axios.post.args[0], [
      'http://epi2me.test/entity',
      'id_entity=123&json=%7B%22id_entity%22%3A123%2C%22name%22%3A%22test%20entity%22%7D&name=test%20entity',
      {
        url: 'http://epi2me.test/entity',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-EPI2ME-ApiKey': 'foo',
          'X-EPI2ME-Client': 'api',
          'X-EPI2ME-Version': '3.0.0',
        },
      },
    ]);
  });

  it('should invoke post with proxy', async () => {
    stubs.push(
      sinon.stub(axios, 'post').resolves({
        data: {
          data: 'data',
        },
      }),
    );
    const data = await utils.post(
      'entity',
      {
        id_entity: 123,
        name: 'test entity',
      },
      {
        apikey: 'foo',
        url: 'http://epi2me.test',
        proxy: 'http://proxy.internal:3128/',
        log,
      },
    );
    assert.deepEqual(data, {
      data: 'data',
    });

    assert(axios.post.args[0][2].httpsAgent, 'custom agent for tunnelled proxy');
    delete axios.post.args[0][2].httpsAgent;
    assert.deepEqual(axios.post.args[0], [
      'http://epi2me.test/entity',
      {
        id_entity: 123,
        name: 'test entity',
      },
      {
        url: 'http://epi2me.test/entity',
        proxy: false,
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-EPI2ME-ApiKey': 'foo',
          'X-EPI2ME-Client': 'api',
          'X-EPI2ME-Version': '3.0.0',
        },
      },
    ]);
  });

  it('should handle post exception', async () => {
    stubs.push(sinon.stub(axios, 'post').rejects(new Error('request failed')));

    try {
      await utils.post(
        'entity',
        {
          id_entity: 123,
          name: 'test entity',
        },
        {
          apikey: 'foo',
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
