var proxyquire     = require('proxyquire');
var assert         = require("assert");
var sinon          = require("sinon");
var tmp          = require("tmp");
var fs          = require("fs");
var path        = require('path');
var mkdirp        = require('mkdirp');
var utils          = require('../../lib/utils');

describe('utils folder methods: ', function () {
    let tmpInputDir, batch_1, batch_2;

    beforeEach(function () {
        tmpInputDir = tmp.dirSync({unsafeCleanup: true});
        batch_1 = path.join(tmpInputDir.name, 'batch_1');
        batch_2 = path.join(tmpInputDir.name, 'batch_2');
        mkdirp.sync(batch_2);
        mkdirp.sync(batch_1);

    });

    afterEach(function () {
        try {
            tmpInputDir.removeCallback();
        } catch (e) {} // ignore
    });

    describe('._lsFolder', function () {
        it('should only load files and folders passing the filter', function (done) {
            let ignore = (fn) => fn.match(/[1-9]/);
            fs.writeFileSync(path.join(tmpInputDir.name, 'aa.fastq'), ''); // should not pass ignore()
            fs.writeFileSync(path.join(tmpInputDir.name, '1.fastq'), '123'); // file size of 3
            fs.writeFileSync(path.join(tmpInputDir.name, '1.fastq.tmp'), '');
            utils.lsFolder(tmpInputDir.name, ignore, '.fastq')
                .then(({ files, folders }) => {
                    assert.equal(files.length, 1, 'should find the one valid file');
                    assert.equal(files[0].name, '1.fastq', 'should add file name to file object');
                    assert.equal(files[0].size, 3, 'should add file size to file object');
                    assert.equal(folders.length, 2, 'should find the two batch folder');
                    done();
                })
                .catch(done);
        });
    });

    describe('.loadInputFiles', function () {
        it('should only load files in batches', function (done) {

            let outputFolder = path.join(tmpInputDir.name, 'downloaded');
            let uploadedFolder = path.join(tmpInputDir.name, 'uploaded');
            mkdirp.sync(outputFolder);
            mkdirp.sync(uploadedFolder);

            fs.writeFileSync(path.join(batch_1, '1.fastq'), '');
            fs.writeFileSync(path.join(batch_2, '2.fastq'), '');
            fs.writeFileSync(path.join(outputFolder, 'downloaded.fastq'), '');
            fs.writeFileSync(path.join(uploadedFolder, 'uploaded.fastq'), '');

            const opts = {
                inputFolder: tmpInputDir.name,
                outputFolder,
                uploadedFolder,
                filetype: '.fastq'
            };

            utils.loadInputFiles(opts)
                .then((files) => {
                    assert.equal(files.length, 1, 'should find the one valid file');
                    fs.unlinkSync(files[0].path);

                    utils.loadInputFiles(opts)
                        .then(files2 => {
                            assert.equal(files.length, 1, 'should find the one valid file');
                            fs.unlinkSync(files2[0].path);

                            utils.loadInputFiles(opts)
                                .then(files3 => {
                                    assert.equal(files3.length, 0, 'should find the one valid file');
                                    done();
                                })
                                .catch(done);
                            done();
                        })
                        .catch(done);
                })
                .catch(done);
        });
    });
});
