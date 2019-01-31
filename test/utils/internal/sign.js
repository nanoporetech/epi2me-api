import assert from 'assert';
import sinon from 'sinon';
import utils from '../../../src/utils';

describe('utils.internal.sign', () => {
  let clock;
  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });

  it('should bail if no apikey', () => {
    const req = {};
    utils.headers(req);
    assert(!('X-EPI2ME-ApiKey' in req.headers), 'signing header not present');
  });

  it('should bail if no apisecret', () => {
    const req = {};
    utils.headers(req, { apikey: 'foobar' });
    assert('X-EPI2ME-ApiKey' in req.headers, 'apikey header present');
    assert(!('X-EPI2ME-SignatureV0' in req.headers), 'signing header not present');
  });

  it('should generate signature with key and secret', () => {
    const req = { uri: 'https://epi2me.test/secretdata' };
    utils.headers(req, { apikey: 'foo', apisecret: 'bar' });
    assert.equal(req.headers['X-EPI2ME-SignatureV0'], '4b1974028ef79622f19140c682d5521023b14f76');
  });

  it('should generate signature with key and secret and mangled https default port', () => {
    const req = { uri: 'https://epi2me.test:443/secretdata' };
    utils.headers(req, { apikey: 'foo', apisecret: 'bar' });
    assert.equal(req.headers['X-EPI2ME-SignatureV0'], '4b1974028ef79622f19140c682d5521023b14f76');
  });

  it('should generate signature with key and secret and mangled http default port', () => {
    const req = { uri: 'http://epi2me.test:80/secretdata' };
    utils.headers(req, { apikey: 'foo', apisecret: 'bar' });
    assert.equal(req.headers['X-EPI2ME-SignatureV0'], '12428aefa4991649f8d11b8d87bc66544ec4f97b');
  });
});
