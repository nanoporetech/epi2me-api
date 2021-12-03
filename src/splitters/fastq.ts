import type { Chunk, SplitStyle } from './splitter.type';

import readline from 'readline';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { isDefined } from 'ts-runtime-typecheck';
import { getFileExtension, getFileName } from '../file_extensions';
import { asNodeError } from '../NodeError';

const LINES_PER_READ = 4;

export function createReadStream(location: string, isCompressed: boolean): NodeJS.ReadableStream {
  const source = fs.createReadStream(location);
  return isCompressed ? source.pipe(zlib.createGunzip()) : source;
}

export function createWriteStream(
  location: string,
  isCompressed: boolean,
): { writer: NodeJS.WritableStream; closed: Promise<void> } {
  const destination = fs.createWriteStream(location);
  // ensure we monitor when the destination write stream finishes, not the GZip transform stream
  const closed = new Promise<void>((resolve, reject) => {
    destination.once('close', () => resolve());
    destination.once('error', reject);
  });
  if (isCompressed) {
    const compress = zlib.createGzip();
    compress.pipe(destination);
    return { writer: compress, closed };
  }
  return { writer: destination, closed };
}

export function writeToChunk(chunk: Chunk, lines: string[]): void {
  if (isDefined(chunk.error)) {
    throw chunk.error;
  }

  const read = lines.join('\n') + '\n';

  chunk.reads += 1;
  chunk.bytes += read.length;
  chunk.writer.write(read);
}

/*
  When a chunk is complete we ensure it's completely written to disk, then
  pass it to the handler to process it and finally we delete it
*/
export async function completeChunk(
  chunk: Chunk,
  index: Set<string>,
  handler: (location: string) => Promise<void>,
): Promise<void> {
  chunk.writer.end();
  await chunk.closed;
  try {
    await handler(chunk.location);
  } finally {
    // NOTE ensure that if the file does not exist, we don't throw about not being able to delete it
    try {
      await fs.promises.unlink(chunk.location);
      index.delete(chunk.location);
    } catch (err) {
      if (asNodeError(err).code !== 'ENOENT') {
        throw err;
      }
    }
  }
}

/*
  Chunks are named based on the parent file like so
  parent: path/to/file/sample.fq
  chunk: path/to/file/sample_1.fq
  
  This function generates the prefix/suffix parts from the parent location
  prefix: path/to/file/sample
  suffix: .fq

  Which are later composed like so `${prefix}_${chunk_id}${suffix}` for each chunk
*/
export function getFilenameParts(location: string): { prefix: string; suffix: string } {
  const dirname = path.dirname(location);
  const extension = getFileExtension(location);
  const filename = getFileName(location);

  return {
    prefix: path.join(dirname, filename),
    suffix: '.' + extension,
  };
}

export function constructChunkLocation(prefix: string, suffix: string, id: number): string {
  return `${prefix}_${id}${suffix}`;
}

export function createChunk(
  prefix: string,
  suffix: string,
  index: Set<string>,
  id: number,
  isCompressed: boolean,
): Chunk {
  const location = constructChunkLocation(prefix, suffix, id);
  index.add(location);
  const { writer, closed } = createWriteStream(location, isCompressed);
  const chunk: Chunk = {
    bytes: 0,
    reads: 0,
    location,
    writer,
    closed,
  };

  closed.catch((err) => {
    chunk.error = err;
  });

  return chunk;
}

export async function splitter(
  filePath: string,
  opts: SplitStyle,
  index: Set<string>,
  handler: (location: string) => Promise<void>,
  isCompressed: boolean, // would it be advantageous to offer compression on output even if the input isn't?
): Promise<void> {
  // defaulting these values to infinity simplifies our checks
  const { maxChunkBytes = Infinity, maxChunkReads = Infinity } = opts;
  const { prefix, suffix } = getFilenameParts(filePath);

  // we don't need to split, no split option are defined
  if (maxChunkBytes === Infinity && maxChunkReads === Infinity) {
    await handler(filePath);
    return;
  }

  const stat = await fs.promises.stat(filePath);
  // we don't need to split, the file is too small
  if (maxChunkReads === Infinity && stat.size <= maxChunkBytes) {
    await handler(filePath);
    return;
  }

  const input = createReadStream(filePath, isCompressed);

  let lineBuffer: string[] = [];
  let chunk: Chunk | null = null;
  let chunkCounter = 0;

  for await (const line of readline.createInterface({ input })) {
    // skip any empty lines
    if (line === '' || line.trim() === '') {
      continue;
    }

    lineBuffer.push(line);

    // reads contain LINES_PER_READ (4) lines so we buffer until
    // we reach that limit
    if (lineBuffer.length < LINES_PER_READ) {
      continue;
    }

    // initialise a chunk if one doesn't exist
    if (!chunk) {
      chunkCounter += 1;
      chunk = createChunk(prefix, suffix, index, chunkCounter, isCompressed);
    }

    writeToChunk(chunk, lineBuffer);
    lineBuffer = [];

    const exceedsBytes = chunk.bytes >= maxChunkBytes;
    const exceedsReads = chunk.reads >= maxChunkReads;

    // this chunk is full, so close and process it
    if (exceedsBytes || exceedsReads) {
      await completeChunk(chunk, index, handler);
      chunk = null;
    }
  }

  // ensure we don't have any erroneous data lingering in the line buffer
  if (lineBuffer.length > 0) {
    throw new Error(`File was not multiple of ${LINES_PER_READ} lines long.`);
  }

  // close the last chunk, if one exists
  if (chunk) {
    await completeChunk(chunk, index, handler);
  }
}
