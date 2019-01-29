import assert from 'assert';
import sinon from 'sinon';
import axios from 'axios';
import utils from '../../src/utils';

describe('utils.put', () => {
  let stub1;
  let stub2;

  beforeEach(() => {
    stub1 = sinon.stub(axios, 'put').resolves('data');
    stub2 = sinon.stub(utils, 'responseHandler').callsFake(res => res);
  });

  afterEach(() => {
    stub1.restore();
    stub2.restore();
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

    assert.equal(data, 'data');
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
          'X-EPI2ME-Client': '',
          'X-EPI2ME-Version': '0',
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

    assert.equal(data, 'data');

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
          'X-EPI2ME-Client': '',
          'X-EPI2ME-Version': '0',
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

    assert.equal(data, 'data');

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
          'X-EPI2ME-Client': '',
          'X-EPI2ME-Version': '0',
        },
      },
    ]);
  });
});
