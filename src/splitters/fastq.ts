import fs from 'fs-extra';
import fastqCommon from './fastq-common';

export default async function(filePath: string, opts: {}, handler: any, log: any): Promise<any> {
  return fastqCommon(filePath, opts, handler, log, (filePath: string) => {
    return fs.createReadStream(filePath);
  });
}
