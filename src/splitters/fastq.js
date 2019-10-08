import fs from 'fs-extra';
import path from 'path';
import readline from 'readline';
import { merge } from 'lodash';
import stream from 'stream';

const linesPerRead = 4;

export default async function(filePath, opts, handler) {
  const { maxChunkBytes, maxChunkReads } = merge({}, opts);

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

  let stopping = false;
  const brokenPromises = [];
  let splitResolver;
  let splitRejecter;
  const splitPromise = new Promise((resolve, reject) => {
    splitResolver = resolve;
    splitRejecter = reject;
  });
  const splitStreamFactory = (basepath, extension) => {
    let lineCounter = 0;
    let byteCounter = 0;
    let readCounter = 0;

    const chunkStreamFactory = (mychunk, resolve, reject) => {
      if (stopping) {
        reject(new Error('stopped'));
        return null;
      }

      const chunkPath = `${basepath}_${mychunk}${extension}`;
      const chunkWriteStream = fs.createWriteStream(chunkPath);

      chunkWriteStream.on('close', () => {
        handler(chunkPath)
          .then(() => {
            resolve({
              source: chunkPath,
              split: false,
            });
          })
          .catch(err => {
            // if handler raised an exception and it was because the instance was stopped, don't try and continue with anything else - close the readline and be done.
            if (String(err) === 'Error: stopped') {
              stopping = true;
              return;
            }
            reject(err);
          })
          .finally(() => {
            fs.unlink(chunkPath).catch(() => {}); // can't log a warning here - no logger
          });
      });

      return chunkWriteStream;
    };

    let chunkStream;
    let chunkId = 1;

    const str = new stream.Writable({
      write: async (chunk, encoding, next) => {
        if (stopping) {
          if (chunkStream) {
            chunkStream.end();
          }
          return;
        }

        if (
          !chunkStream ||
          (!(lineCounter % linesPerRead) &&
            ((maxChunkReads && readCounter >= maxChunkReads) || (maxChunkBytes && byteCounter > maxChunkBytes)))
        ) {
          if (chunkStream) {
            chunkStream.end();
            readCounter = 0;
            byteCounter = 0;
            lineCounter = 0;
          }

          const setupPromise = new Promise(setupDone => {
            brokenPromises.push(
              new Promise((resolve, reject) => {
                const newStream = chunkStreamFactory(chunkId, resolve, reject);
                setupDone(newStream);
              }),
            );
          });
          // ensure chunk setup has been done by the time we chunkStream.write
          chunkStream = await setupPromise;
          chunkId += 1;
        }
        chunkStream.write(chunk, encoding, next);

        lineCounter += 1;
        byteCounter += chunk.length;
        if (lineCounter % linesPerRead === 0) {
          readCounter += 1;
        }
      },
    });

    str.on('finish', () => {
      chunkStream.end();
      Promise.all(brokenPromises)
        .then(results => {
          splitResolver({
            source: filePath,
            split: true,
            chunks: results.map(o => o.source),
          });
        })
        .catch(splitRejecter);
    });
    return str;
  };

  const dirname = path.dirname(filePath);
  const filename = path.basename(filePath);
  const basename = filename.match(/^[^.]+/)[0];
  const extname = filename.replace(basename, '');
  const out = splitStreamFactory(path.join(dirname, basename), extname);

  readline
    .createInterface({
      input: fs.createReadStream(filePath),
    })
    .on('line', line => {
      if (stopping) {
        out.end();
      } else {
        out.write(`${line}\n`); // os.EOL ?
      }
    })
    .on('close', async () => {
      out.end();
    });

  return splitPromise;
}
