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
      inputFolder: '/data/test',
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
    const fileName = '1.fastq';
    let seen = await dbh.seenUpload(fileName);
    assert.equal(seen, 0);
    const uploaded = await dbh.uploadFile(fileName);
    assert.equal(uploaded.changes, 1);
    seen = await dbh.seenUpload(fileName);
    assert.equal(seen, 1);
  });
  it('skipFile && seenFile', async () => {
    const fileName = '1.fastq';
    let seen = await dbh.seenUpload(fileName);
    assert.equal(seen, 0);
    const uploaded = await dbh.skipFile(fileName);
    assert.equal(uploaded.changes, 1);
    seen = await dbh.seenUpload(fileName);
    assert.equal(seen, 1);
  });
  describe('file splitting', () => {
    const child = '/data/test/to/file/split.fastq';
    const parent = '/data/test/to/file/parent.fastq';
    let db;

    beforeEach(async () => {
      await dbh.splitFile(child, parent);
      db = await dbh.db;
    });
    it('splitFile correctly stores data', async () => {
      const inserted = (await db.all('SELECT * from splits'))[0];
      assert.equal(inserted.end, null);
      assert.equal(inserted.parent, '/to/file/parent.fastq');
      assert.equal(inserted.filename, '/to/file/split.fastq');
    });
    it('splitDone correctly updates split files', async () => {
      await dbh.splitDone(child);
      const inserted = (await db.all('SELECT * from splits'))[0];
      assert.notEqual(inserted.end, null);
      assert.equal(inserted.parent, '/to/file/parent.fastq');
      assert.equal(inserted.filename, '/to/file/split.fastq');
    });
    it('splitClean', async () => {
      const unlink = sinon.stub(fs, 'unlink').resolves();
      await dbh.splitClean();
      assert.equal(unlink.called, 1);
      unlink.restore();
    });
  });
});
