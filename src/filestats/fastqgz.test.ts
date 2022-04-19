import tmp from 'tmp-promise';
import fs from 'fs';
import path from 'path';
import { gzipSync } from 'zlib';
import { fastqgzFileStatistics } from './fastqgz';
import { DisposableCollection } from '../Disposable';
import { expectToThrow } from '../NodeError';

const cleanup = new DisposableCollection();
afterEach(() => cleanup.dispose());

async function createTempFile(name: string, data: Buffer): Promise<string> {
  const tmpdir = await tmp.dir();
  const tmpfile = path.join(tmpdir.path, name);
  cleanup.add(async () => {
    await fs.promises.rm(tmpfile);
    await tmpdir.cleanup();
  });
  await fs.promises.writeFile(tmpfile, data);
  return tmpfile;
}

it('empty file', async () => {
  const data = Buffer.from('');
  const filepath = await createTempFile('example.fq.gz', data);

  const stats = await fastqgzFileStatistics(filepath);

  expect(stats).toEqual({
    type: 'gz',
    bytes: 0,
    reads: 0,
  });
});

it('non existent file', async () => {
  const folder = await tmp.dir();
  cleanup.add(() => folder.cleanup());

  await expectToThrow(() => fastqgzFileStatistics(path.join(folder.path, 'fake.fq.gz')), 'no such file');
});

it('fastq gzip data', async () => {
  const data = Buffer.from('@A_read\nACTGCATG\n+\n12345678\n@A_nother_read\n+\nACTGACTG\n12345678\n');
  const filepath = await createTempFile('example.fq.gz', gzipSync(data));

  const stats = await fastqgzFileStatistics(filepath);

  expect(stats).toEqual({
    type: 'gz',
    bytes: 65,
    reads: 2,
  });
});
