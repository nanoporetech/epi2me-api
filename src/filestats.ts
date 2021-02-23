import bytes from './filestats/default';
import fasta from './filestats/fasta';
import fastq from './filestats/fastq';
import fastqgz from './filestats/fastqgz';
import { isUndefined } from 'ts-runtime-typecheck';
import { getNormalisedFileExtension } from './file_extensions';

const mapping = new Map([
  ['fastq', fastq],
  ['fasta', fasta],
  ['fastq.gz', fastqgz],
  ['default', bytes],
]);

const DEFAULT_MAPPING = bytes;

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

  const ext = getNormalisedFileExtension(filePath);
  const mappingFunction = mapping.get(ext) ?? DEFAULT_MAPPING;

  return mappingFunction(filePath);
}
