import assert from 'assert';
import sinon from 'sinon';
import utils from '../../src/utils';

describe('utils.responseHandler', () => {
  it('should handle json failure', async () => {
    try {
      await utils.responseHandler({ data: 'notjson' });
      assert.fail('unexpected success');
    } catch (e) {
      assert(String(e).match(/Unexpected token/));
    }
  });

  it('should handle 400-series errors', async () => {
    try {
      await utils.responseHandler({ statusCode: 403, data: '{"data":"some data"}' });
      assert.fail('unexpected success');
    } catch (e) {
      assert(String(e).match(/Network error 403/));
    }
  });

  it('should handle 504 errors', async () => {
    try {
      await utils.responseHandler({ statusCode: 504, data: '{"data":"some data"}' });
      assert.fail('unexpected success');
    } catch (e) {
      assert(String(e).match(/Please check your network connection/));
    }
  });

  it('should handle 400-series with content errors', async () => {
    try {
      await utils.responseHandler({ statusCode: 502, data: '{"error":"proxy timeout"}' });
      assert.fail('unexpected success');
    } catch (e) {
      assert(String(e).match(/proxy timeout/));
    }
  });

  it('should handle success with content errors', async () => {
    try {
      await utils.responseHandler({ statusCode: 200, data: '{"error":"unexpected thing"}' });
      assert.fail('unexpected success');
    } catch (e) {
      assert(String(e).match(/unexpected thing/));
    }
  });

  it('should handle success', async () => {
    try {
      let obj = await utils.responseHandler({ statusCode: 200, data: '{"data":"happy things"}' });
      assert.deepEqual(obj, { data: 'happy things' });
    } catch (e) {
      assert.fail('unexpected success');
    }
  });
});
