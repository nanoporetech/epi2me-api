import { merge } from 'lodash';

export default class PromisePipeline {
  static MakeQueryablePromise(promiseIn) {
    // Don't modify any promise that has been already modified.
    if (promiseIn.isResolved) return promiseIn;

    // Set initial state
    let isPending = true;
    let isRejected = false;
    let isResolved = false;

    // Observe the promise, saving the fulfillment in a closure scope.
    const promiseOut = promiseIn
      .then(v => {
        isResolved = true;
        isPending = false;
        return v;
      })
      .catch(e => {
        isRejected = true;
        isPending = false;
        throw e;
      });

    promiseOut.dependsOn = promiseIn;
    promiseOut.isResolved = () => {
      return isResolved;
    };
    promiseOut.isPending = () => {
      return isPending;
    };
    promiseOut.isRejected = () => {
      return isRejected;
    };
    return promiseOut;
  }

  constructor(optsIn) {
    const opts = merge(
      {
        bandwidth: 1,
        interval: 500,
      },
      optsIn,
    );
    this.bandwidth = opts.bandwidth;
    this.interval = opts.interval;
    this.pipeline = [];
    this.running = [];
    this.completed = 0;
    this.intervalId = null;

    if (!('start' in opts) || opts.start) {
      this.start();
    }
  }

  enqueue(promiseMaker) {
    this.pipeline.push(promiseMaker);
  }

  start() {
    if (this.intervalId) {
      return;
    }

    this.intervalId = setInterval(() => {
      this.monitorInterval();
    }, this.interval);
  }

  stop() {
    clearInterval(this.intervalId);
    delete this.intervalId;
  }

  state() {
    return {
      queued: this.pipeline.length,
      running: this.running.length,
      completed: this.completed,
      state: this.intervalId ? 'running' : 'stopped',
    };
  }

  monitorInterval() {
    // remove complete jobs from the pipeline. reverse order so splice doesn't change indices
    const completedPositions = this.running
      .map((o, i) => {
        return o.isPending() ? null : i;
      })
      .filter(o => o)
      .reverse();

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
