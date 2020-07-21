declare class EPI2ME_FS extends EPI2ME {
    constructor(optString: any);
    SampleReader: SampleReader;
    uploadsInProgress: any[];
    sessionedS3(): Promise<AWS.S3>;
    sessionManager: SessionManager | undefined;
    sessionedSQS(): Promise<AWS.SQS>;
    deleteMessage(message: any): Promise<{
        $response: AWS.Response<{}, AWS.AWSError>;
    }>;
    discoverQueue(queueName: any): Promise<any>;
    queueLength(queueURL: any): Promise<string>;
    autoStart(workflowConfig: any, cb: any): Promise<any>;
    autoStartGQL(variables: any, cb: any): Promise<any>;
    autoStartGeneric(workflowConfig: any, startFn: any, cb: any): Promise<any>;
    autoJoin(id: any, cb: any): Promise<any>;
    setClassConfigGQL({ data: { startData: { bucket, idUser, remoteAddr, userDefined, instance: { outputqueue, keyId, startDate, idWorkflowInstance, mappedTelemetry, chain, workflowImage: { region: { name }, workflow: { idWorkflow }, inputqueue, }, }, }, }, }: {
        data: {
            startData: {
                bucket: any;
                idUser: any;
                remoteAddr: any;
                userDefined?: {} | undefined;
                instance: {
                    outputqueue: any;
                    keyId: any;
                    startDate: any;
                    idWorkflowInstance: any;
                    mappedTelemetry: any;
                    chain: any;
                    workflowImage: {
                        region: {
                            name: any;
                        };
                        workflow: {
                            idWorkflow: any;
                        };
                        inputqueue: any;
                    };
                };
            };
        };
    }): void;
    setClassConfigREST(instance: any): void;
    initSessionManager(opts: any, children: any): SessionManager;
    autoConfigure(instance: any, autoStartCb: any): Promise<any>;
    db: DB | undefined;
    telemetryLogStream: fs.WriteStream | undefined;
    checkForDownloads(): Promise<void>;
    checkForDownloadsRunning: boolean | undefined;
    downloadAvailable(): Promise<void>;
    loadUploadFiles(): Promise<void>;
    dirScanInProgress: boolean | undefined;
    enqueueUploadFiles(files: any): Promise<void>;
    uploadJob(file: any): Promise<void | import("sqlite").Statement>;
    receiveMessages(receiveMessages: any): Promise<void>;
    processMessage(message: any): Promise<void>;
    initiateDownloadStream(s3Item: any, message: any, outputFile: any): Promise<any>;
    uploadHandler(file: any): Promise<any>;
    uploadComplete(objectId: any, file: any): Promise<import("sqlite").Statement>;
    fetchTelemetry(): Promise<void>;
}
declare namespace EPI2ME_FS {
    export const version: any;
    export { REST };
    export { utils };
    export { SessionManager };
    export const EPI2ME_HOME: string;
    export { Profile };
    export { Factory };
}
export default EPI2ME_FS;
import EPI2ME from "./epi2me";
import SampleReader from "./sample-reader";
import AWS from "aws-sdk";
import SessionManager from "./session-manager";
import DB from "./db";
import fs from "fs-extra";
import REST from "./rest-fs";
import utils from "./utils-fs";
import Profile from "./profile-fs";
import Factory from "./factory";
