import assert from 'assert';
import sinon from 'sinon';
import utils from '../../src/utils';

describe('._responseHandler method', () => {
  let callback;

  beforeEach(() => {
    callback = sinon.fake();
  });

  it('should handle error status codes', () => {
    utils._responsehandler({ statusCode: 400 }, callback);
    assert(callback.calledOnce);
    assert(callback.calledWith({ error: 'Network error 400' }));
  });

  it('should expect a passed callback', () => {
    assert.throws(() => {
      utils._responsehandler('{"error": "message"}');
    });
  });

  it('should parse body', () => {
    utils._responsehandler({ data: '{"error": "message"}' }, callback);
    assert(callback.calledWith({ error: 'message' }));
    assert(callback.calledOnce);
  });

  it('should parse body and handle bad json', () => {
    utils._responsehandler('{error: message}', callback); // Handles JSON error gracefully
    assert(callback.calledOnce);
  });
});
