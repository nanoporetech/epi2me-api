import assert from 'assert';
import sinon from 'sinon';
import PromisePipeline from '../../src/promise-pipeline';

describe('promise-pipeline', () => {
  describe('constructor', () => {
    it('should not start', () => {
      const stub = sinon.stub(PromisePipeline.prototype, 'start').callsFake();
      const pp = new PromisePipeline({ // eslint-disable-line
        start: false,
      });
      assert.deepEqual(stub.callCount, 0, 'explicit false');
      stub.restore();
    });

    it('should start', () => {
      const stub = sinon.stub(PromisePipeline.prototype, 'start').callsFake();
      const pp = new PromisePipeline({ // eslint-disable-line
        start: true,
      });
      assert.deepEqual(stub.callCount, 1, 'explicit true');
      stub.restore();
    });

    it('should start', () => {
      const stub = sinon.stub(PromisePipeline.prototype, 'start').callsFake();
      const pp = new PromisePipeline({}); // eslint-disable-line
      assert.deepEqual(stub.callCount, 1, 'default true');
      stub.restore();
    });
  });
});
