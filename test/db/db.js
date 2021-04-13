import assert from 'assert';
import fs from 'fs-extra';
import sinon from 'sinon';
import tmp from 'tmp';
import DB from '../../src/db';

describe('db.db', () => {
  let dbh;
  let opts;
  let mkdirp;

  beforeEach(() => {
    mkdirp = sinon.stub(fs, 'mkdirp').resolves();
    opts = {
      idWorkflowInstance: 1234,
      // inputFolder: '/data/test',
      inputFolders: ['/data/test', '/data/test2'],
    };
    dbh = new DB(tmp.dirSync().name, opts, console);
  });
  afterEach(() => {
    mkdirp.restore();
  });
  it('constructs dbh', () => {
    assert.ok(dbh);
  });
  it('uploadFile & seenFile', async () => {
    const fileName = '/data/test/1.fastq';
    let seen = await dbh.seenUpload(fileName);
    assert.strictEqual(seen, false);
    await dbh.uploadFile(fileName);
    seen = await dbh.seenUpload(fileName);
    assert.strictEqual(seen, true);
  });
  it('uploadFile in subdir & seenFile', async () => {
    const fileName = '/data/test/sub/1.fastq';
    let seen = await dbh.seenUpload(fileName);
    assert.strictEqual(seen, false);
    await dbh.uploadFile(fileName);
    seen = await dbh.seenUpload(fileName);
    assert.strictEqual(seen, true);
  });
  it('skipFile && seenFile', async () => {
    const fileName = '/data/test/1.fastq';
    let seen = await dbh.seenUpload(fileName);
    assert.strictEqual(seen, false);
    await dbh.skipFile(fileName);
    seen = await dbh.seenUpload(fileName);
    assert.strictEqual(seen, true);
  });
  it('skipFile in subdir && seenFile', async () => {
    const fileName = '/data/test/sub/1.fastq';
    let seen = await dbh.seenUpload(fileName);
    assert.strictEqual(seen, false);
    await dbh.skipFile(fileName);
    seen = await dbh.seenUpload(fileName);
    assert.strictEqual(seen, true);
  });
  it('uploadFile differentiates based on path', async () => {
    const fileName = '/data/test/1.fastq';
    const fileName2 = '/data/test2/1.fastq';
    let seen = await dbh.seenUpload(fileName);
    assert.strictEqual(seen, false);
    await dbh.uploadFile(fileName);
    seen = await dbh.seenUpload(fileName2);
    assert.strictEqual(seen, false);
    await dbh.uploadFile(fileName2);
    seen = await dbh.seenUpload(fileName);
    assert.strictEqual(seen, true);
    seen = await dbh.seenUpload(fileName2);
    assert.strictEqual(seen, true);
  });
  it('skipFile differentiates based on path', async () => {
    const fileName = '/data/test/1.fastq';
    const fileName2 = '/data/test2/1.fastq';
    let seen = await dbh.seenUpload(fileName);
    assert.strictEqual(seen, false);
    await dbh.skipFile(fileName);
    seen = await dbh.seenUpload(fileName2);
    assert.strictEqual(seen, false);
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
      assert.strictEqual(inserted.end, null);
      assert.strictEqual(inserted.parent, 'parent.fastq');
      assert.strictEqual(inserted.child_path_id, 1);
      assert.strictEqual(inserted.filename, 'split.fastq');
    });
    it('splitDone correctly updates split files', async () => {
      await dbh.splitFile(child, parent);
      await dbh.splitDone(child);
      const inserted = (await db.all('SELECT * from splits'))[0];
      // console.log(inserted);
      assert.notStrictEqual(inserted.end, null);
      assert.strictEqual(inserted.child_path_id, 1);
      assert.strictEqual(inserted.parent, 'parent.fastq');
      assert.strictEqual(inserted.filename, 'split.fastq');
    });
    it('splitClean', async () => {
      const unlink = sinon.stub(fs, 'unlink').resolves();
      await dbh.splitFile(child, parent);
      await dbh.splitClean();
      assert.strictEqual(unlink.called, true);
      unlink.restore();
    });
  });
});
