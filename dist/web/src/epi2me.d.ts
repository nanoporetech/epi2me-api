import { BehaviorSubject } from 'rxjs';
import GraphQL from './graphql';
import Profile, { AllProfileData } from './profile';
import REST from './rest';
import type REST_FS from './rest-fs';
import type ProfileFS from './profile-fs';
import Socket from './socket';
import { ObjectDict } from './ObjectDict';
import { Logger } from './Logger';
import { EPI2ME_OPTIONS } from './epi2me-options';
import { States, UploadState, DownloadState, WarningState, SuccessState, ProgressState } from './epi2me-state';
import { Configuration } from './Configuration';
import { DisposeTimer } from './timers';
export default class EPI2ME {
    static version: string;
    static Profile: {
        new (o: AllProfileData): Profile;
    } | {
        new (s?: string, r?: boolean): ProfileFS;
    };
    static REST: {
        new (o: EPI2ME_OPTIONS): REST | REST_FS;
    };
    static utils: import("./utils").Utility;
    readonly log: Logger;
    stopped: boolean;
    uploadState$: BehaviorSubject<boolean>;
    analyseState$: BehaviorSubject<boolean>;
    reportState$: BehaviorSubject<boolean>;
    runningStates$: import("rxjs").Observable<[boolean, boolean, boolean]>;
    instanceTelemetry$: BehaviorSubject<unknown[]>;
    experimentalWorkerStatus$: BehaviorSubject<{
        running: number;
        complete: number;
        error: number;
        step: number;
        name: string;
    }[]>;
    states: States;
    timers: {
        downloadCheckInterval?: DisposeTimer;
        stateCheckInterval?: DisposeTimer;
        fileCheckInterval?: DisposeTimer;
        transferTimeouts: ObjectDict<DisposeTimer>;
        visibilityIntervals: ObjectDict<DisposeTimer>;
        summaryTelemetryInterval?: DisposeTimer;
    };
    stateReportTime?: number;
    liveStates$: BehaviorSubject<States>;
    downloadWorkerPool?: ObjectDict;
    config: Configuration;
    REST: REST | REST_FS;
    graphQL: GraphQL;
    mySocket?: Socket;
    constructor(optstring?: Partial<EPI2ME_OPTIONS> | string);
    static parseOptObject(opt: ObjectDict | Partial<EPI2ME_OPTIONS>): EPI2ME_OPTIONS;
    static resolveLogger(log: unknown): Logger;
    socket(): Promise<Socket>;
    realtimeFeedback(channel: string, object: unknown): Promise<void>;
    setTimer(intervalName: "downloadCheckInterval" | "stateCheckInterval" | "fileCheckInterval" | "summaryTelemetryInterval", intervalDuration: number, cb: Function): void;
    stopTimer(intervalGroupName: "downloadCheckInterval" | "stateCheckInterval" | "fileCheckInterval" | "summaryTelemetryInterval"): void;
    stopTimeout(timerGroupName: "transferTimeouts", timerName: string): void;
    stopAnalysis(): Promise<void>;
    stopUpload(): void;
    stopEverything(): Promise<void>;
    reportProgress(): void;
    uploadState(table: "success" | "types" | "progress", op: string, newData: ObjectDict<number>): void;
    downloadState(table: "success" | "types" | "progress", op: string, newData: ObjectDict<number>): void;
    updateSuccessState(state: SuccessState, op: string, newData: ObjectDict<number>): void;
    updateTypesState(state: ObjectDict, op: string, newData: ObjectDict<number>): void;
    updateProgressState(state: ProgressState, op: string, newData: ObjectDict<number>): void;
    url(): string | undefined;
    apikey(): string | undefined;
    /**
     * @deprecated attr() breaks type guarantees for the configuration options
     * and hence is depreciated.
     */
    attr(key: keyof EPI2ME_OPTIONS, value: EPI2ME_OPTIONS[keyof EPI2ME_OPTIONS]): EPI2ME_OPTIONS[keyof EPI2ME_OPTIONS] | this;
    stats(key: keyof States): UploadState | DownloadState | WarningState;
}
