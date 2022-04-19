export interface FastqStats {
  type: 'fastq';
  bytes: number;
  reads: number;
}

export interface FastaStats {
  type: 'fasta';
  bytes: number;
  sequences: number;
}

export interface FastqGZStats {
  type: 'gz';
  bytes: number;
  reads: number;
}

export interface DefaultStats {
  type: 'bytes';
  bytes: number;
}

export interface MappedFileStats {
  type: string;
  bytes: number;
  sequences?: number;
  reads?: number;
}
