import REST from "../../lib/rest";
import * as utils from "../../lib/utils";

const assert     = require("assert");
const sinon      = require("sinon");
const bunyan     = require("bunyan");

describe('rest.ami_image', () => {
    it('should update an ami_image', () => {
        var client = new REST({
            "url"    : "http://metrichor.local:8080",
            "apikey" : "FooBar02"
        });

	let data = {"aws_id":"ami-12345","name":"mon ami","description":"foo bar baz","id_region":1,"is_active":1};
	let stub = sinon.stub(utils, "_put").callsFake((uri, id, obj, options, cb) => {
	    assert.equal(id, "ami-12345");
            assert.equal(uri, "ami_image");
	    assert.deepEqual(obj, data);
            cb(null, {"status":"success"});
        });

	assert.doesNotThrow(() => {
            client.ami_image("ami-12345", data, (err, obj) => {
		assert.equal(err, null, 'no error reported');
		assert.deepEqual(obj, {"status":"success"});
            });
	});

	stub.restore();
    });

    it('should create an ami_image', () => {
        var client = new REST({
            "url"    : "http://metrichor.local:8080",
            "apikey" : "FooBar02"
        });

	let data = {"aws_id":"ami-12345","name":"mon ami","description":"foo bar baz","id_region":1,"is_active":1};
	let stub = sinon.stub(utils, "_post").callsFake((uri, obj, options, cb) => {
            assert.equal(uri, "ami_image");
	    assert.deepEqual(obj, data);
            cb(null, {"status":"success"});
        });

	assert.doesNotThrow(() => {
            client.ami_image(data, (err, obj) => {
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

    it('should bail without an id', () => {
        var client = new REST({
            "url"    : "http://metrichor.local:8080",
            "apikey" : "FooBar02"
        });

	let data = {"aws_id":"ami-12345","name":"mon ami","description":"foo bar baz","id_region":1,"is_active":1};
	let stub = sinon.stub(client, "_read").callsFake((uri, id, cb) => {
            assert.equal(uri, "ami_image");
            cb(null, data);
        });

        let fake = sinon.fake();
	assert.doesNotThrow(() => {
            client.ami_image(null, fake);
	});
        assert(fake.calledOnce, "callback invoked");
        assert(fake.firstCall.args[0] instanceof Error);

	stub.restore();
    });
});
