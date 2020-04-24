import assert from 'assert';
import utils from '../../src/utils';

describe('utils.convertResponseToObject', () => {
  it('obj returned as obj', () => {
    const obj = { a: 'b' };
    const ret = utils.convertResponseToObject(obj);
    assert.deepEqual(ret, obj);
  }),
    it('json returned as obj', () => {
      const obj = { a: 'b' };
      const ret = utils.convertResponseToObject(JSON.stringify(obj));
      assert.deepEqual(ret, obj);
    }),
    it('bad json error thrown', () => {
      const fn = () => utils.convertResponseToObject('{badJson}');
      assert.throws(fn);
    });
});
