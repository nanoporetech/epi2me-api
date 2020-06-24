import assert from 'assert';
import mock from 'mock-fs';
import SampleReader from '../../src/sample-reader';

describe('sample reader', () => {
  describe('constructor', () => {
    it('should set options', () => {
      const SR = new SampleReader();
      assert.deepEqual(SR.experiments, {});
    });
  });
  describe('should', () => {
    before(() => {
      mock({
        '/data/': {},
      });
    });

    after(() => {
      mock.restore();
    });
    //  Fails in new version, but works in real use
    it('fail nicely', async () => {
      const path = '/randompath';
      const SR = new SampleReader();
      const runs = await SR.getExperiments(path);
      assert.deepEqual(runs, {});
    });
  });
  describe('getRuns', () => {
    before(() => {
      mock({
        '/data/rehan_07_01_20/VSK002_11_DEGREES/': {
          '20200107_1441_X5_FAL69641_c67dbc23': {
            'sequencing_summary_FAL69641_ad7f83be.txt': 'file content here',
          },
          '20200107_1441_X5_FAL69641_c67dbc24': {
            'sequencing_summary_FAL69641_ad7f83be.txt': 'file content here',
          },
          bad: {
            'sequencing_summary_FAL69621_ad7f83bg.txt': 'file content here',
          },
        },
      });
    });

    after(() => {
      mock.restore();
    });

    it('should set get all run options', async () => {
      const path = '/data';
      const SR = new SampleReader();
      const runs = await SR.getExperiments(path);
      const startDate = new Date('2020-01-07 14:41:00');
      assert.deepEqual(runs, {
        VSK002_11_DEGREES: {
          samples: [
            {
              flowcell: 'FAL69641',
              sample: '20200107_1441_X5_FAL69641_c67dbc23',
              path: '/data/rehan_07_01_20/VSK002_11_DEGREES/20200107_1441_X5_FAL69641_c67dbc23/fastq_pass',
            },
            {
              flowcell: 'FAL69641',
              sample: '20200107_1441_X5_FAL69641_c67dbc24',
              path: '/data/rehan_07_01_20/VSK002_11_DEGREES/20200107_1441_X5_FAL69641_c67dbc24/fastq_pass',
            },
          ],
          startDate: `${startDate.toDateString()} ${startDate.toLocaleTimeString()}`,
        },
      });
    });
  });
});
