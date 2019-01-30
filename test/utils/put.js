import assert from 'assert';
import sinon from 'sinon';
import axios from 'axios';
import utils from '../../src/utils';

describe('utils.put', () => {
  let stubs;

  beforeEach(() => {
    stubs = [];
    stubs.push(
      sinon.stub(utils, 'version').callsFake(() => {
        return '3.0.0';
      }),
    );
  });

  afterEach(() => {
    stubs.forEach(s => {
      s.restore();
    });
  });

  it('should invoke put', async () => {
    stubs.push(sinon.stub(axios, 'put').resolves({ data: { data: 'data' } }));
    const req = {};

    let data = await utils.put(
      'entity',
      123,
      {
        name: 'test entity',
      },
      {
        apikey: 'foo',
        url: 'http://epi2me.test',
      },
    );

    assert.deepEqual(data, { data: 'data' });
    assert.deepEqual(axios.put.args[0], [
      'http://epi2me.test/entity/123',
      {
        uri: 'http://epi2me.test/entity/123',
        body: '{"name":"test entity"}',
        gzip: true,
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

  it('should invoke put with legacy form params', async () => {
    stubs.push(sinon.stub(axios, 'put').resolves({ data: { data: 'data' } }));
    const req = {};

    let data = await utils.put(
      'entity',
      123,
      {
        name: 'test entity',
      },
      {
        apikey: 'foo',
        url: 'http://epi2me.test',
        legacy_form: true,
      },
    );

    assert.deepEqual(data, { data: 'data' });

    assert.deepEqual(axios.put.args[0], [
      'http://epi2me.test/entity/123',
      {
        uri: 'http://epi2me.test/entity/123',
        body: '{"name":"test entity"}',
        form: { json: '{"name":"test entity"}' },
        gzip: true,
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

  it('should invoke put with proxy', async () => {
    stubs.push(sinon.stub(axios, 'put').resolves({ data: { data: 'data' } }));
    const req = {};

    let data = await utils.put(
      'entity',
      123,
      {
        name: 'test entity',
      },
      {
        apikey: 'foo',
        url: 'http://epi2me.test',
        proxy: 'http://proxy.internal:3128/',
      },
    );

    assert.deepEqual(data, { data: 'data' });

    assert.deepEqual(axios.put.args[0], [
      'http://epi2me.test/entity/123',
      {
        uri: 'http://epi2me.test/entity/123',
        body: '{"name":"test entity"}',
        gzip: true,
        proxy: 'http://proxy.internal:3128/',
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

  it('should handle put exception', async () => {
    stubs.push(sinon.stub(axios, 'put').rejects(new Error('request failed')));
    const req = {};

    try {
      let data = await utils.put(
        'entity',
        123,
        {
          name: 'test entity',
        },
        {
          apikey: 'foo',
          url: 'http://epi2me.test',
        },
      );
      assert.fail('unexpected success');
    } catch (err) {
      assert(String(err).match(/request failed/), 'expected error message');
    }
  });
});
