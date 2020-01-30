import assert from 'assert';
import fs from 'fs-extra';
import mock from 'mock-fs';
import sinon from 'sinon';
import DB from '../../src/db';

describe('db.db', () => {
  const dbRoot = '/data/test';
  let dbh;
  let opts;
  let mkdirp;

  beforeEach(() => {
    mkdirp = sinon.stub(fs, 'mkdirp').resolves();
    mock({
      [dbRoot]: {},
    });
    opts = {
      idWorkflowInstance: 1234,
      // inputFolder: '/data/test',
      inputFolders: ['/data/test', '/data/test2'],
    };
    dbh = new DB(':memory:', opts, console);
  });
  afterEach(() => {
    mock.restore();
    mkdirp.restore();
  });
  it('constructs dbh', () => {
    assert.ok(dbh);
  });
  it('uploadFile & seenFile', async () => {
    const fileName = '/data/test/1.fastq';
    let seen = await dbh.seenUpload(fileName);
    assert.equal(seen, 0);
    const uploaded = await dbh.uploadFile(fileName);
    assert.equal(uploaded.changes, 1);
    seen = await dbh.seenUpload(fileName);
    assert.equal(seen, 1);
  });
  it('skipFile && seenFile', async () => {
    const fileName = '/data/test/1.fastq';
    let seen = await dbh.seenUpload(fileName);
    assert.equal(seen, 0);
    const uploaded = await dbh.skipFile(fileName);
    assert.equal(uploaded.changes, 1);
    seen = await dbh.seenUpload(fileName);
    assert.equal(seen, 1);
  });
  it('uploadFile differentiates based on path', async () => {
    const fileName = '/data/test/1.fastq';
    const fileName2 = '/data/test2/1.fastq';
    let seen = await dbh.seenUpload(fileName);
    assert.equal(seen, 0);
    await dbh.uploadFile(fileName);
    seen = await dbh.seenUpload(fileName2);
    assert.equal(seen, 0);
  });
  it('skipFile differentiates based on path', async () => {
    const fileName = '/data/test/1.fastq';
    const fileName2 = '/data/test2/1.fastq';
    let seen = await dbh.seenUpload(fileName);
    assert.equal(seen, 0);
    await dbh.skipFile(fileName);
    seen = await dbh.seenUpload(fileName2);
    assert.equal(seen, 0);
  });
  describe('file splitting', () => {
    const child = '/data/test/split.fastq';
    const parent = '/data/test/parent.fastq';
    let db;

    beforeEach(async () => {
      db = await dbh.db;
    });
    it('splitFile correctly stores data', async () => {
      await dbh.splitFile(child, parent);
      const inserted = (await db.all('SELECT * from splits'))[0];
      assert.equal(inserted.end, null);
      assert.equal(inserted.parent, 'parent.fastq');
      assert.equal(inserted.child_path_id, 1);
      assert.equal(inserted.filename, 'split.fastq');
    });
    it('splitDone correctly updates split files', async () => {
      await dbh.splitFile(child, parent);
      await dbh.splitDone(child);
      const inserted = (await db.all('SELECT * from splits'))[0];
      // console.log(inserted);
      assert.notEqual(inserted.end, null);
      assert.equal(inserted.child_path_id, 1);
      assert.equal(inserted.parent, 'parent.fastq');
      assert.equal(inserted.filename, 'split.fastq');
    });
    it('splitClean', async () => {
      const unlink = sinon.stub(fs, 'unlink').resolves();
      await dbh.splitFile(child, parent);
      await dbh.splitClean();
      assert.equal(unlink.called, 1);
      unlink.restore();
    });
  });
});
