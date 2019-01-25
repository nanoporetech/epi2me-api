import assert from 'assert';
import sinon from 'sinon';
import axios from 'axios';
import utils from '../../src/utils';

describe('utils._put', () => {
  let stub1;
  let stub2;

  beforeEach(() => {
    stub1 = sinon.stub(axios, 'put').resolves('data');
    stub2 = sinon.stub(utils, '_responsehandler').callsFake((res, cb) => cb(null, res));
  });

  afterEach(() => {
    stub1.restore();
    stub2.restore();
  });

  it('should invoke put', () => {
    const req = {};

    utils._put(
      'entity',
      123,
      {
        name: 'test entity',
      },
      {
        apikey: 'foo',
        url: 'http://epi2me.test',
      },
      (err, data) => {
        assert.equal(err, null);
        assert.equal(data, 'data');
      },
    );

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

  it('should invoke put with legacy form params', () => {
    const req = {};

    utils._put(
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
      (err, data) => {
        assert.equal(err, null);
        assert.equal(data, 'data');
      },
    );

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

  it('should invoke put with proxy', () => {
    const req = {};

    utils._put(
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
      (err, data) => {
        assert.equal(err, null);
        assert.equal(data, 'data');
      },
    );

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
