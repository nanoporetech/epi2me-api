import assert from 'assert';
import sinon from 'sinon';
import tmp from 'tmp';
import fs from 'fs-extra';
import path from 'path';
import utils from '../../src/utils-fs';

describe('utils-fs.findSuitablebatchIn', () => {
  let clock;
  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });
  afterEach(() => {
    clock.restore();
  });

  it('should create new if none found', async () => {
    const dir = tmp.dirSync().name;
    assert.equal(await utils.findSuitableBatchIn(dir), path.join(dir, 'batch_0'), 'new batch');
  });

  it('should create new if none matching', async () => {
    const dir = tmp.dirSync().name;
    fs.mkdirpSync(path.join(dir, 'random_other'));
    assert.equal(await utils.findSuitableBatchIn(dir), path.join(dir, 'batch_0'), 'new batch');
  });

  it('should create new if latest is full', async () => {
    const dir = tmp.dirSync().name;
    const batchDir = path.join(dir, 'batch_0');
    await fs.mkdirp(batchDir);

    let p = [];
    for (let i = 0; i <= 4000; i++) {
      p.push(fs.writeFile(path.join(batchDir, `file${i}.fast5`), 'data'));
    }
    await Promise.all(p);

    clock.tick(1000);
    const folder = await utils.findSuitableBatchIn(dir);
    assert.equal(folder, path.join(dir, 'batch_1000'), 'new batch');
  });

  it('should return latest if free', async () => {
    const dir = tmp.dirSync().name;
    fs.mkdirpSync(path.join(dir, 'batch_0'));
    fs.mkdirpSync(path.join(dir, 'batch_1000'));
    for (let i = 0; i <= 1000; i++) {
      // const targetBatchSize
      fs.writeFileSync(path.join(dir, 'batch_1000', `file${i}.fast5`), 'data');
    }
    clock.tick(1000);
    assert.equal(await utils.findSuitableBatchIn(dir), path.join(dir, 'batch_1000'), 'new batch');
  });
});
