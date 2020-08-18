import { createInterval, DisposeTimer } from './timers';

export interface QueryablePromise<T> extends Promise<T> {
  isResolved(): boolean;
  isRejected(): boolean;
  isPending(): boolean;
}

export function createQueryablePromise<T>(promise: Promise<T>): QueryablePromise<T> {
  let pending = true;
  let resolved = false;
  let rejected = false;

  promise.then(
    () => {
      pending = false;
      resolved = true;
    },
    () => {
      pending = false;
      rejected = true;
    },
  );

  return Object.assign(promise, {
    isResolved(): boolean {
      return resolved;
    },
    isRejected(): boolean {
      return rejected;
    },
    isPending(): boolean {
      return pending;
    },
  });
}
export default class PromisePipeline<T = unknown> {
  static MakeQueryablePromise<O>(promiseIn: Promise<O> | QueryablePromise<O>): QueryablePromise<O> {
    // Don't modify any promise that has been already modified.
    if ('isResolved' in promiseIn) {
      return promiseIn;
    }

    return createQueryablePromise(promiseIn);
  }

  bandwidth: number;
  interval: number;
  pipeline: Array<() => Promise<T>> = [];
  running: Array<QueryablePromise<T>> = [];
  completed = 0;
  timer: DisposeTimer | null = null;

  constructor({
    bandwidth = 1,
    interval = 500,
    start = true,
  }: {
    bandwidth?: number;
    interval?: number;
    start?: boolean;
  }) {
    this.bandwidth = bandwidth;
    this.interval = interval;

    if (start) {
      this.start();
    }
  }

  enqueue(promiseMaker: () => Promise<T>): void {
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
    const runningCount = this.running.length;
    this.running = this.running.filter((promise) => promise.isPending());
    this.completed += runningCount - this.running.length;

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
