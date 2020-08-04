export declare type MappedFileStats = {
    type: string;
    bytes: number;
    sequences: number;
} | {
    type: string;
    bytes: number;
} | {
    type: string;
    bytes: number;
    reads: number;
};
export default function filestats(filePath?: string): Promise<MappedFileStats>;
