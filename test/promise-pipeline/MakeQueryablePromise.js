import assert from 'assert';
import PromisePipeline from '../../src/promise-pipeline';

describe('promise-pipeline', () => {
  describe('MakeQueryablePromise', () => {
    it('should augment a promise', async () => {
      const p = new Promise(() => {});
      const p2 = PromisePipeline.MakeQueryablePromise(p);
      assert.equal(p2.isPending(), true, 'pending indicator');
      assert.equal(p2.isResolved(), false, 'resolved indicator');
      assert.equal(p2.isRejected(), false, 'rejected indicator');
    });

    it('should not augment an augmented promise', async () => {
      const p = new Promise(() => {});
      const p2 = PromisePipeline.MakeQueryablePromise(p);
      const p3 = PromisePipeline.MakeQueryablePromise(p2);
      assert.deepEqual(p2, p3, 'unmodified');
    });

    it('should indicate resolution', async () => {
      let resolve;
      const p = new Promise((succeed) => {
        resolve = succeed;
      });
      const p2 = PromisePipeline.MakeQueryablePromise(p);
      resolve('success');
      assert.equal(await p2, 'success');
      assert.equal(p2.isPending(), false, 'pending indicator');
      assert.equal(p2.isResolved(), true, 'resolved indicator');
      assert.equal(p2.isRejected(), false, 'rejected indicator');
    });

    it('should indicate rejection', async () => {
      let reject;
      const p = new Promise((succeed, fail) => {
        reject = fail;
      });
      const p2 = PromisePipeline.MakeQueryablePromise(p);
      reject(new Error('failed'));

      try {
        await p2;
        assert.fail(new Error('unexpected success'));
      } catch (e) {
        assert.ok(String(e).match(/failed/));
      }

      assert.equal(p2.isPending(), false, 'pending indicator');
      assert.equal(p2.isResolved(), false, 'resolved indicator');
      assert.equal(p2.isRejected(), true, 'rejected indicator');
    });
  });
});
