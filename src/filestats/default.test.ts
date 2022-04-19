import tmp from 'tmp-promise';
import fs from 'fs';
import path from 'path';
import { genericFileStatistics } from './default';
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
  const filepath = await createTempFile('example.txt', data);

  const stats = await genericFileStatistics(filepath);

  expect(stats).toEqual({
    type: 'bytes',
    bytes: 0,
  });
});

it('non existent file', async () => {
  const folder = await tmp.dir();
  cleanup.add(() => folder.cleanup());

  await expectToThrow(() => genericFileStatistics(path.join(folder.path, 'fake.txt')), 'no such file');
});

it('hello world', async () => {
  const data = Buffer.from('Hello world');
  const filepath = await createTempFile('example.txt', data);

  const stats = await genericFileStatistics(filepath);

  expect(stats).toEqual({
    type: 'bytes',
    bytes: data.byteLength,
  });
});
