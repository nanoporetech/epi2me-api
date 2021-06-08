import fs from 'fs';
import { createGunzip } from 'zlib';

export function fastqgzFileStatistics(filePath: string): Promise<{ type: string; bytes: number; reads: number }> {
  return new Promise((resolve, reject) => {
    const linesPerRead = 4;
    let lineCount = 1;
    let idx = -1;
    let stat = {
      size: 0,
    };

    try {
      // TODO make this async
      stat = fs.statSync(filePath);
    } catch (e) {
      reject(e);
      return;
    }

    const gunzip = createGunzip();

    fs.createReadStream(filePath)
      .pipe(gunzip)
      .on('data', (buffer) => {
        idx = -1;
        lineCount -= 1;

        do {
          idx = buffer.indexOf(10, idx + 1);
          lineCount += 1;
        } while (idx !== -1);
      })
      .on('end', () =>
        resolve({
          type: 'gz',
          bytes: stat.size,
          reads: Math.floor(lineCount / linesPerRead),
        }),
      )
      .on('error', reject);
  });
}
