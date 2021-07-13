import type { Dictionary } from 'ts-runtime-typecheck';

export interface UploadState {
  filesCount: number; // internal. do not use
  success: SuccessState;
  //        failure: {}, // failed upload counts by error message
  types: Dictionary<number>; // completely uploaded file counts by file type {".fastq": 1, ".vcf": 17}
  failure?: Dictionary<number>;
  niceTypes: string; // "1 .fastq, 17.vcf"
  progress: ProgressState;
}

// successfully uploaded file count, bytes, reads
export interface SuccessState {
  files: number;
  bytes: number;
  reads: number;
  niceReads: string | number;
  niceSize: string | number;
}

// uploads/downloads in-flight: bytes, total
export interface ProgressState {
  bytes: number;
  total: number;
  niceSize: string | number;
}

export interface DownloadState {
  progress: ProgressState;
  success: SuccessState;
  fail: number;
  failure?: Dictionary;
  //        failure: {}, // failed download count by error message
  types: Dictionary<number>; // completely downloaded file counts by file type {".fastq": 17, ".vcf": 1}
  niceTypes: string; // "17 .fastq, 1.vcf"
}

export interface Warning {
  msg: string;
  type: string; // this should probably be typed or an enum
}
export interface States {
  upload: UploadState;
  download: DownloadState;
  warnings: Warning[];
}
