import fs from 'fs';
import { createGunzip } from 'zlib';
import type { FastqGZStats } from './filestats.type';

const LINES_PER_READ = 4;

export async function fastqgzFileStatistics(filePath: string): Promise<FastqGZStats> {
  const stat = await fs.promises.stat(filePath);

  if (stat.size === 0) {
    return {
      type: 'gz',
      bytes: 0,
      reads: 0,
    };
  }

  let lineCount = 1;

  const gunzipStream = fs
    .createReadStream(filePath)
    .pipe(createGunzip())
    .on('data', (buffer) => {
      let idx = -1;
      lineCount -= 1;

      do {
        idx = buffer.indexOf(10, idx + 1);
        lineCount += 1;
      } while (idx !== -1);
    });

  return new Promise((resolve, reject) => {
    gunzipStream
      .on('end', () =>
        resolve({
          type: 'gz',
          bytes: stat.size,
          reads: Math.floor(lineCount / LINES_PER_READ),
        }),
      )
      .on('error', reject);
  });
}
