import assert from 'assert';
import sinon from 'sinon';
import axios from 'axios';
import utils from '../../src/utils';

describe('utils.put', () => {
  let stub1;
  let stub2;

  beforeEach(() => {
    stub1 = sinon.stub(axios, 'put').resolves({ data: { data: 'data' } });
    sinon.stub(utils, 'version').callsFake(() => {
      return '3.0.0';
    });
  });

  afterEach(() => {
    stub1.restore();
    utils.version.restore();
  });

  it('should invoke put', async () => {
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
    assert.deepEqual(stub1.args[0], [
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

    assert.deepEqual(stub1.args[0], [
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

    assert.deepEqual(stub1.args[0], [
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
});
