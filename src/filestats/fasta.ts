import fs from 'fs';
import type { FastaStats } from './filestats.type';

const LINES_PER_READ = 2;

export async function fastaFileStatistics(filePath: string): Promise<FastaStats> {
  const stat = await fs.promises.stat(filePath);
  let lineCount = 1;

  if (stat.size === 0) {
    return {
      type: 'fasta',
      bytes: 0,
      sequences: 0,
    };
  }

  const readStream = fs.createReadStream(filePath).on('data', (buffer: Buffer) => {
    let idx = -1;
    lineCount -= 1;

    do {
      idx = buffer.indexOf(62, idx + 1); // 62 == ">"
      lineCount += 1;
    } while (idx !== -1);
  });

  return new Promise((resolve, reject) => {
    readStream
      .on('end', () =>
        resolve({
          type: 'fasta',
          bytes: stat.size,
          sequences: Math.floor((1 + lineCount) / LINES_PER_READ),
        }),
      )
      .on('error', reject);
  });
}
