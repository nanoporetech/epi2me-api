import path from 'path';
import bytes from './filestats/default';
import fastq from './filestats/fastq';
import fasta from './filestats/fasta';

const mapping = {
  fastq,
  fasta,
  default: bytes,
};

export default function filestats(filePath) {
  if (typeof filePath !== 'string' && !(filePath instanceof String)) {
    return Promise.resolve({});
  }

  let ext = path
    .extname(filePath)
    .toLowerCase()
    .replace(/^[.]/, ''); // strip leading dot

  if (ext === 'fq') {
    ext = 'fastq';
  } else if (ext === 'fa') {
    ext = 'fasta';
  }

  if (!mapping[ext]) {
    ext = 'default';
  }

  return mapping[ext](filePath);
}
