import assert from 'assert';
import sinon from 'sinon';
import utils from '../../src/utils';

describe('utils._sign', () => {
  it('should create empty headers if none set', () => {
    const req = {};
    utils._sign(req, { apikey: 'foo' });
    assert.deepEqual(req.headers['X-EPI2ME-ApiKey'], 'foo');
  });

  it('should create empty options if none set', () => {
    const req = { headers: {} };
    utils._sign(req);
    assert.deepEqual(req.headers['X-EPI2ME-ApiKey'], null);
  });

  it('should deterministically sign', () => {
    const stub = sinon.stub(Date.prototype, 'toISOString').callsFake(() => '2018-10-02T17:26:00Z');
    const req = { uri: 'https://foo.bar.local' };
    utils._sign(req, { apikey: 'foo', apisecret: 'baz' });
    assert.deepEqual(req.headers, {
      'X-EPI2ME-ApiKey': 'foo',
      'X-EPI2ME-SignatureDate': '2018-10-02T17:26:00Z',
      'X-EPI2ME-SignatureV0': 'db0241d7d87602eedfb4d2a044542290b24d37ef',
    });
    stub.restore();
  });

  it('should strip default http port', () => {
    const stub = sinon.stub(Date.prototype, 'toISOString').callsFake(() => '2018-10-02T17:26:00Z');
    const req = { uri: 'http://foo.bar.local:80/blabla' };
    utils._sign(req, { apikey: 'foo', apisecret: 'baz' });
    assert.equal(req.uri, 'http://foo.bar.local/blabla');
    assert.deepEqual(req.headers, {
      'X-EPI2ME-ApiKey': 'foo',
      'X-EPI2ME-SignatureDate': '2018-10-02T17:26:00Z',
      'X-EPI2ME-SignatureV0': '3b3d08e05e9f7d9bc5ab91a4c3f8b7b6fdf6566e',
    });
    stub.restore();
  });

  it('should strip default https port', () => {
    const stub = sinon.stub(Date.prototype, 'toISOString').callsFake(() => '2018-10-02T17:26:00Z');
    const req = { uri: 'https://foo.bar.local:443/blabla' };
    utils._sign(req, { apikey: 'foo', apisecret: 'baz' });
    assert.equal(req.uri, 'https://foo.bar.local/blabla');
    assert.deepEqual(req.headers, {
      'X-EPI2ME-ApiKey': 'foo',
      'X-EPI2ME-SignatureDate': '2018-10-02T17:26:00Z',
      'X-EPI2ME-SignatureV0': '2e380858608205a0ab457c4b901b0309f945759f',
    });
    stub.restore();
  });
});
