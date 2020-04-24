export default utils;
declare namespace utils {
    export function pipe(uriIn: any, filepath: any, options: any, progressCb: any): Promise<any>;
    export function getFileID(): string;
    export function lsRecursive(rootFolderIn: any, item: any, exclusionFilter: any): any;
    export function loadInputFiles({ inputFolders, outputFolder, filetype: filetypesIn }: {
        inputFolders: any;
        outputFolder: any;
        filetype: any;
    }, log: any, extraFilter: any): Promise<any>;
    export function stripFile(filename: any): string[];
}
import utils from "./utils";
