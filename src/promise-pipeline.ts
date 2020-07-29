import { createInterval, DisposeTimer } from "./timers";

type Resolver<T> = (resolve: (value?: T) => void, reject: (reason?: unknown) => void) => void;

export class QueryablePromise<T> extends Promise<T> {
  private resolved = false;
  private pending = true;
  private rejected = false;

  /*
    NOTE any class that extends Promise MUST also be able to accept the standard
    promise constructor arguments. This is because when "then" is called a new
    instance of the sub class is instantiated with a resolver passed in. "then"
    is also called when awaiting a promise
  */
  constructor(original: Resolver<T> | Promise<T> ) {
    super((res, rej) => {
      if (typeof original === "function") {
        original(
          (val?: T) => {
            this.pending = false;
            this.resolved = true;
            res(val);
          },
          (err: unknown) => {
            this.pending = false;
            this.rejected = true;
            rej(err);
          }
        )
      }
      else {
        original.then(
          (val: T) => {
            this.pending = false;
            this.resolved = true;
            res(val);
          },
          (err: unknown) => {
            this.pending = false;
            this.rejected = true;
            rej(err);
          }
        )
      }
    });
  }
  isResolved(): boolean {
    return this.resolved;
  }
  isRejected(): boolean {
    return this.rejected;
  }
  isPending(): boolean {
    return this.pending;
  }
}

export default class PromisePipeline<T = unknown> {
  static MakeQueryablePromise<O>(promiseIn: Promise<O> | QueryablePromise<O>): QueryablePromise<O> {
    // Don't modify any promise that has been already modified.
    if (promiseIn instanceof QueryablePromise) {
      return promiseIn;
    }

    return new QueryablePromise(promiseIn);
  }

  bandwidth: number;
  interval: number;
  pipeline: Array<() => QueryablePromise<T>> = [];
  running: Array<QueryablePromise<T>> = [];
  completed = 0;
  timer: DisposeTimer | null = null;

  constructor({ bandwidth = 1, interval = 500, start = true }: { bandwidth?: number; interval?: number; start?: boolean }) {

    this.bandwidth = bandwidth;
    this.interval = interval;

    if (start) {
      this.start();
    }
  }

  enqueue(promiseMaker: () => QueryablePromise<T>): void {
    this.pipeline.push(promiseMaker);
  }

  start(): void {
    if (this.timer) {
      return;
    }

    this.timer = createInterval(this.interval, () => {
      this.monitorInterval();
    });
  }

  stop(): void {
    if (this.timer) {
      this.timer();
      this.timer = null;
    }
  }

  state(): { queued: number; running: number; completed: number; state: string } {
    return {
      queued: this.pipeline.length,
      running: this.running.length,
      completed: this.completed,
      state: this.timer ? 'running' : 'stopped',
    };
  }

  monitorInterval(): void {
    // remove complete jobs from the pipeline. reverse order so splice doesn't change indices
    const completedPositions: number[] = [];

    for (let i = 0; i < this.running.length; i += 1) {
      const o = this.running[i];
      if (!o.isPending()) {
        completedPositions.unshift(i);
      }
    }

    completedPositions.forEach(pos => {
      this.running.splice(pos, 1); // remove completed promises in-place
      this.completed += 1;
    });

    const availablePositions = this.bandwidth - this.running.length;
    for (let i = 0; i < availablePositions; i += 1) {
      const nextJob = this.pipeline.shift();

      if (!nextJob) {
        return;
      }

      this.running.push(PromisePipeline.MakeQueryablePromise(nextJob()));
    }
  }
}
