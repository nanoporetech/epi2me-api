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
    const req = { url: 'https://epi2me.test/secretdata' };
    utils.headers(req, { apikey: 'foo', apisecret: 'bar', agent_version: '3.0.0' });
    assert.equal(req.headers['X-EPI2ME-SignatureV0'], 'f7785001cbf15c047d548886330125bdf879c4e8'); // sensitive to api version
  });

  it('should generate signature with key and secret and mangled https default port', () => {
    const req = { url: 'https://epi2me.test:443/secretdata' };
    utils.headers(req, { apikey: 'foo', apisecret: 'bar', agent_version: '3.0.0' });
    assert.equal(req.headers['X-EPI2ME-SignatureV0'], 'f7785001cbf15c047d548886330125bdf879c4e8'); // sensitive to api version
  });

  it('should generate signature with key and secret and mangled http default port', () => {
    const req = { url: 'http://epi2me.test:80/secretdata' };
    utils.headers(req, { apikey: 'foo', apisecret: 'bar', agent_version: '3.0.0' });
    assert.equal(req.headers['X-EPI2ME-SignatureV0'], '1842784c4f5e0ee4e6793dd653e3d05583e46f35'); // sensitive to api version
  });
});
