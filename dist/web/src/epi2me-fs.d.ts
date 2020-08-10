/// <reference types="node" />
import AWS from 'aws-sdk';
import fs from 'fs-extra';
import DB from './db';
import EPI2ME from './epi2me';
import Factory from './factory';
import { MappedFileStats } from './filestats';
import Profile from './profile-fs';
import REST_FS from './rest-fs';
import SampleReader from './sample-reader';
import SessionManager from './session-manager';
import { FileStat } from './utils-fs';
import { ObjectDict } from './ObjectDict';
import { Index } from './runtime-typecast';
import { FetchResult } from 'apollo-link';
import { Configuration } from './Configuration';
import { PromiseResult } from 'aws-sdk/lib/request';
import { EPI2ME_OPTIONS } from './epi2me-options';
declare type FileDescriptor = FileStat & {
    skip?: string;
    stats?: MappedFileStats;
};
export default class EPI2ME_FS extends EPI2ME {
    static version: string;
    static REST: typeof REST_FS;
    static utils: import("./utils-fs").UtilityFS;
    static SessionManager: typeof SessionManager;
    static EPI2ME_HOME: string;
    static Profile: typeof Profile;
    static Factory: typeof Factory;
    SampleReader: SampleReader;
    uploadsInProgress: {
        abort(): void;
    }[];
    sessionManager?: SessionManager;
    telemetryLogStream?: fs.WriteStream;
    db?: DB;
    checkForDownloadsRunning?: boolean;
    dirScanInProgress?: boolean;
    uploadMessageQueue?: unknown;
    downloadMessageQueue?: unknown;
    REST: REST_FS;
    constructor(optstring: Partial<EPI2ME_OPTIONS> | string);
    sessionedS3(): Promise<AWS.S3>;
    sessionedSQS(): Promise<AWS.SQS>;
    deleteMessage(message: {
        ReceiptHandle?: string;
    }): Promise<unknown>;
    discoverQueue(queueName?: string): Promise<string>;
    queueLength(queueURL: string): Promise<unknown>;
    autoStart(workflowConfig: ObjectDict, cb?: (msg: string) => void): Promise<ObjectDict>;
    autoStartGQL(variables: {
        idWorkflow: Index;
        computeAccountId: Index;
        storageAccountId?: Index;
        isConsentedHuman?: boolean;
        idDataset?: Index;
        storeResults?: boolean;
        region?: string;
        userDefined?: {
            [componentId: string]: {
                [paramOverride: string]: unknown;
            };
        };
        instanceAttributes?: {
            id_attribute: string;
            value: string;
        }[];
    }, cb?: (msg: string) => void): Promise<Configuration['instance']>;
    autoStartGeneric<T>(workflowConfig: unknown, startFn: () => T, cb?: (msg: string) => void): Promise<T>;
    autoJoin(id: Index, cb?: (msg: string) => void): Promise<unknown>;
    setClassConfigGQL(result: FetchResult<ObjectDict>): void;
    setClassConfigREST(instance: ObjectDict): void;
    initSessionManager(opts?: ObjectDict | null, children?: {
        config: {
            update: Function;
        };
    }[]): SessionManager;
    autoConfigure<T>(instance: T, autoStartCb?: (msg: string) => void): Promise<T>;
    stopUpload(): Promise<void>;
    stopEverything(): Promise<void>;
    checkForDownloads(): Promise<void>;
    downloadAvailable(): Promise<unknown>;
    loadUploadFiles(): Promise<unknown>;
    enqueueUploadFiles(files?: FileStat[]): Promise<unknown>;
    uploadJob(file: FileDescriptor): Promise<void>;
    receiveMessages(receiveMessages?: PromiseResult<AWS.SQS.ReceiveMessageResult, AWS.AWSError>): Promise<void>;
    processMessage(message?: AWS.SQS.Message): Promise<void>;
    initiateDownloadStream(s3Item: {
        bucket: string;
        path: string;
    }, message: AWS.SQS.Message, outputFile: string): Promise<unknown>;
    uploadHandler(file: FileDescriptor): Promise<FileDescriptor>;
    uploadComplete(objectId: string, file: {
        id: string;
        path: string;
    }): Promise<unknown>;
    fetchTelemetry(): Promise<void>;
}
export {};
