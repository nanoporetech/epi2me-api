import type { MappedFileStats } from './filestats.type';

import { genericFileStatistics } from './default';
import { fastaFileStatistics } from './fasta';
import { fastqFileStatistics } from './fastq';
import { fastqgzFileStatistics } from './fastqgz';
import { getNormalisedFileExtension } from '../file_extensions';

const mapping = new Map([
  ['fastq', fastqFileStatistics],
  ['fasta', fastaFileStatistics],
  ['fastq.gz', fastqgzFileStatistics],
  ['default', genericFileStatistics],
]);

const DEFAULT_MAPPING = genericFileStatistics;

export async function filestats(filePath: string): Promise<MappedFileStats> {
  const ext = getNormalisedFileExtension(filePath);
  const mappingFunction = mapping.get(ext) ?? DEFAULT_MAPPING;

  return mappingFunction(filePath);
}
