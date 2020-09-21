import fs from 'fs-extra';
import zlib from 'zlib';
import fastqCommon from './fastq-common';

export default async function (filePath: string, opts: any, handler: any, log: any): Promise<any> {
  return fastqCommon(
    filePath,
    opts,
    handler,
    log,
    (inputPath: string) => {
      // reader
      return fs.createReadStream(inputPath).pipe(zlib.createGunzip());
    },
    (outputPath: string, closureHandler: any) => {
      // writer
      const stream = fs.createWriteStream(outputPath);
      stream.on('close', closureHandler);
      const gzip = zlib.createGzip();

      gzip.pipe(stream);
      return gzip;
    },
  );
}
