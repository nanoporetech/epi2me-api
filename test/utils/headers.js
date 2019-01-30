/* global describe, it */

import assert from 'assert';
import sinon from 'sinon';
import utils from '../../src/utils';

describe('utils.headers', () => {
  let stub;
  let clock;
  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });
  afterEach(() => {
    clock.restore();
  });

  it('should create empty headers if none set', () => {
    const req = {};

    utils.headers(req, { user_agent: 'EPI2ME Test', agent_version: '0.0.1' });

    assert.deepEqual(req.headers, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-EPI2ME-Client': 'EPI2ME Test',
      'X-EPI2ME-Version': '0.0.1',
    });
  });

  it('should propagate existing headers', () => {
    const req = { headers: { 'accept-language': 'mt' } };
    utils.headers(req, { user_agent: 'EPI2ME Test', agent_version: '0.0.1' });

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
    utils.headers(req, { user_agent: 'EPI2ME Test', agent_version: '0.0.1' });

    assert.deepEqual(req.headers, {
      'Accept-Encoding': 'gzip',
      Accept: 'application/gzip',
      'Content-Type': 'application/json',
      'X-EPI2ME-Client': 'EPI2ME Test',
      'X-EPI2ME-Version': '0.0.1',
    });
  });

  it('should initialise options', () => {
    const versionBackup = `${utils.version}`;
    utils.version = '3.0.0';
    const req = { headers: { 'accept-language': 'mt' } };
    utils.headers(req);
    assert.deepEqual(req.headers, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-EPI2ME-Client': 'api',
      'X-EPI2ME-Version': '3.0.0',
      'accept-language': 'mt',
    });
    utils.version = versionBackup;
  });

  it('should not sign if requested', () => {
    const versionBackup = `${utils.version}`;
    utils.version = '3.0.0';
    const req = { headers: { 'accept-language': 'mt' } };
    utils.headers(req, { signing: false });
    assert.deepEqual(req.headers, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-EPI2ME-Client': 'api',
      'X-EPI2ME-Version': '3.0.0',
      'accept-language': 'mt',
    });
    //    assert(stub.notCalled);
    utils.version = versionBackup;
  });
});
