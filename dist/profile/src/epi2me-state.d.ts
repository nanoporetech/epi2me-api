import { ObjectDict } from "./ObjectDict";
export interface UploadState {
    filesCount: number;
    success: SuccessState;
    types: ObjectDict<number>;
    failure?: ObjectDict;
    niceTypes: string;
    progress: ProgressState;
}
export interface SuccessState {
    files: number;
    bytes: number;
    reads: number;
    niceReads: string | number;
    niceSize: string | number;
}
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
    types: ObjectDict<number>;
    niceTypes: string;
}
export declare type WarningState = unknown[];
export interface States {
    upload: UploadState;
    download: DownloadState;
    warnings: WarningState;
}
export declare function createSuccessState(): SuccessState;
export declare function createProgressState(): ProgressState;
export declare function createUploadState(): UploadState;
export declare function createDownloadState(): DownloadState;
