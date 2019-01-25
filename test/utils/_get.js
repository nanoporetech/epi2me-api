import assert from 'assert';
import sinon from 'sinon';
import axios from 'axios';
import utils from '../../src/utils';

describe('utils._get', () => {
  let stub1;
  let stub2;

  beforeEach(() => {
    stub1 = sinon.stub(axios, 'get').resolves('data');
    stub2 = sinon.stub(utils, '_responsehandler').callsFake((res, cb) => cb(null, res));
  });

  afterEach(() => {
    stub1.restore();
    stub2.restore();
  });

  it('should invoke get', () => {
    utils._get(
      'entity/123',
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

  it('should invoke get without url mangling', () => {
    utils._get(
      'https://epi2me.internal/entity/123',
      {
        skip_url_mangle: true,
        apikey: 'foo',
        url: 'http://epi2me.test',
      },
      (err, data) => {
        assert.equal(err, null);
        assert.equal(data, 'data');
      },
    );

    assert.deepEqual(stub1.args[0], [
      'https://epi2me.internal/entity/123',
      {
        uri: 'https://epi2me.internal/entity/123',
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

  it('should invoke get with proxy', () => {
    utils._get(
      'entity/123',
      {
        proxy: 'http://proxy.internal:3128/',
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
        proxy: 'http://proxy.internal:3128/',
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
});
