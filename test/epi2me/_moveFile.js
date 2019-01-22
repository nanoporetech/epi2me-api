import assert    from "assert";
import sinon     from "sinon";
import bunyan    from "bunyan";
import queue     from "queue-async";
import fs        from "fs-extra";
import tmp       from "tmp";
import path      from "path";
import { merge } from "lodash";
import AWS       from "aws-sdk";
import EPI2ME    from "../../lib/epi2me";

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

    it("should handle mkdirp error without unlink error", () => {
        let workingDir = tmp.dirSync().name;
        fs.mkdirpSync(path.join(workingDir, "uploaded"));
        let client     = clientFactory({
            inputFolder: workingDir,
        });
        client._uploadedFiles = [];
        client._stats.upload.totalSize = 0;

        let mkdirp    = sinon.stub(fs, "mkdirp").rejects(new Error("mkdirp failed"));
        let successCb = sinon.fake();
        let file = {
            id: "my-file",
            size: 10,
            name: "fileA.fq",
            batch: "batchB",
            path: path.join(workingDir, "batchB", "fileA.fq"),
        };

        assert.doesNotThrow(() => {
            client
                ._moveUploadedFile(file, successCb, type)
                .then(() => {
                    assert.ok(successCb.calledOnce, "success callback fired");
                    sinon.assert.calledWith(successCb, "my-file upload mkdirp exception Error: mkdirp failed");
                })
                .catch((err) => {
                    assert.fail("FAIL");
                });
        });

        mkdirp.restore();
    });

    it("should handle mkdirp error with unlink error", () => {
        let workingDir = tmp.dirSync().name;
        fs.mkdirpSync(path.join(workingDir, "uploaded"));
        let client     = clientFactory({
            inputFolder: workingDir,
        });
        client._uploadedFiles = [];
        client._stats.upload.totalSize = 0;

        let remove    = sinon.stub(fs, "remove").rejects(new Error("failed to remove")); // weird scoping problem - this doesn't work correctly
        let mkdirp    = sinon.stub(fs, "mkdirp").rejects(new Error("mkdirp failed"));
        let successCb = sinon.fake();
        let file = {
            id: "my-file",
            size: 10,
            name: "fileA.fq",
            batch: "batchB",
            path: path.join(workingDir, "batchB", "fileA.fq"),
        };

        assert.doesNotThrow(() => {
            client
                ._moveUploadedFile(file, successCb, type)
                .then(() => {
                    assert.ok(successCb.calledOnce, "success callback fired");
                    sinon.assert.calledWith(successCb, "my-file upload mkdirp exception Error: mkdirp failed");
//                    assert.ok(warn.args[0][0].match(/my-file failed to delete.*failed to remove/), "deletion failure logged"); // fs.remove stub scoping broken
                });
        });

        mkdirp.restore();
        remove.restore();
    });

    it("should handle no mkdirp error with move error", () => {
        let workingDir = tmp.dirSync().name;
        fs.mkdirpSync(path.join(workingDir, "uploaded"));
        let client     = clientFactory({
            inputFolder: workingDir,
        });
        client._uploadedFiles = [];
        client._stats.upload.totalSize = 0;

        fs.mkdirpSync(path.join(workingDir, "batchB")); // source folder present
        fs.mkdirpSync(path.join(workingDir, "uploaded", "batchB")); // target folder present
        fs.writeFileSync(path.join(workingDir, "uploaded", "batchB", "fileA.fq")); // target file to remove without error

        let successCb = sinon.fake();

        let file = {
            id: "my-file",
            size: 10,
            name: "fileA.fq",
            batch: "batchB",
            path: path.join(workingDir, "batchB", "fileA.fq"),
        };

        assert.doesNotThrow(() => {
            client
                ._moveUploadedFile(file, successCb, type)
                .then(() => {
                        assert.ok(successCb.calledOnce, "success callback fired");
                    assert.ok(successCb.args[0][0].match(/move error/), "error message returned");
                });
        });
    });

    it("should handle no mkdirp error and no move error", () => {
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

        let successCb = sinon.fake();

        let file = {
            id: "my-file",
            size: 10,
            name: "fileA.fq",
            batch: "batchB",
            path: path.join(workingDir, "batchB", "fileA.fq"),
        };

        assert.doesNotThrow(() => {
            client
                ._moveUploadedFile(file, successCb, type)
                .then(() => {
                        assert.ok(successCb.calledOnce, "success callback fired");console.log(successCb.args);
//                    assert.ok(successCb.args[0][0].match(/move failed/), "error message returned");
                });
        });
    });
    /*
    it('should move file to upload folder', () => {
    });
    it("should handle EXDIR cross-filesystem errors (fs-extra)", () => {
    });
    it('should handle non-existing input file', () => {
    });*/
});
