import assert from 'assert';
import { getNormalisedFileExtension, isFasta, isFastq } from '../src/file_extensions';

describe('getNormalisedFileExtension', () => {
  const n = getNormalisedFileExtension;

  it('shorthand filename', () => {
    assert.strictEqual(n('example.fa'), 'fasta');
    assert.strictEqual(n('example.fq'), 'fastq');
    assert.strictEqual(n('example.fa.gz'), 'fasta.gz');
    assert.strictEqual(n('example.fq.gz'), 'fastq.gz');
  });

  it('shorthand filepath', () => {
    assert.strictEqual(n('/example/path/example.fa'), 'fasta');
    assert.strictEqual(n('/example/path/example.fq'), 'fastq');
    assert.strictEqual(n('/example/path/example.fa.gz'), 'fasta.gz');
    assert.strictEqual(n('/example/path/example.fq.gz'), 'fastq.gz');
  });

  it('longhand filename', () => {
    assert.strictEqual(n('example.fasta'), 'fasta');
    assert.strictEqual(n('example.fastq'), 'fastq');
    assert.strictEqual(n('example.fasta.gz'), 'fasta.gz');
    assert.strictEqual(n('example.fastq.gz'), 'fastq.gz');
  });

  it('longhand filepath', () => {
    assert.strictEqual(n('/example/path/example.fasta'), 'fasta');
    assert.strictEqual(n('/example/path/example.fastq'), 'fastq');
    assert.strictEqual(n('/example/path/example.fasta.gz'), 'fasta.gz');
    assert.strictEqual(n('/example/path/example.fastq.gz'), 'fastq.gz');
  });

  it('private filename', () => {
    assert.strictEqual(n('.example.fasta'), 'fasta');
    assert.strictEqual(n('.example.fastq'), 'fastq');
    assert.strictEqual(n('.example.fasta.gz'), 'fasta.gz');
    assert.strictEqual(n('.example.fastq.gz'), 'fastq.gz');
  });

  it('private filepath', () => {
    assert.strictEqual(n('/example/path/.example.fasta'), 'fasta');
    assert.strictEqual(n('/example/path/.example.fastq'), 'fastq');
    assert.strictEqual(n('/example/path/.example.fasta.gz'), 'fasta.gz');
    assert.strictEqual(n('/example/path/.example.fastq.gz'), 'fastq.gz');
  });

  it('gzip', () => {
    assert.strictEqual(n('example.gz'), 'gz');
    assert.strictEqual(n('.gz'), '');
    assert.strictEqual(n('example.unknown.gz'), 'unknown.gz');
  });

  it('empty path', () => {
    assert.strictEqual(n(''), '');
  });

  it('no extension', () => {
    assert.strictEqual(n('hello'), '');
    assert.strictEqual(n('.hello'), '');
    assert.strictEqual(n('/example/hi'), '');
    assert.strictEqual(n('/example/.hi'), '');
    assert.strictEqual(n('/example/hi.'), '');
  });
});

describe('isFastq', () => {
  it('with gzip', () => {
    assert.strictEqual(isFastq('hi.zip.gz'), false);
    assert.strictEqual(isFastq('hi.fasta.gz'), false);
    assert.strictEqual(isFastq('hi.fastq.gz'), false);
    assert.strictEqual(isFastq('hi.fastq.gz', true), true);
  });
  it('without gzip', () => {
    assert.strictEqual(isFastq('hi.zip'), false);
    assert.strictEqual(isFastq('hi.fasta'), false);
    assert.strictEqual(isFastq('hi.fastq'), true);
    assert.strictEqual(isFastq('hi.fastq', true), true);
  });
});

describe('isFasta', () => {
  it('with gzip', () => {
    assert.strictEqual(isFasta('hi.zip.gz'), false);
    assert.strictEqual(isFasta('hi.fastq.gz'), false);
    assert.strictEqual(isFasta('hi.fasta.gz'), false);
    assert.strictEqual(isFasta('hi.fasta.gz', true), true);
  });
  it('without gzip', () => {
    assert.strictEqual(isFasta('hi.zip'), false);
    assert.strictEqual(isFasta('hi.fastq'), false);
    assert.strictEqual(isFasta('hi.fasta'), true);
    assert.strictEqual(isFasta('hi.fasta', true), true);
  });
});
