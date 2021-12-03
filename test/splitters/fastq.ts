import assert from 'assert';
import fs from 'fs';
import tmp from 'tmp';
import zlib from 'zlib';
import { Writable } from 'stream';

import {
  completeChunk,
  constructChunkLocation,
  createChunk,
  createReadStream,
  createWriteStream,
  getFilenameParts,
  splitter,
  writeToChunk,
} from '../../src/splitters/fastq';
import path from 'path';

function createBufferStream() {
  const buffer = [];
  const stream = new Writable({
    write(chunk, encoding, callback) {
      buffer.push(chunk);
      callback();
    },
  });
  return {
    buffer,
    stream,
  };
}

function generateRandomFastQ(readCount: number, perRead: number) {
  /*
    Bytes = readCount * (9 + perRead * 2) + (readCount - 1)
  */
  const reads: string[] = [];

  const ACGTU = 'ACGTU';

  for (let i = 0; i < readCount; i += 1) {
    const data = [];
    const qualities = [];
    for (let j = 0; j < perRead; j += 1) {
      const value = Math.floor(5 * Math.random());
      const quality = Math.floor(93 * Math.random());
      data.push(ACGTU[value]);
      qualities.push(String.fromCharCode(quality + 33));
    }
    reads.push(`@FAKE\n${data.join('')}\n+\n${qualities.join('')}`);
  }

  return reads.join('\n');
}

