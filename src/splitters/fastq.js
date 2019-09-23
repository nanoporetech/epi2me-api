import fs from 'fs-extra';
import path from 'path';
import readline from 'readline';

export default function(filePath, maxChunkBytes) {
  return new Promise(async (resolve, reject) => {
    if (!maxChunkBytes) {
      // not splitting - no size given
      resolve({
        source: filePath,
        split: false,
        chunks: [filePath],
      });
      return;
    }

    const stat = await fs.stat(filePath);
    if (stat.size < maxChunkBytes) {
      // not splitting
      resolve({
        source: filePath,
        split: false,
        chunks: [filePath],
      });
      return;
    }

    let chunkId = 1;
    let outputStream;
    let chunkBytes = 0;
    const chunks = [];

    const newChunk = () => {
      const dirname = path.dirname(filePath);
      const filename = path.basename(filePath);
      const basename = filename.match(/^[^.]+/)[0];
      const extname = filename.replace(basename, '');
      const chunkName = `${basename}_${chunkId}${extname}`;

      chunkId += 1;
      chunkBytes = 0;
      chunks.push(path.join(dirname, chunkName));
      return fs.createWriteStream(path.join(dirname, chunkName));
    };

    readline
      .createInterface({
        input: fs.createReadStream(filePath),
        //    output: process.stdout,
        //    console: false
      })
      .on('close', () => {
        // N.B. end event for readline is "close" not "end"
        if (outputStream) {
          outputStream.close();
        }
        resolve({
          source: filePath,
          split: true,
          chunks,
        });
      })
      .on('line', line => {
        if (!outputStream || (line.substr(0, 1) === '@' && chunkBytes > maxChunkBytes)) {
          outputStream = newChunk();
        }
        outputStream.write(`${line}\n`);
        chunkBytes += line.length;
      })
      .on('error', reject);
  });
}
