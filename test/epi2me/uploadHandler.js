import EPI2ME from "../../lib/epi2me";
import assert from "assert";
import sinon  from "sinon";
import path   from "path";
import tmp    from "tmp";
import fs     from "fs-extra";

describe('epi2me.uploadHandler', () => {

    let tmpfile = 'tmpfile.txt', tmpdir, client, stubs = [];

    beforeEach(() => {
        tmpdir = tmp.dirSync({unsafeCleanup: true});
        fs.writeFile(path.join(tmpdir.name, tmpfile));
	client = new EPI2ME({
	    log: console,
            inputFolder: tmpdir.name,
        });
	stubs = [];

	stubs.push(sinon.stub(client, "session"));
    });

    afterEach(() => {
	stubs.forEach((s) => { s.restore(); });
    })

    it('should open readStream', (done) => {
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
	let crso = fs.createReadStream;
        stubs.push(sinon.stub(fs, "createReadStream").callsFake((...args) => {
            let readStream = crso(...args);
	    setTimeout(() => { readStream.emit("error"); }, 10); // fire a readstream error at some point after the readstream created
            return readStream;
        }));

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

        client.uploadHandler({ name: tmpfile }, (error) => {
	    assert(String(error).match(/error in upload readstream/), 'unexpected error message format: ' + error);
            done();
        });
    });

    it('should handle bad file name - ENOENT', (done) => {
        client.uploadHandler({name: 'bad file name'}, (msg) => {
            assert(typeof msg !== 'undefined', 'failure');
            done();
        });
    });
});
