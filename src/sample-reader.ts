import fdir from 'fdir';
import { takeRight } from 'lodash';
import path from 'path';
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
    const files = (await fdir.async(sourceDir, {
      // maxDepth: 4, // currently broken v2.1.0
      // isExcludedDir: path => path.includes('fastq'),
      searchFn: path => path.includes(fileToCheck),
      ignoreErrors: true,
    })) as string[]; // next release will fix typedefs

    this.experiments = files.reduce((experimentsObj, absPath) => {
      const [experiment, sample] = takeRight(absPath.split(path.sep), 3);
      const parser = /(?<date>[0-9]{8})_(?<time>[0-9]{4})_.*_(?<flowcell>\w+\d+)_\w+/;
      if (!parser.test(sample)) return experimentsObj;
      const { date, time, flowcell } = parser.exec(sample)?.groups as { date: string; time: string; flowcell: string };
      const dateString = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
      const timeString = `T${time.slice(0, 2)}:${time.slice(2, 4)}:00`;
      const startDate = new Date(dateString + timeString);
      experimentsObj[experiment] = {
        startDate: `${startDate.toDateString()} ${startDate.toLocaleTimeString()}`,
        samples: [
          ...(experimentsObj[experiment] ? experimentsObj[experiment].samples : []),
          { sample, flowcell, path: `${path.dirname(absPath)}/fastq_pass` },
        ],
      };
      return experimentsObj;
    }, {} as Epi2meSampleReaderResponseNS.IExperiments);
  }
}
