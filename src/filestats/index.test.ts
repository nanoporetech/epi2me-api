import tmp from 'tmp-promise';
import fs from 'fs';
import path from 'path';
import { filestats } from './index';
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

it('fa', async () => {
  const data = Buffer.from('');
  const filepath = await createTempFile('example.fa', data);
  const stats = await filestats(filepath);

  expect(stats.type).toEqual('fasta');
});

it('fasta', async () => {
  const data = Buffer.from('');
  const filepath = await createTempFile('example.fasta', data);
  const stats = await filestats(filepath);

  expect(stats.type).toEqual('fasta');
});

it('fq', async () => {
  const data = Buffer.from('');
  const filepath = await createTempFile('example.fq', data);
  const stats = await filestats(filepath);

  expect(stats.type).toEqual('fastq');
});

it('fastq', async () => {
  const data = Buffer.from('');
  const filepath = await createTempFile('example.fastq', data);
  const stats = await filestats(filepath);

  expect(stats.type).toEqual('fastq');
});

it('fastq.gz', async () => {
  const data = Buffer.from('');
  const filepath = await createTempFile('example.fastq.gz', data);
  const stats = await filestats(filepath);

  expect(stats.type).toEqual('gz');
});

it('fq.gz', async () => {
  const data = Buffer.from('');
  const filepath = await createTempFile('example.fq.gz', data);
  const stats = await filestats(filepath);

  expect(stats.type).toEqual('gz');
});

it('txt', async () => {
  const data = Buffer.from('');
  const filepath = await createTempFile('example.txt', data);
  const stats = await filestats(filepath);

  expect(stats.type).toEqual('bytes');
});

it('non existent file', async () => {
  const folder = await tmp.dir();
  cleanup.add(() => folder.cleanup());

  await expectToThrow(() => filestats(path.join(folder.path, 'fake.fasta')), 'no such file');
});
