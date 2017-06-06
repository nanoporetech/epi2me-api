var proxyquire     = require('proxyquire');
var assert         = require("assert");
var sinon          = require("sinon");

describe('._sign method', function () {
    var utils, container;

    beforeEach(function () {
        utils = proxyquire('../../lib/utils', {
            'request' : {}
        });

	utils.secret = "MySuperSecretSigningSecret";

        container = {
            callback: function () {}
        };

        sinon.stub(container, 'callback');
    });

    it('should deterministically sign requests', function () {
	var req = {
	    uri: "https://epi2me-test.example.com/",
	};

        utils._sign(req, {
	    user_agent:    "EPI2ME API",
	    agent_version: "2.48.1",
	    apikey:        "myapikey"
	});
        assert.deepEqual(req.headers["X-EPI2ME-SignatureV0"].length, 40, "expected signature length"); // hard to check signature content as it's time-based
    });
});
