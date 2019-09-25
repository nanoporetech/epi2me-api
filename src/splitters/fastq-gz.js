import fs from 'fs-extra';
import path from 'path';
import readline from 'readline';
import zlib from 'zlib';
import {
  merge
} from 'lodash';

const linesPerRead = 4;

export default function (filePath, opts) {
  const {
    maxChunkBytes,
    maxChunkReads
  } = merge({}, opts);

  return new Promise(async (resolve, reject) => {
    if (!maxChunkBytes && !maxChunkReads) {
      // not splitting - no size or count given
      resolve({
        source: filePath,
        split: false,
        chunks: [filePath],
      });
      return;
    }

    const stat = await fs.stat(filePath);
    if (maxChunkBytes && stat.size < maxChunkBytes) {
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
    let chunkLines = 0;
    let chunkReads = 1;
    const chunks = [];

    const newChunk = () => {
      const dirname = path.dirname(filePath);
      const filename = path.basename(filePath);
      const basename = filename.match(/^[^.]+/)[0];
      const extname = filename.replace(basename, '');
      const chunkName = `${basename}_${chunkId}${extname}`;

      chunkId += 1;
      chunkBytes = 0;
      chunkReads = 0;
      chunkLines = 0;
      chunks.push(path.join(dirname, chunkName));
      const os = fs.createWriteStream(path.join(dirname, chunkName));
      os.mywriters = [];
      return os;
    };

    readline
      .createInterface({
        input: fs.createReadStream(filePath).pipe(zlib.createGunzip())
      })
      .on('close', async () => {
        // N.B. end event for readline is "close" not "end"
        if (outputStream) {
          await Promise.all(outputStream.mywriters);
          outputStream.close();
        }
        resolve({
          source: filePath,
          split: true,
          chunks,
        });
      })
      .on('line', async line => {
        const startRead = !(chunkLines % linesPerRead);

        // check if we need to start a new file
        if (
          !outputStream ||
          (startRead &&
            ((maxChunkBytes && chunkBytes > maxChunkBytes) || (maxChunkReads && chunkReads >= maxChunkReads)))
        ) {
          outputStream = newChunk();
        }

        const p = new Promise(resolveWrite => {
          // write out the current line
          outputStream.write(`${line}\n`, resolveWrite);
        });
        outputStream.mywriters.push(p); // how heavy is an array of 4000 promises?

        // update byte- & read- tallies
        chunkBytes += line.length;
        chunkLines += 1;
        if (startRead) {
          chunkReads += 1;
        }
      })
      .on('error', reject);
  });
}
