import { basename } from 'path';
import { asString } from 'ts-runtime-typecheck';

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
  const filename = basename(filepath).toLowerCase();
  const parts = filename.split('.');

  // correct for private files
  if (parts[0] === '') {
    parts.shift();
  }

  // empty string has no extension
  if (parts.length < 2) {
    return '';
  }

  const last = asString(parts.pop()); // cannot fail
  const isGzipped = last === 'gz';

  // extract $EXT if in the format `{$FIlE}.{$EXT}.gz`
  if (parts.length > 1 && isGzipped) {
    const realExtension = asString(parts.pop()); // cannot fail
    return `${realExtension}.gz`;
  }

  return last;
}

export function normaliseFileExtension(ext: string): string {
  if (ext.endsWith('.gz')) {
    const realExtension = ext.startsWith('.') ? ext.slice(1, -3) : ext.slice(0, -3);
    return `${SHORTHAND_LOOKUP.get(realExtension) ?? realExtension}.gz`;
  } else {
    const realExtension = ext.startsWith('.') ? ext.slice(1) : ext;
    return SHORTHAND_LOOKUP.get(realExtension) ?? realExtension;
  }
}

export function getNormalisedFileExtension(filepath: string): string {
  const filename = basename(filepath).toLowerCase();
  const parts = filename.split('.');

  // correct for private files
  if (parts[0] === '') {
    parts.shift();
  }

  // empty string has no extension
  if (parts.length < 2) {
    return '';
  }

  const last = asString(parts.pop()); // cannot fail
  const isGzipped = last === 'gz';

  // extract $EXT if in the format `{$FIlE}.{$EXT}.gz`
  if (parts.length > 1 && isGzipped) {
    const realExtension = asString(parts.pop()); // cannot fail
    return `${SHORTHAND_LOOKUP.get(realExtension) ?? realExtension}.gz`;
  }

  return SHORTHAND_LOOKUP.get(last) ?? last;
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
