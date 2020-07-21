declare class EPI2ME {
    constructor(OptString: any);
    log: any;
    stopped: boolean;
    uploadState$: BehaviorSubject<boolean>;
    analyseState$: BehaviorSubject<boolean>;
    reportState$: BehaviorSubject<boolean>;
    instanceTelemetry$: BehaviorSubject<null>;
    experimentalWorkerStatus$: BehaviorSubject<null>;
    runningStates$: import("rxjs").Observable<[boolean, boolean, boolean]>;
    states: {
        upload: {
            filesCount: number;
            success: {
                files: number;
                bytes: number;
                reads: number;
            };
            types: {};
            niceTypes: string;
            progress: {
                bytes: number;
                total: number;
            };
        };
        download: {
            progress: {};
            success: {
                files: number;
                reads: number;
                bytes: number;
            };
            fail: number;
            types: {};
            niceTypes: string;
        };
        warnings: never[];
    };
    liveStates$: BehaviorSubject<{
        upload: {
            filesCount: number;
            success: {
                files: number;
                bytes: number;
                reads: number;
            };
            types: {};
            niceTypes: string;
            progress: {
                bytes: number;
                total: number;
            };
        };
        download: {
            progress: {};
            success: {
                files: number;
                reads: number;
                bytes: number;
            };
            fail: number;
            types: {};
            niceTypes: string;
        };
        warnings: never[];
    }>;
    config: {
        options: any;
        instance: {
            id_workflow_instance: any;
            inputQueueName: null;
            outputQueueName: null;
            outputQueueURL: null;
            discoverQueueCache: {};
            bucket: null;
            bucketFolder: null;
            remote_addr: null;
            chain: null;
            key_id: null;
        };
    };
    REST: REST;
    graphQL: GraphQL;
    timers: {
        downloadCheckInterval: null;
        stateCheckInterval: null;
        fileCheckInterval: null;
        transferTimeouts: {};
        visibilityIntervals: {};
        summaryTelemetryInterval: null;
    };
    socket(): Promise<Socket>;
    mySocket: Socket | undefined;
    realtimeFeedback(channel: any, object: any): Promise<void>;
    stopTimer(intervalName: any): void;
    stopAnalysis(): Promise<void>;
    stopUpload(): Promise<void>;
    stopEverything(): Promise<void>;
    downloadWorkerPool: any;
    reportProgress(): void;
    storeState(direction: any, table: any, op: any, newDataIn: any): void;
    stateReportTime: number | undefined;
    uploadState(table: any, op: any, newData: any): void;
    downloadState(table: any, op: any, newData: any): void;
    url(): any;
    apikey(): any;
    attr(key: any, value: any): any;
    stats(key: any): any;
}
declare namespace EPI2ME {
    export const version: string;
    export { Profile };
    export { REST };
    export { utils };
}
export default EPI2ME;
import { BehaviorSubject } from "rxjs";
import REST from "./rest";
import GraphQL from "./graphql";
import Socket from "./socket";
import Profile from "./profile";
import utils from "./utils";
