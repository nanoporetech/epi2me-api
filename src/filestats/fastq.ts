import fs from 'fs-extra';

export default function(filePath: string): Promise<{ type: string; bytes: number; reads: number }> {
  return new Promise((resolve, reject) => {
    const linesPerRead = 4;
    let lineCount = 1;
    let idx = -1;
    let stat = {
      size: 0,
    };

    try {
      stat = fs.statSync(filePath);
    } catch (e) {
      reject(e);
      return;
    }

    fs.createReadStream(filePath)
      .on('data', buffer => {
        idx = -1;
        lineCount -= 1;

        do {
          idx = buffer.indexOf(10, idx + 1);
          lineCount += 1;
        } while (idx !== -1);
      })
      .on('end', () =>
        resolve({
          type: 'fastq',
          bytes: stat.size,
          reads: Math.floor(lineCount / linesPerRead),
        }),
      )
      .on('error', reject);
  });
}