describe('fastq splitter', () => {
  describe('support code', () => {
    describe('createReadStream', () => {
      it('creates a readstream for a given location', (done) => {
        const file = tmp.fileSync();
        fs.writeSync(file.fd, 'example file');
        const stream = createReadStream(file.name, false);
        const buffer = [];

        stream.on('close', () => {
          try {
            const data = Buffer.concat(buffer).toString();
            assert.strictEqual(data, 'example file');
            done();
          } catch (err) {
            done(err);
          }
        });
        stream.on('error', (err) => done(err));
        stream.on('data', (bytes) => {
          buffer.push(bytes);
        });
      });
      it('understands compressed data', (done) => {
        const file = tmp.fileSync();
        fs.writeSync(file.fd, zlib.gzipSync('example data'));
        const stream = createReadStream(file.name, true);
        const buffer = [];

        stream.on('finish', () => {
          try {
            const data = Buffer.concat(buffer).toString();
            assert.strictEqual(data, 'example data');
            done();
          } catch (err) {
            done(err);
          }
        });
        stream.on('error', (err) => done(err));
        stream.on('data', (bytes) => {
          buffer.push(bytes);
        });
      });
    });
    describe('createWriteStream', () => {
      it('creates a writestream for a given location', (done) => {
        const file = tmp.fileSync();
        const { writer, closed } = createWriteStream(file.name, false);

        closed.then(() => {
          try {
            const data = fs.readFileSync(file.fd, 'utf8');
            assert.strictEqual(data, 'example data');
            done();
          } catch (err) {
            done(err);
          }
        });
        writer.end('example data');
        writer.on('error', (err) => done(err));
      });
      it('compresses data', (done) => {
        const file = tmp.fileSync();
        const { writer, closed } = createWriteStream(file.name, true);

        closed.then(() => {
          try {
            const raw = fs.readFileSync(file.fd);
            const data = zlib.gunzipSync(raw).toString();
            assert.strictEqual(data, 'example data');
            done();
          } catch (err) {
            done(err);
          }
        });
        writer.on('error', (err) => done(err));
        writer.end('example data');
      });
    });
    describe('writeToChunk', () => {
      it('writes to the file', () => {
        const { stream, buffer } = createBufferStream();
        const chunk = {
          bytes: 0,
          reads: 0,
          location: 'not a real place.txt',
          writer: stream,
          closed: Promise.resolve(),
        };

        writeToChunk(chunk, ['hello', 'world']);

        assert.strictEqual(buffer[0].toString(), 'hello\nworld\n');
        assert.strictEqual(chunk.bytes, 12);
        assert.strictEqual(chunk.reads, 1);
      });
    });
    describe('completeChunk', () => {
      const dir = tmp.dirSync();
      const prefix = path.join(dir.name, 'sample');
      let counter = 0;
      const suffix = '.fq.gz';

      it('closes chunk, calls handler and deletes chunk', async () => {
        const id = ++counter;
        const splitIndex = new Set<string>();
        const chunk = createChunk(prefix, suffix, splitIndex, id, false);
        await completeChunk(chunk, splitIndex, async (location) => {
          assert.strictEqual(constructChunkLocation(prefix, suffix, id), location);
          const { size } = await fs.promises.stat(location);
          assert.strictEqual(size, 0);
        });
        try {
          await fs.promises.stat(constructChunkLocation(prefix, suffix, id));
          throw new Error('Expected file to be deleted');
        } catch (err) {
          if (err?.code !== 'ENOENT') {
            throw err;
          }
        }
      });
      it('deletes chunk even if handler fails', async () => {
        const id = ++counter;
        const splitIndex = new Set<string>();
        const chunk = createChunk(prefix, suffix, splitIndex, id, false);
        try {
          await completeChunk(chunk, splitIndex, async () => {
            throw new Error('Expect this to fail');
          });
        } catch (err) {
          if (err?.message !== 'Expect this to fail') {
            throw err;
          }
        }

        try {
          await fs.promises.stat(constructChunkLocation(prefix, suffix, id));
          throw new Error('Expected file to be deleted');
        } catch (err) {
          if (err?.code !== 'ENOENT') {
            throw err;
          }
        }
      });
    });
    describe('getFilenameParts', () => {
      it('extracts the prefix/suffix correctly', () => {
        assert.deepStrictEqual(getFilenameParts('hello/where/file.fq.gz'), {
          prefix: 'hello/where/file',
          suffix: '.fq.gz',
        });
        assert.deepStrictEqual(getFilenameParts('hello/where/file.delta.fq.gz'), {
          prefix: 'hello/where/file.delta',
          suffix: '.fq.gz',
        });
        assert.deepStrictEqual(getFilenameParts('hello/where/file.delta..fq.gz'), {
          prefix: 'hello/where/file.delta.',
          suffix: '.fq.gz',
        });
        assert.deepStrictEqual(getFilenameParts('hello/where/file.delta.fq'), {
          prefix: 'hello/where/file.delta',
          suffix: '.fq',
        });
        assert.deepStrictEqual(getFilenameParts('hello/where/file.fastq'), {
          prefix: 'hello/where/file',
          suffix: '.fastq',
        });
      });
    });
    describe('createChunk', () => {
      it('creates a chunk object with a write stream', (done) => {
        const dir = tmp.dirSync();
        const prefix = path.join(dir.name, 'sample');
        const id = 42;
        const suffix = '.fq.gz';
        const index = new Set<string>();

        const chunk = createChunk(prefix, suffix, index, id, false);

        assert.strictEqual(chunk.bytes, 0);
        assert.strictEqual(chunk.reads, 0);
        assert.strictEqual(chunk.location, constructChunkLocation(prefix, suffix, id));

        chunk.writer.on('error', (err) => done(err));
        chunk.writer.write('hello');
        chunk.writer.end(() => {
          try {
            const data = fs.readFileSync(constructChunkLocation(prefix, suffix, id), 'utf8');
            assert.strictEqual(data, 'hello');
            done();
          } catch (err) {
            done(err);
          }
        });
      });
    });
  });
  it('skips split if no maxChunkReads/maxChunkBytes', async () => {
    const raw = generateRandomFastQ(4, 8);
    const dir = tmp.dirSync({});
    const source = path.join(dir.name, 'sample.fastq');
    const splitIndex = new Set<string>();
    await fs.promises.writeFile(source, raw);
    let called = 0;
    await splitter(
      source,
      {},
      splitIndex,
      async () => {
        called += 1;
      },
      false,
    );
    assert.strictEqual(called, 1);
  });
  it('skips split if file size is less than maxChunkBytes', async () => {
    const raw = generateRandomFastQ(4, 13);
    const bytes = raw.length;
    const dir = tmp.dirSync({});
    const source = path.join(dir.name, 'sample.fastq');
    const splitIndex = new Set<string>();
    await fs.promises.writeFile(source, raw);
    let called = 0;
    await splitter(
      source,
      { maxChunkBytes: bytes },
      splitIndex,
      async () => {
        called += 1;
      },
      false,
    );
    assert.strictEqual(called, 1);
  });
  it('creates a single chunk if the file is under maxChunkReads', async () => {
    const raw = generateRandomFastQ(4, 9);
    const dir = tmp.dirSync({});
    const source = path.join(dir.name, 'sample.fastq');
    const splitIndex = new Set<string>();
    await fs.promises.writeFile(source, raw);
    let called = 0;
    await splitter(
      source,
      { maxChunkReads: 4 },
      splitIndex,
      async () => {
        called += 1;
      },
      false,
    );
    assert.strictEqual(called, 1);
  });
  it('splits a file if its over maxChunkReads', async () => {
    const raw = generateRandomFastQ(22, 9);
    const dir = tmp.dirSync({});
    const source = path.join(dir.name, 'sample.fastq');
    const splitIndex = new Set<string>();
    await fs.promises.writeFile(source, raw);
    let called = 0;
    await splitter(
      source,
      { maxChunkReads: 4 },
      splitIndex,
      async () => {
        called += 1;
      },
      false,
    );
    assert.strictEqual(called, 6);
  });
  it('splits a file if its over maxChunkBytes', async () => {
    const raw = generateRandomFastQ(10, 20);
    const dir = tmp.dirSync({});
    const source = path.join(dir.name, 'sample.fastq');
    const splitIndex = new Set<string>();

    await fs.promises.writeFile(source, raw);
    let called = 0;
    await splitter(
      source,
      { maxChunkBytes: 100 },
      splitIndex,
      async () => {
        called += 1;
      },
      false,
    );
    assert.strictEqual(called, 5);
  });
  it('throws if the file has partial reads', async () => {
    const raw = generateRandomFastQ(3, 8) + '\nbaddata!';
    const dir = tmp.dirSync({});
    const source = path.join(dir.name, 'sample.fastq');
    const splitIndex = new Set<string>();

    await fs.promises.writeFile(source, raw);
    try {
      await splitter(source, { maxChunkReads: 2 }, splitIndex, async () => {}, false);
      throw new Error('Expected this to fail');
    } catch (err) {
      if (err?.message !== 'File was not multiple of 4 lines long.') {
        throw err;
      }
    }
  });
  it('ignored leading/trailing whitespace', async () => {
    const raw = '\n  \n' + generateRandomFastQ(3, 8) + '\n   ';
    const dir = tmp.dirSync({});
    const source = path.join(dir.name, 'sample.fastq');
    const splitIndex = new Set<string>();

    await fs.promises.writeFile(source, raw);
    await splitter(source, { maxChunkReads: 2 }, splitIndex, async () => {}, false);
  });
  describe('splits compressed data', () => {
    it('splits a file if its over maxChunkReads', async () => {
      const raw = generateRandomFastQ(22, 9);
      const dir = tmp.dirSync({});
      const source = path.join(dir.name, 'sample.fastq.gz');
      const splitIndex = new Set<string>();

      await fs.promises.writeFile(source, zlib.gzipSync(raw));
      let called = 0;
      await splitter(
        source,
        { maxChunkReads: 4 },
        splitIndex,
        async () => {
          called += 1;
        },
        true,
      );
      assert.strictEqual(called, 6);
    });
    it('splits a file if its over maxChunkBytes', async () => {
      const raw = generateRandomFastQ(10, 20);
      const dir = tmp.dirSync({});
      const source = path.join(dir.name, 'sample.fastq.gq');
      const splitIndex = new Set<string>();

      await fs.promises.writeFile(source, zlib.gzipSync(raw));
      let called = 0;
      await splitter(
        source,
        { maxChunkBytes: 100 },
        splitIndex,
        async () => {
          called += 1;
        },
        true,
      );
      assert.strictEqual(called, 5);
    });
  });
});
