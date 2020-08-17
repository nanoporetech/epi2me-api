export declare type MappedFileStats = {
    type: string;
    bytes: number;
    sequences?: number;
    reads?: number;
};
export default function filestats(filePath?: string): Promise<MappedFileStats>;
