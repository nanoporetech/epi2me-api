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

  describe('constructor', () => {
    it('should start if not started', () => {
      const pp = new PromisePipeline({
        start: false,
      });
      const stub = sinon.stub(pp, 'monitorInterval').callsFake();
      pp.start();
      clock.tick(1000);
      pp.stop();
      assert.notEqual(stub.callCount, 0);
    });

    it('should not start if started', () => {
      const pp = new PromisePipeline({
        start: false,
      });
      pp.intervalId = 1;
      const stub = sinon.stub(pp, 'monitorInterval').callsFake();
      pp.start();
      clock.tick(1000);
      pp.stop();
      assert.equal(stub.callCount, 0);
    });
  });
});
