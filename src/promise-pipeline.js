export default class PromisePipeline {
  static MakeQueryablePromise(promise) {
    // Don't modify any promise that has been already modified.
    if (promise.isResolved) return promise;

    // Set initial state
    let isPending = true;
    let isRejected = false;
    let isResolved = false;

    // Observe the promise, saving the fulfillment in a closure scope.
    const improvedPromise = promise.then(
      v => {
        isResolved = true;
        isPending = false;
        return v;
      },
      e => {
        isRejected = true;
        isPending = false;
        throw e;
      },
    );

    improvedPromise.isResolved = () => {
      return isResolved;
    };
    improvedPromise.isPending = () => {
      return isPending;
    };
    improvedPromise.isRejected = () => {
      return isRejected;
    };
    return improvedPromise;
  }

  constructor(opts) {
    this.pipeline = [];
    this.running = [];
    this.bandwidth = opts.bandwidth || 1;
    this.interval = opts.interval || 500;

    if (!('start' in opts) || opts.start) {
      this.start();
    }
  }

  enqueue(jobGenerator) {
    this.pipeline.push(jobGenerator);
  }

  start() {
    this.intervalId = setInterval(() => {
      this.monitorInterval();
    }, this.interval);
  }

  stop() {
    clearInterval(this.intervalId);
  }

  state() {
    return {
      queued: this.pipeline.length,
      running: this.running.length,
    };
  }

  monitorInterval() {
    // remove complete jobs from the pipeline. reverse order so splice doesn't change indices
    const completedPositions = this.running
      .map((o, i) => {
        return !o.isPending() ? i : null;
      })
      .filter(o => o)
      .reverse();

    completedPositions.forEach(pos => {
      this.running.splice(pos, 1); // remove completed promises in-place
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
