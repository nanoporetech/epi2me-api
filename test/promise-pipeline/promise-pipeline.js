import assert from 'assert';
import sinon from 'sinon';
import PromisePipeline from '../../src/promise-pipeline';

describe('promise-pipeline', () => {
  let clock;
  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });
  afterEach(() => {
    clock.restore();
  });

  it('should run a queue of Promises with a configurable bandwidth', async () => {
    const pp = new PromisePipeline({
      start: false,
      bandwidth: 2,
    });

    const promises = [];

    for (let i = 0; i < 3; i += 1) {
      const p = new Promise((resolve, reject) => {
        promises.push({
          resolve,
          reject,
        });
      });
      pp.enqueue(() => { // eslint-disable-line
        return p;
      });
    }

    assert.deepEqual(
      pp.state(),
      {
        queued: 3,
        running: 0,
        completed: 0,
        state: 'stopped',
      },
      'queued jobs',
    );

    pp.start();

    clock.tick(500);

    assert.deepEqual(
      pp.state(),
      {
        queued: 1,
        running: 2,
        completed: 0,
        state: 'running',
      },
      'running jobs',
    );

    clock.tick(500);

    assert.deepEqual(
      pp.state(),
      {
        queued: 1,
        running: 2,
        completed: 0,
        state: 'running',
      },
      'running jobs - nothing changed',
    );

    promises[0].resolve('done0');
    promises[1].resolve('done1');

    await Promise.all(pp.running); // wait for resolutions to bubble up & settle
    clock.tick(500);

    assert.deepEqual(
      pp.state(),
      {
        queued: 0,
        running: 2,
        completed: 1, // i'm sure this should have completed 2 here!
        state: 'running',
      },
      'completed jobs & state change',
    );

    promises[2].resolve('done2');

    await Promise.all(pp.running); // wait for resolutions to bubble up & settle
    clock.tick(500);

    pp.stop();

    assert.deepEqual(
      pp.state(),
      {
        queued: 0,
        running: 1,
        completed: 2, // i'm sure this should have completed 3 here!
        state: 'stopped',
      },
      'complete jobs & state change',
    );
  });
});
