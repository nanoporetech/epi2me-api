import { DisposeTimer } from "./timers";
export interface QueryablePromise<T> extends Promise<T> {
    isResolved(): boolean;
    isRejected(): boolean;
    isPending(): boolean;
}
export declare function createQueryablePromise<T>(promise: Promise<T>): QueryablePromise<T>;
export default class PromisePipeline<T = unknown> {
    static MakeQueryablePromise<O>(promiseIn: Promise<O> | QueryablePromise<O>): QueryablePromise<O>;
    bandwidth: number;
    interval: number;
    pipeline: Array<() => Promise<T>>;
    running: Array<QueryablePromise<T>>;
    completed: number;
    timer: DisposeTimer | null;
    constructor({ bandwidth, interval, start }: {
        bandwidth?: number;
        interval?: number;
        start?: boolean;
    });
    enqueue(promiseMaker: () => Promise<T>): void;
    start(): void;
    stop(): void;
    state(): {
        queued: number;
        running: number;
        completed: number;
        state: string;
    };
    monitorInterval(): void;
}
