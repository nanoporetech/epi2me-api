import fs from 'fs-extra';
import zlib from 'zlib';
import fastqCommon from './fastq-common';

export default async function (filePath, opts, handler) {
  return fastqCommon(
    filePath,
    opts,
    handler,
    inputPath => {
      // reader
      return fs.createReadStream(inputPath).pipe(zlib.createGunzip());
    },
    (outputPath, closureHandler) => {
      // writer
      const stream = fs.createWriteStream(outputPath);
      stream.on("close", closureHandler);
      const gzip = zlib.createGzip();

      gzip.pipe(stream);
      return gzip;
    },
  );
}
