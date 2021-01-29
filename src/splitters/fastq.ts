import fs from 'fs-extra';
import type { Dictionary } from 'ts-runtime-typecheck';
import fastqCommon from './fastq-common';

export default async function (filePath: string, opts: Dictionary, handler: any, log: any): Promise<any> {
  return fastqCommon(filePath, opts, handler, log, (filePath: string) => {
    return fs.createReadStream(filePath);
  });
}
