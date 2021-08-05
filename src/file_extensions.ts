import { basename, parse, extname } from 'path';

const SHORTHAND_LOOKUP = new Map([
  ['fq', 'fastq'],
  ['fa', 'fasta'],
]);

const VALID_EXTENSIONS = new Set(['fastq', 'fasta', 'fastq.gz', 'fasta.gz', 'fast5', 'bam', 'json']);

export function listValidExtensions(): string[] {
  return Array.from(VALID_EXTENSIONS);
}

export function getFileName(filepath: string): string {
  const filename = basename(filepath);
  const ext = getFileExtension(filename);
  return filename.slice(0, -(ext.length + 1));
}

export function getFileExtension(filepath: string): string {
  const { ext: last, name } = parse(filepath);

  if (last.toLowerCase() === '.gz' && name.includes('.', 1)) {
    const ext = extname(name).slice(1);
    return `${ext}.gz`;
  } else {
    return last.toLowerCase().slice(1);
  }
}

export function normaliseFileExtension(ext: string): string {
  let normalised = ext.toLowerCase();
  if (normalised.startsWith('.')) {
    normalised = normalised.slice(1);
  }
  let suffix = '';
  if (normalised.endsWith('.gz')) {
    suffix = '.gz';
    normalised = normalised.slice(0, -3);
  }
  normalised = SHORTHAND_LOOKUP.get(normalised) ?? normalised;
  return normalised + suffix;
}

export function getNormalisedFileExtension(filepath: string): string {
  return normaliseFileExtension(getFileExtension(filepath));
}

export function isValidExtension(filepath: string): boolean {
  const ext = getNormalisedFileExtension(filepath);
  return VALID_EXTENSIONS.has(ext);
}

export function defineExtensionCheck(format: string): (filepath: string, allowGzip: boolean) => boolean {
  const gzipFormat = format + '.gz';
  return (filepath: string, allowGzip = false) => {
    const ext = getNormalisedFileExtension(filepath);
    return ext === format || (allowGzip && ext === gzipFormat);
  };
}

export const isFastq = defineExtensionCheck('fastq');
export const isFasta = defineExtensionCheck('fasta');
export const isFast5 = defineExtensionCheck('fast5');
export const isJson = defineExtensionCheck('json');
export const isBam = defineExtensionCheck('bam');
