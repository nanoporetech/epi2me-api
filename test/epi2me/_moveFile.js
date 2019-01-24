import assert    from "assert";
import sinon     from "sinon";
import bunyan    from "bunyan";
import fs        from "fs-extra";
import tmp       from "tmp";
import path      from "path";
import { merge } from "lodash";
import AWS       from "aws-sdk";
import EPI2ME    from "../../src/epi2me";

describe('epi2me._moveFile', () => {

    let debug, info, warn, error;
    let type = "upload";

    const clientFactory = (opts) => {
        return new EPI2ME(merge({
            url: "https://epi2me-test.local",
            log: {
                debug: debug,
                info:  info,
                warn:  warn,
                error: error,
            }
        }, opts));
    };

    beforeEach(() => {
        // reset loggers
        debug = sinon.stub();
        info  = sinon.stub();
        warn  = sinon.stub();
        error = sinon.stub();
    });

    it("should handle mkdirp error without unlink error", async () => {
        let workingDir = tmp.dirSync().name;
        fs.mkdirpSync(path.join(workingDir, "uploaded"));
        let client     = clientFactory({
            inputFolder: workingDir,
        });
        client._uploadedFiles = [];
        client._stats.upload.totalSize = 0;

        let mkdirp    = sinon.stub(fs, "mkdirp").rejects(new Error("mkdirp failed"));
        let file = {
            id: "my-file",
            size: 10,
            name: "fileA.fq",
            batch: "batchB",
            path: path.join(workingDir, "batchB", "fileA.fq"),
        };

	let err;
	try {
            await client._moveFile(file, "upload");
	} catch (e) {
	    err = e;
	}

	assert.ok(String(err).match(/mkdirp failed/), "mkdirp error propagated");

        mkdirp.restore();
    });

    it("should handle mkdirp error with unlink error", async () => {
        let workingDir = tmp.dirSync().name;
        fs.mkdirpSync(path.join(workingDir, "uploaded"));
        let client     = clientFactory({
            inputFolder: workingDir,
        });
        client._uploadedFiles = [];
        client._stats.upload.totalSize = 0;

        let remove    = sinon.stub(fs, "remove").rejects(new Error("failed to remove"));
        let mkdirp    = sinon.stub(fs, "mkdirp").rejects(new Error("mkdirp failed"));

        let file = {
            id: "my-file",
            size: 10,
            name: "fileA.fq",
            batch: "batchB",
            path: path.join(workingDir, "batchB", "fileA.fq"),
        };

	let err;
        try {
            await client._moveFile(file, "upload");
	} catch (e) {
	    err = e;
	}

	assert.ok(String(err).match(/mkdirp failed/), "mkdirp error propagated");
	assert.ok(warn.args[0][0].match(/my-file upload additionally failed to delete.*failed to remove/), "deletion failure logged");

        mkdirp.restore();
        remove.restore();
    });

    it("should handle no mkdirp error with move error", async () => {
        let workingDir = tmp.dirSync().name;
        fs.mkdirpSync(path.join(workingDir, "uploaded"));
        let client     = clientFactory({
            inputFolder: workingDir,
        });
        client._uploadedFiles = [];
        client._stats.upload.totalSize = 0;

        fs.mkdirpSync(path.join(workingDir, "batchB")); // source folder present
        fs.mkdirpSync(path.join(workingDir, "uploaded", "batchB")); // target folder present

        let file = {
            id: "my-file",
            size: 10,
            name: "fileA.fq",
            batch: "batchB",
            path: path.join(workingDir, "batchB", "fileA.fq"),
        };

	let err;
	try {
            await client._moveFile(file, "upload");
	} catch (e) {
	    err = e;
	}

        assert.ok(String(err).match(/no such file/), "error message returned");
    });

    it("should handle no mkdirp error and no move error", async () => {
        let workingDir = tmp.dirSync().name;
        fs.mkdirpSync(path.join(workingDir, "uploaded"));
        let client     = clientFactory({
            inputFolder: workingDir,
        });
        client._uploadedFiles = [];
        client._stats.upload.totalSize = 0;

        fs.mkdirpSync(path.join(workingDir, "batchB")); // source folder present
        fs.mkdirpSync(path.join(workingDir, "uploaded", "batchB")); // target folder present
        fs.writeFileSync(path.join(workingDir, "batchB", "fileA.fq")); // source file present

        let file = {
            id: "my-file",
            size: 10,
            name: "fileA.fq",
            batch: "batchB",
            path: path.join(workingDir, "batchB", "fileA.fq"),
        };

	let err;
	try {
            await client._moveFile(file, "upload");
	} catch (e) {
	    err = e;
	}

	if(err) {
	    assert.fail(err);
	}

        assert.ok(!err, "no error thrown");
	// check successful filesystem state here
    });
    /*
    it('should move file to upload folder', () => {
    });
    it("should handle EXDIR cross-filesystem errors (fs-extra)", () => {
    });
    it('should handle non-existing input file', () => {
    });*/
});
