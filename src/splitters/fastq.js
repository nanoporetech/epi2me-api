import fs from 'fs-extra';
import fastqCommon from './fastq-common';

export default async function(filePath, opts, handler) {
  return fastqCommon(filePath, opts, handler, fp => {
    return fs.createReadStream(fp);
  });
}
