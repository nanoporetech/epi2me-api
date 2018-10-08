const assert = require("assert");
const sinon  = require("sinon");
const tmp    = require("tmp");
const fs     = require("fs-extra");
const path   = require('path');
const utils  = require('../../lib/utils');

describe('utils folder methods: ', () => {
    let tmpInputDir, batch_1, batch_2;

    beforeEach(() => {
        tmpInputDir = tmp.dirSync({unsafeCleanup: true});
        batch_1 = path.join(tmpInputDir.name, 'batch_1');
        batch_2 = path.join(tmpInputDir.name, 'batch_2');
        fs.mkdirpSync(batch_2);
        fs.mkdirpSync(batch_1);

    });

    afterEach(() => {
        try {
            tmpInputDir.removeCallback();
        } catch (e) {} // ignore
    });

    describe('.loadInputFiles', () => {
        it('should only load files in batches', done => {

            let outputFolder = path.join(tmpInputDir.name, 'downloaded');
            let uploadedFolder = path.join(tmpInputDir.name, 'uploaded');
            fs.mkdirpSync(outputFolder);
            fs.mkdirpSync(uploadedFolder);

            /**
             * Test folder structure:
             * downloaded/downloaded.fastq  should be ignored
             * uploaded/uploaded.fastq      should be ignored
             * batch_1/1.fastq              should be picked up
             * batch_2/2.fastq              should be picked up
             */
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

            // stepping through the file system as this is intented to work:
            // first load one batch, then the next, then once all files are gone, return null
            utils.loadInputFiles(opts)
                .then((files) => {
                    assert.equal(files.length, 1, 'should find the one valid file');
                    assert.equal(files[0].name, '1.fastq', 'should load the folders in alphabetical order');
                    assert.equal(files[0].batch, 'batch_1', 'fileObject1 should have batch property');
                    fs.unlinkSync(files[0].path);

                    utils.loadInputFiles(opts)
                        .then(files2 => {
                            assert.equal(files2.length, 1, 'should find the one valid file');
                            assert.equal(files2[0].name, '2.fastq', 'should load the folders in alphabetical order');
                            assert.equal(files2[0].batch, 'batch_2', 'fileObject2 should have batch property');
                            fs.unlinkSync(files2[0].path);

                            setTimeout(() => {
                                utils.loadInputFiles(opts)
                                    .then(files3 => {
                                        assert.equal(typeof files3, 'undefined', 'should find the one valid file');
                                        done();
                                    })
                                    .catch(done);
                            })
                        })
                        .catch(done);
                })
                .catch(e => {
                    console.log(e);
                    done(e);
                });
        });
    });
});
