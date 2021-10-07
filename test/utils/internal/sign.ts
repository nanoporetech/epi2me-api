import assert from 'assert';
import sinon from 'sinon';
import { utils } from '../../../src/utils';
import { AxiosRequestConfig } from 'axios';

describe('utils.internal.sign', () => {
  let clock;
  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });

  it('should bail if no apikey', () => {
    const req: AxiosRequestConfig = {};
    utils.headers(req, { url: 'placeholder' });
    assert(!('X-EPI2ME-ApiKey' in req.headers), 'signing header not present');
  });

  it('should bail if no apisecret', () => {
    const req: AxiosRequestConfig = {};
    utils.headers(req, { url: 'placeholder', apikey: 'foobar' });
    assert('X-EPI2ME-ApiKey' in req.headers, 'apikey header present');
    assert(!('X-EPI2ME-SignatureV0' in req.headers), 'signing header not present');
  });

  it('should generate signature with key and secret', () => {
    const req: AxiosRequestConfig = { url: 'https://epi2me.test/secretdata' };
    utils.headers(req, {
      url: 'placeholder',
      apikey: 'foo',
      apisecret: 'bar',
      agent_version: '3.0.0',
    });
    assert.equal(req.headers['X-EPI2ME-SignatureV0'], 'd8bfdb54d55299bafa570cfba52e84e849ff5501'); // sensitive to api version
  });

  it('should generate signature with key and secret and mangled https default port', () => {
    const req: AxiosRequestConfig = { url: 'https://epi2me.test:443/secretdata' };
    utils.headers(req, {
      url: 'placeholder',
      apikey: 'foo',
      apisecret: 'bar',
      agent_version: '3.0.0',
    });
    assert.equal(req.headers['X-EPI2ME-SignatureV0'], 'd8bfdb54d55299bafa570cfba52e84e849ff5501'); // sensitive to api version
  });

  it('should generate signature with key and secret and mangled http default port', () => {
    const req: AxiosRequestConfig = { url: 'http://epi2me.test:80/secretdata' };
    utils.headers(req, {
      url: 'placeholder',
      apikey: 'foo',
      apisecret: 'bar',
      agent_version: '3.0.0',
    });
    assert.equal(req.headers['X-EPI2ME-SignatureV0'], '13fbf87d7b0c51da7a1cfa48103392a0187751c2'); // sensitive to api version
  });
});
