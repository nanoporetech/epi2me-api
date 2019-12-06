import readline from 'readline';
import fs from 'fs-extra';
import path from 'path';
import {
  merge
} from 'lodash';


export default async function (filePath, opts, handler, inputGenerator, outputGenerator) {
  const linesPerRead = 4;
  const {
    maxChunkBytes,
    maxChunkReads
  } = merge({}, opts);

  const dirname = path.dirname(filePath);
  const filename = path.basename(filePath);
  const basename = filename.match(/^[^.]+/)[0];
  const extname = filename.replace(basename, '');
  const basepath = path.join(dirname, basename);

  if (!maxChunkBytes && !maxChunkReads) {
    // not splitting - no size or count given
    return handler(filePath).then(() => {
      return {
        source: filePath,
        split: false,
        chunks: [filePath],
      };
    });
  }

  const stat = await fs.stat(filePath);
  if (maxChunkBytes && stat.size < maxChunkBytes) {
    // not splitting
    return handler(filePath).then(() => {
      return {
        source: filePath,
        split: false,
        chunks: [filePath],
      };
    });
  }

  const outerPromise = new Promise((resolveOuter) => {
    let chunkId = 0;
    let lineInRead = 0;
    let readBuf = "";
    let readsInChunk = 0;
    let bytesInChunk = 0;
    let chunkPath;
    let chunkStream;
    const resolutionData = {
      source: filePath,
      split: true,
      chunks: []
    };

    const readHandler = async read => {

      if (!readsInChunk) {
        // open new chunk
        chunkId += 1;
        chunkPath = `${basepath}_${chunkId}${extname}`;
        resolutionData.chunks.push(chunkPath);

        const closeHandler = () => {
          handler(chunkPath).then(() => {
            resolveOuter(resolutionData);
          });
        };

        if (outputGenerator) {
          chunkStream = outputGenerator(chunkPath, closeHandler);
        } else {
          chunkStream = fs.createWriteStream(chunkPath);
          chunkStream.on("close", closeHandler);
        }
      }

      readsInChunk += 1;
      bytesInChunk += read.length;

      chunkStream.write(read, () => {});

      if ((maxChunkBytes && (bytesInChunk >= maxChunkBytes)) ||
        (maxChunkReads && (readsInChunk >= maxChunkReads))) {
        // close chunk & reopen
        readsInChunk = 0;
        bytesInChunk = 0;
        chunkStream.end();
      }
    };

    const lineHandler = async line => {
      lineInRead += 1;
      readBuf += line;
      readBuf += "\n";

      if (lineInRead >= linesPerRead) {
        lineInRead = 0;
        readHandler(readBuf);
        readBuf = "";
      }
    };

    readline
      .createInterface({
        input: inputGenerator(filePath),
      })
      .on('line', lineHandler);
  });

  return outerPromise;
};
