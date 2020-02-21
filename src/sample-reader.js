import { takeRight } from 'lodash';
import path from 'path';
import rfs from 'recursive-readdir-async';
import DEFAULTS from './default_options.json';

export default class SampleReader {
  /*
  Taking a directory, look for MinKNOW results and build a tree of
  experiments and samples

  Designed to work best on device i.e. GridION
  */
  constructor() {
    /*
      opts = {
        path: Path to MinKnow output = '/data'
      }
      experiments = {
        expName: {
          samples: [{
            flowcellId: string
            sample: string
          }]
          startDate
        }
      }
    */
    this.experiments = {};
  }

  async getExperiments({ sourceDir = DEFAULTS.sampleDirectory, refresh = false }) {
    if (!Object.keys(this.experiments).length || refresh) {
      await this.updateExperiments(sourceDir);
    }
    return this.experiments;
  }

  async updateExperiments(sourceDir = DEFAULTS.sampleDirectory) {
    const fileToCheck = 'sequencing_summary';
    const files = await rfs.list(sourceDir, { include: [fileToCheck] });
    this.experiments = {};
    files.forEach(file => {
      /*
      {
        name: 'sequencing_summary_FAL69641_ad7f83be.txt',
        path: '/data/rehan_07_01_20/VSK002_11_DEGREES/20200107_1441_X5_FAL69641_c67dbc23',
        fullname: '/data/rehan_07_01_20/VSK002_11_DEGREES/20200107_1441_X5_FAL69641_c67dbc23/sequencing_summary_FAL69641_ad7f83be.txt',
        isDirectory: false
      }
      */
      const [experiment, sample] = takeRight(file.path.split(path.sep), 2);
      const splitSample = sample.split('_');
      const flowcell = takeRight(splitSample, 2)[0];
      const [date, time] = splitSample.slice(0, 2);
      const dateString = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
      const timeString = `T${time.slice(0, 2)}:${time.slice(2, 4)}:00`;
      const startDate = new Date(dateString + timeString);
      this.experiments[experiment] = {
        startDate: `${startDate.toDateString()} ${startDate.toLocaleTimeString()}`,
        samples: [
          ...(this.experiments[experiment] ? this.experiments[experiment].samples : []),
          { sample, flowcell, path: `${file.path}/fastq_pass` },
        ],
      };
    });
  }
}
