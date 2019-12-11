import fs from 'fs-extra';
import fastqCommon from './fastq-common';

export default async function(filePath, opts, handler, log) {
  return fastqCommon(filePath, opts, handler, log, fp => {
    return fs.createReadStream(fp);
  });
}
