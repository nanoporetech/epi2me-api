import fs from 'fs-extra';

export default async function(filePath) {
  return new Promise((resolve, reject) => {
    const linesPerRead = 2;
    let lineCount = 1;
    let idx;

    fs.createReadStream(filePath)
      .on('data', buffer => {
        idx = -1;
        lineCount -= 1;

        do {
          idx = buffer.indexOf(62, idx + 1); // 62 == ">"
          lineCount += 1;
        } while (idx !== -1);
      })
      .on('end', () => resolve({ type: 'fasta', sequences: Math.floor(lineCount / linesPerRead) }))
      .on('error', reject);
  });
}
