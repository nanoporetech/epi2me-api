export default class PromisePipeline {
    static MakeQueryablePromise(promiseIn: any): any;
    constructor(optsIn: any);
    bandwidth: any;
    interval: any;
    pipeline: any[];
    running: any[];
    completed: number;
    intervalId: NodeJS.Timeout | null;
    enqueue(promiseMaker: any): void;
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
