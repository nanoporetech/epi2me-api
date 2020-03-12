import path from 'path';
import bytes from './filestats/default';
import fasta from './filestats/fasta';
import fastq from './filestats/fastq';
import fastqgz from './filestats/fastqgz';

const mapping = {
  fastq,
  fasta,
  fastqgz: fastqgz,
  default: bytes,
};

const longForm = {
  fq: 'fastq',
  fa: 'fasta',
};

export default function filestats(filePath) {
  if (typeof filePath !== 'string' && !(filePath instanceof String)) {
    return Promise.resolve({});
  }

  let ext = path
    .extname(filePath)
    .toLowerCase()
    .replace(/^[.]/, ''); // strip leading dot

  if (longForm[ext]) {
    ext = longForm[ext];
  }
  if (ext === 'gz') {
    const extArr = filePath.split('.').slice(1);
    ext = extArr.reduce((prev, curr) => prev + (longForm[curr] || curr), '');
  }

  if (!mapping[ext]) {
    ext = 'default';
  }

  return mapping[ext](filePath);
}
