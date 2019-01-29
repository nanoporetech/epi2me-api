import assert from 'assert';
import sinon from 'sinon';
import utils from '../../src/utils';

describe('._responseHandler method', () => {
  let callback;

  beforeEach(() => {
    callback = sinon.fake();
  });

  it('should handle error status codes', done => {
    utils
      ._responsehandler({ status: 400, data: {} }, callback)
      .then(() => {
        throw new Error('was not supposed to succeed');
      })
      .catch(({ message }) => {
        assert(message === 'Network error 400', 'Error thrown correctly');
        assert(callback.calledOnce);
        assert(callback.calledWith({ error: 'Network error 400' }));
        done();
      });
  });

  it('should handle no response object', done => {
    utils
      ._responsehandler('{"error": "message"}')
      .then(() => {
        throw new Error('Not supposed to succeed');
      })
      .catch(({ message }) => {
        assert(
          message === 'No response: please check your network connection and try again.',
          'Error thrown correctly',
        );
        done();
      });
  });

  it('should expect a passed callback', done => {
    utils
      ._responsehandler({ data: '{"error": "message"}' })
      .then(() => {
        throw new Error('Not supposed to succeed');
      })
      .catch(({ message }) => {
        assert(message === 'message', 'Error thrown correctly');
        done();
      });
  });

  it('should parse body - body contains JSON error', done => {
    utils
      ._responsehandler({ data: '\n{"error":\n "message"\n}' }, callback)
      .then(() => {
        throw new Error('Not supposed to succeed');
      })
      .catch(({ message }) => {
        assert(message === 'message', 'Error extracted and thrown correctly');
        assert(callback.calledWith({ error: 'message' }));
        assert(callback.calledOnce);
        done();
      });
  });

  it('should parse body - body contains NO JSON error', done => {
    utils
      ._responsehandler({ data: '\n{"state":\n "success"\n}' }, callback)
      .then(() => {
        assert(callback.calledWith(null, { state: 'success' }));
        assert(callback.calledOnce);
        done();
      })
      .catch(error => {
        throw new Error('Not supposed to fail');
      });
  });

  it('should parse body and handle bad json', done => {
    utils
      ._responsehandler({ data: '{error: message}' }, callback) // Handles JSON error gracefully
      .then(() => {
        throw new Error('Not supposed to succeed');
      })
      .catch(({ message }) => {
        assert(
          message === 'SyntaxError: Unexpected token e in JSON at position 1',
          'Error extracted and thrown correctly',
        );
        assert(callback.calledWith({ error: 'SyntaxError: Unexpected token e in JSON at position 1' }));
        assert(callback.calledOnce);
        done();
      });
  });
});
