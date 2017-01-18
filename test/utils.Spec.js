var proxyquire     = require('proxyquire');
var assert         = require("assert");
var sinon          = require("sinon");

describe('._responseHandler method', function () {
    var utils, container;

    beforeEach(function () {
        utils = proxyquire('../lib/utils', {
            'request' : {}
        });
        container = {
            callback: function () {}
        };
        sinon.stub(container, 'callback');
    });

    it('should handle error status codes', function () {
        utils._responsehandler(null, {statusCode: 400}, '', container.callback);
        assert(container.callback.calledWith({"error": "Network error 400"}));
        assert(container.callback.calledOnce);
    });

    it('should handle errors', function () {
        utils._responsehandler('message', '', ''); // ensure it checks callback exists
        utils._responsehandler('message', '', '', container.callback);
        assert(container.callback.calledWith('message'));
        assert(container.callback.calledOnce);
    });

    it('should parse body and handle bad json', function () {
        utils._responsehandler(null, '', '{\"error\": \"message\"}');
        utils._responsehandler(null, '', '{\"error\": \"message\"}', container.callback);
        assert(container.callback.calledWith({error: 'message'}));
        assert(container.callback.calledOnce);
        utils._responsehandler(null, '', '{error: message}', container.callback); // Handles JSON error gracefully
        assert(container.callback.calledTwice);
    });
});