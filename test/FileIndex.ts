import { expect } from 'chai';
import { FileIndex } from '../src/FileIndex';

describe('FileIndex', () => {
  it('basic usage', () => {
    const index = new FileIndex();
    expect(index.has('example/location')).to.equal(false);
    index.add('example/location');
    expect(index.has('example')).to.equal(false);
    expect(index.has('example/other')).to.equal(false);
    expect(index.has('example/location')).to.equal(true);
    index.add('alternative/thing');
    expect(index.has('alternative')).to.equal(false);
    expect(index.has('alternative/other')).to.equal(false);
    expect(index.has('alternative/thing')).to.equal(true);
  });
  it('stress test', () => {
    // const memoryBefore = process.memoryUsage();
    const index = new FileIndex();
    const root = '/Users/unknown/Experiments/0001/';
    for (let i = 0; i < 2e6; i += 1) {
      const a = `${root}/PASS/${i.toString(16)}.fastq`;
      const b = `${root}/FAIL/${i.toString(16)}.fastq.gz`;
      index.add(a);
      index.add(b);
    }
    // const memoryAfter = process.memoryUsage();

    // const heapUsed = memoryAfter.heapUsed - memoryBefore.heapUsed;
    // const heapTotal = memoryAfter.heapTotal - memoryBefore.heapTotal;

    // console.log({
    //   heapTotal,
    //   heapUsed,
    // });
  }).timeout(20000);
});
