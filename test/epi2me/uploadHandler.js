import assert    from "assert";
import sinon     from "sinon";
import path      from "path";
import tmp       from "tmp";
import fs        from "fs-extra";
import { merge } from "lodash";
import EPI2ME    from "../../src/epi2me";

describe('epi2me.uploadHandler', () => {

    let tmpfile = 'tmpfile.txt', stubs;

    const clientFactory = (opts) => {
	stubs = [];

        let tmpdir = tmp.dirSync().name;
        fs.writeFile(path.join(tmpdir, tmpfile));
	let client = new EPI2ME(merge({
	    inputFolder: tmpdir,
	    url: "https://epi2me-test.local",
	    log: {
		debug: sinon.stub(),
		info:  sinon.stub(),
		warn:  sinon.stub(),
		error: sinon.stub(),
	    }
	}, opts));

	sinon.stub(client, "session").resolves();

	return client;
    };

    afterEach(() => {
	stubs.forEach((s) => { s.restore(); });
    })

    it('should open readStream', (done) => {
	let client = clientFactory();
        stubs.push(sinon.stub(client, "sessionedS3").callsFake(() => {
            return {
                upload: (params, options, cb) => {
                    cb();
                    assert(params);
		    return {
			on: () => {
			    // support for httpUploadProgress
			}
		    };
		}
            };
        }));

        sinon.stub(client, "uploadComplete").resolves();

        client.uploadHandler({name: tmpfile}, (error) => {
            assert(typeof error === 'undefined', 'unexpected error message: ' + error);
            done();
        });
    });

    it('should handle read stream errors', (done) => {
	let client = clientFactory();
	let crso   = fs.createReadStream;
        stubs.push(sinon.stub(fs, "createReadStream").callsFake((...args) => {
            let readStream = crso(...args);
	    readStream.on("open", () => { readStream.emit("error"); }); // fire a readstream error at some point after the readstream created
            return readStream;
        }));

        sinon.stub(client, "sessionedS3").callsFake(() => {
            return {
                upload: (params, options, cb) => {
                    cb();
                    assert(params); // not a very useful test
		    return {
			on: () => {
			    // support for httpUploadProgress
			}
		    };
                }
            };
        });

        sinon.stub(client, "uploadComplete").resolves();

	assert.doesNotThrow(() => {
            client.uploadHandler({ id: "my-file", name: tmpfile }, (error) => {
		assert(String(error).match(/error in upload readstream/), 'unexpected error message format: ' + error);
		done();
            });
	});
    });

    it('should handle bad file name - ENOENT', (done) => {
	let client = clientFactory();
	assert.doesNotThrow(() => {
            client.uploadHandler({ id: "my-file", name: 'bad file name'}, (msg) => {
		assert(typeof msg !== 'undefined', 'failure');
		done();
            });
	});
    });
});
