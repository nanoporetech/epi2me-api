import fs from 'fs';
import type { FastqStats } from './filestats.type';

const LINES_PER_READ = 4;

export async function fastqFileStatistics(filePath: string): Promise<FastqStats> {
  let lineCount = 1;

  const stat = await fs.promises.stat(filePath);

  if (stat.size === 0) {
    return {
      type: 'fastq',
      bytes: 0,
      reads: 0,
    };
  }

  const readStream = fs.createReadStream(filePath).on('data', (buffer: Buffer) => {
    let idx = -1;
    lineCount -= 1;

    do {
      idx = buffer.indexOf(10, idx + 1);
      lineCount += 1;
    } while (idx !== -1);
  });

  return new Promise((resolve, reject) => {
    readStream
      .on('end', () =>
        resolve({
          type: 'fastq',
          bytes: stat.size,
          reads: Math.floor(lineCount / LINES_PER_READ),
        }),
      )
      .on('error', reject);
  });
}
