/* global describe, it, beforeEach, afterEach */
import assert from 'assert';
import sinon from 'sinon';
import axios from 'axios';
import utils from '../../src/utils';

describe('utils.post', () => {
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

  it('should invoke post', async () => {
    stubs.push(sinon.stub(axios, 'post').resolves({ data: { data: 'data' } }));
    let data = await utils.post(
      'entity',
      {
        id_entity: 123,
        name: 'test entity',
      },
      {
        apikey: 'foo',
        url: 'http://epi2me.test',
      },
    );

    assert.deepEqual(data, { data: 'data' });

    assert.deepEqual(axios.post.args[0], [
      'http://epi2me.test/entity',
      {
        uri: 'http://epi2me.test/entity',
        body: '{"id_entity":123,"name":"test entity"}',
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

  it('should invoke post with legacy form params', async () => {
    stubs.push(sinon.stub(axios, 'post').resolves({ data: { data: 'data' } }));
    let data = await utils.post(
      'entity',
      {
        id_entity: 123,
        name: 'test entity',
      },
      {
        apikey: 'foo',
        url: 'http://epi2me.test',
        legacy_form: true,
      },
    );

    assert.deepEqual(data, { data: 'data' });

    assert.deepEqual(axios.post.args[0], [
      'http://epi2me.test/entity',
      {
        uri: 'http://epi2me.test/entity',
        body: '{"id_entity":123,"name":"test entity"}',
        form: { json: '{"id_entity":123,"name":"test entity"}', id_entity: 123, name: 'test entity' },
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

  it('should invoke post with proxy', async () => {
    stubs.push(sinon.stub(axios, 'post').resolves({ data: { data: 'data' } }));
    let data = await utils.post(
      'entity',
      {
        id_entity: 123,
        name: 'test entity',
      },
      {
        apikey: 'foo',
        url: 'http://epi2me.test',
        proxy: 'http://proxy.internal:3128/',
      },
    );
    assert.deepEqual(data, { data: 'data' });

    assert.deepEqual(axios.post.args[0], [
      'http://epi2me.test/entity',
      {
        uri: 'http://epi2me.test/entity',
        body: '{"id_entity":123,"name":"test entity"}',
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

  it('should handle post exception', async () => {
    stubs.push(sinon.stub(axios, 'post').rejects(new Error('request failed')));
    const req = {};

    try {
      let data = await utils.post(
        'entity',
        {
          id_entity: 123,
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
