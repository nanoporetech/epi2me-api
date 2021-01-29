import readline from 'readline';
import fs from 'fs-extra';
import path from 'path';
import { merge } from 'lodash';
import type { Dictionary } from 'ts-runtime-typecheck';

export default async function (
  filePath: string,
  opts: Dictionary,
  handler: any,
  log: any,
  inputGenerator: any,
  outputGenerator?: any,
): Promise<any> {
  const linesPerRead = 4;
  const { maxChunkBytes, maxChunkReads } = merge(opts);

  const dirname = path.dirname(filePath);
  const filename = path.basename(filePath);
  const basenameMatch = filename.match(/^[^.]+/);
  const basename = basenameMatch ? basenameMatch[0] : '';
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
    let readBuf = '';
    let readsInChunk = 0;
    let bytesInChunk = 0;
    let chunkPath: string;
    let chunkStream: fs.WriteStream;
    const resolutionData = {
      source: filePath,
      split: true,
      chunks: [],
    };

    let resolveSafety: any;

    const safety = new Promise((resolve) => {
      resolveSafety = resolve;
    });
    const chunkPromises = [safety];

    const readHandler = async (read: string): Promise<any> => {
      if (!readsInChunk) {
        // open new chunk
        chunkId += 1;
        chunkPath = `${basepath}_${chunkId}${extname}`;

        //        resolutionData.chunks.push(chunkPath);
        const chunkPromise = new Promise((resolveInner, rejectInner) => {
          const myChunkPath = chunkPath;
          const closeHandler = (): void => {
            // log.debug(`Closing chunk ${myChunkPath}`);
            // handler completes once the chunk has been uploaded
            handler(myChunkPath)
              .then(() => {
                // log.debug(`Handler completed chunk ${myChunkPath}`);
                resolveInner(myChunkPath);
              })
              .catch((err: Error) => {
                // if handler raised an exception and it was because the instance was stopped, don't try and continue with anything else - close the readline and be done.
                // log.debug(`Handler rejected chunk ${myChunkPath}`);
                rejectInner(err);
              })
              .finally(() => {
                fs.unlink(myChunkPath).catch((err: Error) => {
                  log.warn(`Error unlinking chunk ${myChunkPath}: ${String(err)}`);
                });
              });
          };

          // log.debug(`Opening chunk ${myChunkPath}`);
          if (outputGenerator) {
            chunkStream = outputGenerator(myChunkPath, closeHandler);
          } else {
            chunkStream = fs.createWriteStream(myChunkPath);
            chunkStream.on('close', closeHandler);
          }
        });
        chunkPromises.push(chunkPromise);
      }

      readsInChunk += 1;
      bytesInChunk += read.length;
      //      console.log(`READ ${read}`);
      chunkStream.write(read, () => {});

      if ((maxChunkBytes && bytesInChunk >= maxChunkBytes) || (maxChunkReads && readsInChunk >= maxChunkReads)) {
        // close chunk & reopen
        readsInChunk = 0;
        bytesInChunk = 0;
        chunkStream.end();
      }
    };

    const lineHandler = async (line: string): Promise<void> => {
      lineInRead += 1;
      readBuf += line;
      readBuf += '\n';

      //      console.log(`LINE ${String(line)}`);
      if (lineInRead >= linesPerRead) {
        lineInRead = 0;
        readHandler(readBuf);
        readBuf = '';
      }
    };

    readline
      .createInterface({
        input: inputGenerator(filePath),
      })
      .on('line', lineHandler)
      .on('close', () => {
        // log.debug(`Finished chunking ${filePath}`);
        chunkStream.end(); // make sure inner chunk is closed off correctly
        resolveSafety(); // this shouldn't be required, as the Promise.all follows, but removing it breaks behaviour
        Promise.all(chunkPromises).then((chunks) => {
          chunks.shift(); // remove safety
          resolveOuter(
            merge(
              {
                chunks,
              },
              resolutionData,
            ),
          );
        });
      })
      .on('error', (err) => {
        log.error(`Error chunking ${filePath}: ${String(err)}`);
      });
  });

  return outerPromise;
}
