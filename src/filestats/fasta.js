import fs from 'fs-extra';

export default function(filePath) {
  return new Promise((resolve, reject) => {
    const linesPerRead = 2;
    let lineCount = 1;
    let idx;
    let stat = {
      size: 0,
    };

    try {
      stat = fs.statSync(filePath);
    } catch (e) {
      reject(e);
    }

    fs.createReadStream(filePath)
      .on('data', buffer => {
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
