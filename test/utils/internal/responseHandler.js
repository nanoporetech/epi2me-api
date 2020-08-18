import assert from 'assert';
import sinon from 'sinon';
import axios from 'axios';
import utils from '../../../src/utils';

describe('utils.internal.responseHandler', () => {
  let stubs;
  beforeEach(() => {
    stubs = [];
  });

  afterEach(() => {
    stubs.forEach((s) => {
      s.restore();
    });
  });

  it('should bail if no json', async () => {
    stubs.push(sinon.stub(axios, 'get').resolves(''));
    try {
      await utils.get('workflow', { url: 'http://epi2me.test' });
      assert.fail('unexpected success');
    } catch (err) {
      assert(String(err).match(/unexpected non-json/));
    }
  });

  it('should handle 400+ series errors with content', async () => {
    stubs.push(sinon.stub(axios, 'get').resolves({ status: 403, data: { error: 'Quo Vadis?' } }));
    try {
      await utils.get('workflow', { url: 'http://epi2me.test' });
      assert.fail('unexpected success');
    } catch (err) {
      assert(String(err).match(/Quo Vadis/));
    }
  });

  it('should handle 400+ series errors without content', async () => {
    stubs.push(sinon.stub(axios, 'get').resolves({ status: 403, data: {} }));
    try {
      await utils.get('workflow', { url: 'http://epi2me.test' });
      assert.fail('unexpected success');
    } catch (err) {
      assert(String(err).match(/Network error/));
    }
  });

  it('should handle 504 errors', async () => {
    stubs.push(sinon.stub(axios, 'get').resolves({ status: 504, data: { error: 'Overwrite me' } }));
    try {
      await utils.get('workflow', { url: 'http://epi2me.test' });
      assert.fail('unexpected success');
    } catch (err) {
      assert(String(err).match(/check your network connection/));
    }
  });

  it('should handle 200 content errors', async () => {
    stubs.push(sinon.stub(axios, 'get').resolves({ status: 200, data: { error: 'application error' } }));
    try {
      await utils.get('workflow', { url: 'http://epi2me.test' });
      assert.fail('unexpected success');
    } catch (err) {
      assert(String(err).match(/application error/));
    }
  });

  it('should handle 200 content', async () => {
    stubs.push(sinon.stub(axios, 'get').resolves({ status: 200, data: { data: 'all good' } }));
    try {
      const data = await utils.get('workflow', { url: 'http://epi2me.test' });
      assert.deepEqual(data, { data: 'all good' });
    } catch (err) {
      assert.fail(err);
    }
  });
});
