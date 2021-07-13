import type { DownloadState, ProgressState, SuccessState, UploadState } from './epi2me-state.type';

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
    niceTypes: '',
  };
}

export function createDownloadState(): DownloadState {
  return {
    progress: createProgressState(),
    success: createSuccessState(),
    types: {},
    fail: 0,
    niceTypes: '',
  };
}
