import { takeRight } from 'lodash';
import path from 'path';
import rfs from 'recursive-readdir-async';
import DEFAULTS from './default_options.json';
import { Epi2meSampleReaderAPINS, Epi2meSampleReaderResponseNS } from './types';

export default class SampleReader implements Epi2meSampleReaderAPINS.ISampleReaderInstance {
  /*
  Taking a directory, look for MinKNOW results and build a tree of
  experiments and samples

  Designed to work best on device i.e. GridION

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
  experiments = {} as Epi2meSampleReaderResponseNS.IExperiments;

  async getExperiments({
    sourceDir = DEFAULTS.sampleDirectory,
    refresh = false,
  }): Promise<Epi2meSampleReaderResponseNS.IExperiments> {
    if (!Object.keys(this.experiments).length || refresh) {
      await this.updateExperiments(sourceDir);
    }
    return this.experiments;
  }

  async updateExperiments(sourceDir = DEFAULTS.sampleDirectory): Promise<void> {
    const fileToCheck = 'sequencing_summary';
    const files = await rfs.list(sourceDir, { include: [fileToCheck], normalizePath: false });
    this.experiments = {};
    if (files.error) return;
    files.forEach((file: { name: string; path: string; fullname: string; isDirectory: boolean }) => {
      /*
      {
        name: 'sequencing_summary_FAL69641_ad7f83be.txt',
        path: '/data/rehan_07_01_20/VSK002_11_DEGREES/20200107_1441_X5_FAL69641_c67dbc23',
        fullname: '/data/rehan_07_01_20/VSK002_11_DEGREES/20200107_1441_X5_FAL69641_c67dbc23/sequencing_summary_FAL69641_ad7f83be.txt',
        isDirectory: false
      }
      */
      const [experiment, sample] = takeRight(file.path.split(path.sep), 2);
      const parser = /(?<date>[0-9]{8})_(?<time>[0-9]{4})_.*_(?<flowcell>\w+\d+)_\w+/;
      if (!parser.test(sample)) return;
      const { date, time, flowcell } = parser.exec(sample)?.groups as { date: string; time: string; flowcell: string };
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
