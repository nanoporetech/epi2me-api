import type { Dictionary, Index } from 'ts-runtime-typecheck';
import type { EPI2ME_FS } from './epi2me-fs';
import type { UploadState, Warning } from './epi2me-state.type';
import type { Logger } from './Logger.type';
import type { SplitStyle } from './splitters/splitter.type';
import type { Observable } from 'rxjs';
import type { Configuration } from './Configuration.type';
import type { FileIndex } from './FileIndex';

export interface UploaderOptions {
  inputFolders: string[];
  filetypes?: string | string[];
  outputFolder?: string;
  uploadInterval: number;
  logger: Logger;
  workflow: Dictionary; // TODO! This is treated as Dictionary<unknown> but it should be a known type
}

export interface FileScannerOptions {
  fileIndex: FileIndex;
  inputFolders: string[];
  filetypes?: string | string[];
  outputFolder?: string;
  context: UploadContext;
}

export interface UploadSettings {
  maxFiles: number;
  maxFileSize: number;
  requiresStorage: boolean;
  bucket: string;
  bucketFolder: string;
  retries: number;
  split?: SplitStyle;
  sseKeyId?: string;
}

export interface UploadContext {
  settings: UploadSettings;
  state: UploadState;
  warnings: Warning[];
  fileIndex: FileIndex;
  splitFiles: Set<string>;
  instance: EPI2ME_FS;
  logger: Logger;
  hasStopped: boolean;
  stopped$: Observable<boolean>; // doesn't really need the value, but the implementation currently always emits "true"
}

export interface InputQueueMessage {
  components?: unknown;
  targetComponentId?: Index;
  key_id?: unknown;
  bucket?: string;
  outputQueue?: string;
  remote_addr?: string;
  apikey?: string;
  id_workflow_instance?: Index;
  id_master?: Index;
  utc: string;
  path: string;
  prefix: string;
}

export interface UploadConfigurationSubset {
  workflow?: Configuration['workflow'];
  instance: Pick<Configuration['instance'], 'bucket' | 'bucketFolder' | 'key_id'>;
  options: Pick<Configuration['options'], 'uploadRetries'>;
}

export enum FileUploadWarnings {
  TOO_MANY,
  EMPTY,
  TOO_BIG,
  SPLIT,
  UPLOAD_FAILED,
  UPLOAD_RETRIES_EXCEEDED,
  MESSAGE_RETRIES_EXCEEDED,
}

export enum UploadWarnings {
  SCAN_FAIL,
}
