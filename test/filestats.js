import assert from 'assert';
import path from 'path';
import tmp from 'tmp';
import fs from 'fs-extra';
import filestats from '../src/filestats';

describe('epi2me.filestats', () => {
  describe('filestats: fasta', async () => {
    const tmpfile = path.join(tmp.dirSync().name, 'file.fasta');
    fs.writeFileSync(tmpfile, '');
    const stats = await filestats(tmpfile);
    assert.ok(stats.sequences !== undefined);
  });

  describe('filestats: fa', async () => {
    const tmpfile = path.join(tmp.dirSync().name, 'file.fa');
    fs.writeFileSync(tmpfile, '');
    const stats = await filestats(tmpfile);
    assert.ok(stats.sequences !== undefined);
  });

  describe('filestats: fq', async () => {
    const tmpfile = path.join(tmp.dirSync().name, 'file.fq');
    fs.writeFileSync(tmpfile, '');
    const stats = await filestats(tmpfile);
    assert.ok(stats.reads !== undefined);
  });

  describe('filestats: fastq', async () => {
    const tmpfile = path.join(tmp.dirSync().name, 'file.fastq');
    fs.writeFileSync(tmpfile, '');
    const stats = await filestats(tmpfile);
    assert.ok(stats.reads !== undefined);
  });

  describe('filestats: default', async () => {
    const tmpfile = path.join(tmp.dirSync().name, 'file.txt');
    fs.writeFileSync(tmpfile, '');
    const stats = await filestats(tmpfile);
    assert.ok(stats.bytes !== undefined);
  });
});
