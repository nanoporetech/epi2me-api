import fs from 'fs';

export function fastaFileStatistics(filePath: string): Promise<{ type: string; bytes: number; sequences: number }> {
  return new Promise((resolve, reject) => {
    const linesPerRead = 2;
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
    }

    fs.createReadStream(filePath)
      .on('data', (buffer: Buffer) => {
        idx = -1;
        lineCount -= 1;

        do {
          idx = buffer.indexOf(62, idx + 1); // 62 == ">"
          lineCount += 1;
        } while (idx !== -1);
      })
      .on('end', () =>
        resolve({
          type: 'fasta',
          bytes: stat.size,
          sequences: Math.floor((1 + lineCount) / linesPerRead),
        }),
      )
      .on('error', reject);
  });
}
