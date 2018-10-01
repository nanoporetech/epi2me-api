import REST from "../../lib/rest";
import utils from "../../lib/utils";

const proxyquire = require('proxyquire');
const assert     = require("assert");
const sinon      = require("sinon");

describe('rest.ami_image', () => {
    it('should create an ami_image', () => {
        var client = new REST({
            "url"    : "http://metrichor.local:8080",
            "apikey" : "FooBar02"
        });

	let data = {"aws_id":"ami-12345","name":"mon ami","description":"foo bar baz","id_region":1,"is_active":1};
	let stub = sinon.stub(utils, "_post").callsFake((uri, id, obj, options, cb) => {
            assert.equal(uri, "ami_image");
	    assert.deepEqual(obj, data);
            cb(null, {"status":"success"});
        });

	assert.doesNotThrow(() => {
            client.ami_image(null, data, function(err, obj) {
		assert.equal(err, null, 'no error reported');
		assert.deepEqual(obj, {"status":"success"});
            });
	});

	stub.restore();
    });

    it('should read an ami_image', () => {
        var client = new REST({
            "url"    : "http://metrichor.local:8080",
            "apikey" : "FooBar02"
        });

	let data = {"aws_id":"ami-12345","name":"mon ami","description":"foo bar baz","id_region":1,"is_active":1};
	let stub = sinon.stub(client, "_read").callsFake((uri, id, cb) => {
            assert.equal(uri, "ami_image");
            assert.equal(id, "ami-12345");
            cb(null, data);
        });

	assert.doesNotThrow(() => {
            client.ami_image("ami-12345", (err, obj) => {
		assert.equal(err, null, 'no error reported');
		assert.deepEqual(obj, data);
            });
	});

	stub.restore();
    });
});
