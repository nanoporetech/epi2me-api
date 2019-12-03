import fs from 'fs-extra';
import zlib from 'zlib';
import fastqCommon from './fastq-common';

export default async function(filePath, opts, handler) {
  return fastqCommon(
    filePath,
    opts,
    handler,
    inputPath => {
      // reader
      return fs.createReadStream(inputPath).pipe(zlib.createGunzip());
    },
    outputPath => {
      // writer
      const gzip = zlib.createGzip();
      gzip.pipe(fs.createWriteStream(outputPath));
      return gzip;
    },
  );
}
