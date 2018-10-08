const assert  = require("assert");
const sinon   = require("sinon");
const tmp     = require("tmp");
const fs      = require("fs-extra");
const path    = require('path');
const utils   = require('../../lib/utils');

describe('utils folder methods: ', () => {
    let tmpInputDir;

    beforeEach(() => {
        tmpInputDir = tmp.dirSync({unsafeCleanup: true});
        fs.mkdirpSync(path.join(tmpInputDir.name, 'batch_1'));
        fs.mkdirpSync(path.join(tmpInputDir.name, 'batch_2'));

        fs.writeFileSync(path.join(tmpInputDir.name, 'aa.fastq'), ''); // should not pass ignore()
        fs.writeFileSync(path.join(tmpInputDir.name, '1.fastq'), '123'); // file size of 3
        fs.writeFileSync(path.join(tmpInputDir.name, '1.fastq.tmp'), '');
    });

    afterEach(() => {
        try {
            tmpInputDir.removeCallback();
        } catch (e) {} // ignore
    });

    describe('._lsFolder', () => {
        it('should only load files and folders passing the filter', (done) => {
            let ignore = (fn) => fn.match(/[1-9]/);

	    assert.doesNotThrow(() => {
		utils.lsFolder(tmpInputDir.name, ignore, '.fastq')
                    .then(({ files, folders }) => {
			assert.equal(files.length,   1,         'should find the one valid file');
			assert.equal(files[0].name,  '1.fastq', 'should add file name to file object');
			assert.equal(files[0].size,  3,         'should add file size to file object');
			assert.equal(folders.length, 2,         'should find the two batch folder');
			done();
                    });
	    }, () => {}, "lsFolder");
        });

        it('should load all files and folders', (done) => {
	    assert.doesNotThrow(() => {
		utils.lsFolder(tmpInputDir.name, null, '.fastq')
                    .then(({ files, folders }) => {
			assert.equal(files.length,   2,         'should find the one valid file');
			assert.equal(files[0].name,  '1.fastq', 'should add file name to file object');
			assert.equal(files[0].size,  3,         'should add file size to file object');
			assert.equal(folders.length, 2,         'should find the two batch folder');
			done();
                    });
	    }, () => {}, "lsFolder");
        });
    });
});
