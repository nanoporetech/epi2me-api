import { ObjectDict } from "./ObjectDict";

export interface UploadState {
  filesCount: number; // internal. do not use
  success: SuccessState;
  //        failure: {}, // failed upload counts by error message
  types: ObjectDict<number>; // completely uploaded file counts by file type {".fastq": 1, ".vcf": 17}
  failure?: ObjectDict;
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
  failure?: ObjectDict;
  //        failure: {}, // failed download count by error message
  types: ObjectDict<number>; // completely downloaded file counts by file type {".fastq": 17, ".vcf": 1}
  niceTypes: string; // "17 .fastq, 1.vcf"
}

export type WarningState = unknown[];

export interface States {
  upload: UploadState;
  download: DownloadState;
  warnings: WarningState;
}

export function createSuccessState(): SuccessState {
  return {
    files: 0,
    bytes: 0,
    reads: 0,
    niceReads: 0,
    niceSize: 0,
  };
}

export function createProgressState(): ProgressState {
  return {
    bytes: 0,
    total: 0,
    niceSize: 0,
  };
}

export function createUploadState(): UploadState {
  return {
    progress: createProgressState(),
    success: createSuccessState(),
    types: {},
    filesCount: 0,
    niceTypes: "",
  }
}

export function createDownloadState(): DownloadState {
  return {
    progress: createProgressState(),
    success: createSuccessState(),
    types: {},
    fail: 0,
    niceTypes: "",
  }
}
