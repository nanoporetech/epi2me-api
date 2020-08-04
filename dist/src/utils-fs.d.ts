/// <reference types="node" />
import fs from 'fs-extra';
import { UtilityOptions, Utility } from './utils';
export interface FileStat {
    name: string;
    path: string;
    relative: string;
    size: number;
    id: string;
}
export interface UtilityFS extends Utility {
    pipe(uri: string, path: string, options: UtilityOptions, progressCallback: (e: unknown) => void): Promise<unknown>;
    getFileID(): string;
    lsRecursive(rootFolderIn: string, item: string, exclusionFilter: (str: string, stat: fs.Stats) => Promise<boolean>): Promise<FileStat[]>;
    loadInputFiles({ inputFolders, outputFolder, filetype: filetypesIn }: {
        inputFolders: string[];
        outputFolder?: string;
        filetype: string | string[];
    }, _log: unknown, extraFilter?: (file: string) => Promise<boolean>): Promise<FileStat[]>;
    stripFile(filename: string): [string, string];
}
declare const utilsFS: UtilityFS;
export default utilsFS;
