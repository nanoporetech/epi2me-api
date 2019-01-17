import assert from "assert";
import sinon  from "sinon";
import utils  from "../../lib/utils";

describe('._responseHandler method', () => {
    let callback;

    beforeEach(() => {
	callback = sinon.fake();
    });

    it('should handle error status codes', () => {
        utils._responsehandler(null, {statusCode: 400}, '', callback);
        assert(callback.calledOnce);
        assert(callback.calledWith({"error": "Network error 400"}));
    });

    it('should handle errors', () => {
        assert.throws(() => {
            utils._responsehandler('message', '', ''); // ensure it checks callback exists
        });
        utils._responsehandler('message', '', '', callback);
        assert(callback.calledOnce);
        assert(callback.calledWith('message'));
    });

    it('should parse body and handle bad json', () => {
        assert.throws(() => {
            utils._responsehandler(null, '', '{\"error\": \"message\"}');
        });

        utils._responsehandler(null, '', '{\"error\": \"message\"}', callback);
        assert(callback.calledWith({error: 'message'}));
        assert(callback.calledOnce);

        utils._responsehandler(null, '', '{error: message}', callback); // Handles JSON error gracefully
        assert(callback.calledTwice);
    });
});
