import assert from 'assert';
import sinon from 'sinon';
import { utils } from '../../src/utils';
import { USER_AGENT } from '../../src/UserAgent.constants';

describe('utils.headers', () => {
  let clock;
  let log;
  beforeEach(() => {
    clock = sinon.useFakeTimers();
    log = {
      info: sinon.stub(),
      debug: sinon.stub(),
      warn: sinon.stub(),
      error: sinon.stub(),
      critical: sinon.stub(),
    };
  });
  afterEach(() => {
    clock.restore();
  });

  it('should create empty headers if none set', () => {
    const req = {};

    utils.headers(req, {
      agent_version: '0.0.1',
      log,
    });

    assert.deepEqual(req.headers, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-EPI2ME-Client': USER_AGENT,
      'X-EPI2ME-Version': '0.0.1',
    });
  });

  it('should propagate existing headers', () => {
    const req = {
      headers: {
        'accept-language': 'mt',
      },
    };
    utils.headers(req, {
      agent_version: '0.0.1',
      log,
    });

    assert.deepEqual(req.headers, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-EPI2ME-Client': USER_AGENT,
      'X-EPI2ME-Version': '0.0.1',
      'accept-language': 'mt',
    });
  });

  it('should override default headers', () => {
    const req = {
      headers: {
        Accept: 'application/gzip',
        'Accept-Encoding': 'gzip',
      },
    };
    utils.headers(req, {
      agent_version: '0.0.1',
      log,
    });

    assert.deepEqual(req.headers, {
      'Accept-Encoding': 'gzip',
      Accept: 'application/gzip',
      'Content-Type': 'application/json',
      'X-EPI2ME-Client': USER_AGENT,
      'X-EPI2ME-Version': '0.0.1',
    });
  });

  it('should initialise options', () => {
    const req = {
      headers: {
        'accept-language': 'mt',
      },
    };
    utils.headers(req, {
      log,
      agent_version: '3.0.0',
    });
    assert.deepEqual(req.headers, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-EPI2ME-Client': USER_AGENT,
      'X-EPI2ME-Version': '3.0.0',
      'accept-language': 'mt',
    });
  });

  it('should not sign if requested', () => {
    const req = {
      headers: {
        'accept-language': 'mt',
      },
    };
    utils.headers(req, {
      signing: false,
      log,
      agent_version: '3.0.0',
    });
    assert.deepEqual(req.headers, {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-EPI2ME-Client': USER_AGENT,
      'X-EPI2ME-Version': '3.0.0',
      'accept-language': 'mt',
    });
    //    assert(stub.notCalled);
  });
});
