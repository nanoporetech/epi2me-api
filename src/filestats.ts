import path from 'path';
import bytes from './filestats/default';
import fasta from './filestats/fasta';
import fastq from './filestats/fastq';
import fastqgz from './filestats/fastqgz';
import { isUndefined } from './runtime-typecast';

const mapping = new Map([
  ['fastq', fastq],
  ['fasta', fasta],
  ['fastqgz', fastqgz],
  ['default', bytes],
]);

const DEFAULT_MAPPING = bytes;

const longForm = new Map([
  ['fq', 'fastq'],
  ['fa', 'fasta'],
]);

export type MappedFileStats = {
  type: string;
  bytes: number;
  sequences?: number;
  reads?: number;
};

export default async function filestats(filePath?: string): Promise<MappedFileStats> {
  if (isUndefined(filePath)) {
    // WARN the existing implementation requires that a null object is returned when
    // no path is given. The null object did not match the type signature so a more
    // complete object is now returned. But this behavior _should be removed_
    return { type: 'unknown', bytes: NaN };
  }

  let ext = path.extname(filePath).toLowerCase().replace(/^[.]/, ''); // strip leading dot

  const mappedForm = longForm.get(ext);
  if (mappedForm) {
    ext = mappedForm;
  }
  if (ext === 'gz') {
    const extArr = filePath.split('.').slice(1);
    ext = extArr.reduce((prev, curr) => prev + (longForm.get(curr) ?? curr), '');
  }

  let mappingFunction = mapping.get(ext);
  if (!mappingFunction) {
    mappingFunction = DEFAULT_MAPPING;
  }

  return mappingFunction(filePath);
}
