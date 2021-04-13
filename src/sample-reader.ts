import { fdir } from 'fdir';
import path from 'path';
import DEFAULTS from './default_options.json';
import type { Experiments } from './sample.type';

export class SampleReader {
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
  experiments: Experiments = {};

  async getExperiments({ sourceDir = DEFAULTS.sampleDirectory, refresh = false }): Promise<Experiments> {
    if (!Object.keys(this.experiments).length || refresh) {
      await this.updateExperiments(sourceDir);
    }
    return this.experiments;
  }
  async updateExperiments(sourceDir = DEFAULTS.sampleDirectory): Promise<void> {
    const fileToCheck = 'fastq_pass'; // Actually a dir now
    const crawler = new fdir()
      .withBasePath()
      .withErrors()
      .withDirs()
      .filter((path: string) => !path.includes(fileToCheck))
      .exclude((path: string) => path.includes('fastq_'))
      .withMaxDepth(3)
      .crawl(sourceDir);

    let files;
    try {
      files = (await crawler.withPromise()) as string[];
    } catch {
      // TODO this doesn't really feel like the correct behaviour
      // should we check for ENOENT here perhaps?
      return;
    }

    this.experiments = {};

    for (const absPath of files) {
      const [experiment, sample] = absPath.split(path.sep).slice(-2);
      const parser = /(?<date>[0-9]{8})_(?<time>[0-9]{4})_.*_(?<flowcell>\w+\d+)_\w+/;
      if (!experiment || !sample || !parser.test(sample)) {
        continue;
      }
      const { date, time, flowcell } = parser.exec(sample)?.groups as { date: string; time: string; flowcell: string };
      const dateString = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
      const timeString = `T${time.slice(0, 2)}:${time.slice(2, 4)}:00`;
      const startDate = new Date(dateString + timeString);

      const newSample = { sample, flowcell, path: path.join(absPath, 'fastq_pass') };
      const startDateString = `${startDate.toDateString()} ${startDate.toLocaleTimeString()}`;
      const existing = this.experiments[experiment];

      if (existing) {
        // WARN the old version used to update existing entries with a new start date
        // this behavior has been preserved, but is it correct?
        existing.startDate = startDateString;
        existing.samples.push(newSample);
      } else {
        this.experiments[experiment] = {
          startDate: startDateString,
          samples: [newSample],
        };
      }
    }
  }
}
