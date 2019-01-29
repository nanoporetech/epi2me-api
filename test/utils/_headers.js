/* global describe, it */

import assert from 'assert';
import sinon from 'sinon';
import utils from '../../src/utils';

describe('utils._headers', () => {
  let stub;
  beforeEach(() => {
    stub = sinon.stub(utils, '_sign').callsFake();
  });
  afterEach(() => {
    stub.restore();
    sinon.resetHistory();
  });

  it('should create empty headers if none set', () => {
    const req = {};

    utils._headers(req, { user_agent: 'EPI2ME Test', agent_version: '0.0.1' });
    assert(stub.calledOnce);
    assert.deepEqual(req.headers, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-EPI2ME-Client': 'EPI2ME Test',
      'X-EPI2ME-Version': '0.0.1',
    });
  });

  it('should propagate existing headers', () => {
    const req = { headers: { 'accept-language': 'mt' } };
    utils._headers(req, { user_agent: 'EPI2ME Test', agent_version: '0.0.1' });
    assert(stub.calledOnce);
    assert.deepEqual(req.headers, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-EPI2ME-Client': 'EPI2ME Test',
      'X-EPI2ME-Version': '0.0.1',
      'accept-language': 'mt',
    });
  });

  it('should override default headers', () => {
    const req = { headers: { Accept: 'application/gzip', 'Accept-Encoding': 'gzip' } };
    utils._headers(req, { user_agent: 'EPI2ME Test', agent_version: '0.0.1' });
    assert.deepEqual(req.headers, {
      'Accept-Encoding': 'gzip',
      Accept: 'application/gzip',
      'Content-Type': 'application/json',
      'X-EPI2ME-Client': 'EPI2ME Test',
      'X-EPI2ME-Version': '0.0.1',
    });
    assert(stub.calledOnce);
  });

  it('should initialise options', () => {
    const req = { headers: { 'accept-language': 'mt' } };
    utils._headers(req);
    assert.deepEqual(req.headers, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-EPI2ME-Client': '',
      'X-EPI2ME-Version': '0',
      'accept-language': 'mt',
    });
    assert(stub.calledOnce);
  });

  it('should not sign if requested', () => {
    const req = { headers: { 'accept-language': 'mt' } };
    utils._headers(req, { _signing: false });
    assert.deepEqual(req.headers, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-EPI2ME-Client': '',
      'X-EPI2ME-Version': '0',
      'accept-language': 'mt',
    });
    assert(stub.notCalled);
  });
});
