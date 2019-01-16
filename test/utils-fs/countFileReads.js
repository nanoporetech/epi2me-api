import assert from "assert";
import sinon  from "sinon";
import tmp    from "tmp";
import fs     from "fs-extra";
import path   from "path";
import utils  from "../../lib/utils-fs";

describe("utils-fs.countFileReads", () => {
    it("should count lines in a file", async () => {
	let fn = path.join(tmp.dirSync().name, "file.fq");

	fs.writeFileSync(fn, "one\ntwo\nthree\nfour\none\ntwo\nthree\nfour\n");
	let count = await utils
	    .countFileReads(fn);

	assert.equal(count, 2, "counted reads");
    });
});
