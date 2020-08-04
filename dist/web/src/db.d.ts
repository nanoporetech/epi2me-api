import sqlite from 'sqlite';
export default class db {
    options: any;
    log: any;
    db: Promise<sqlite.Database>;
    constructor(dbRoot: string, optionsIn: any, log: any);
    uploadFile(filename: string): Promise<sqlite.Statement>;
    skipFile(filename: string): Promise<sqlite.Statement>;
    splitFile(child: string, parent: string): Promise<sqlite.Statement>;
    splitDone(child: string): Promise<sqlite.Statement>;
    splitClean(): Promise<void>;
    seenUpload(filename: string): Promise<number>;
}
