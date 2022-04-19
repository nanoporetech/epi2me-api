import type { Experiment, Experiments } from './sample.type';

import fs from 'fs';
import path from 'path';
import os from 'os';
import { asDefined, asString, Dictionary } from 'ts-runtime-typecheck';
import { createInspector } from 'fs-inspect';

/**
 * @deprecated Use `getExperiments` instead
 */
export class SampleReader {
  experiments: Experiments = {};

  /**
   * @deprecated Use exported `getExperiments` function instead
   */
  async getExperiments({ sourceDir, refresh }: { sourceDir?: string; refresh?: boolean }): Promise<Experiments> {
    if (Object.keys(this.experiments).length === 0 || refresh) {
      await this.updateExperiments(sourceDir);
    }
    return this.experiments;
  }
  /**
   * @deprecated Use exported `getExperiments` function instead
   */
  async updateExperiments(sourceDir?: string): Promise<void> {
    this.experiments = await getExperiments(sourceDir);
  }
}

const samplePattern = /(?<date>[0-9]{8})_(?<time>[0-9]{4})_.*_(?<flowcell>\w+\d+)_\w+/;

const sampleInspector = createInspector({
  includeFolders: true,
  maxDepth: 3,
  filter: (info) => info.isDirectory && samplePattern.test(info.base),
  map: (info) => {
    const { date, time, flowcell } = asDefined(samplePattern.exec(info.base)).groups ?? {};

    const startDate = parseDate(date, time);
    const sample = info.base;
    const experiment = path.basename(path.dirname(info.relative));

    return {
      sample,
      flowcell,
      path: path.join(info.absolute, 'fastq_pass'),
      failed: path.join(info.absolute, 'fastq_fail'),
      experiment,
      startDate,
    };
  },
});

/**
 * @param date YYYYMMDD
 * @param time HHMM
 */
function parseDate(date: string, time: string): Date {
  const years = +date.slice(0, 4),
    months = +date.slice(4, 6),
    days = +date.slice(6, 8);
  const hours = +time.slice(0, 2),
    minutes = +time.slice(2, 4);

  // NOTE the 2nd parameter is a monthIndex, starting at 0
  return new Date(years, months - 1, days, hours, minutes);
}

/*
  Taking a directory, look for MinKNOW results and build a tree of
  experiments and samples

  Designed to work best on device i.e. GridION

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
export async function getExperiments(sourceDir?: string): Promise<Dictionary<Experiment>> {
  if (!sourceDir) {
    sourceDir = await getSampleDirectory();
  }

  const experiments: Dictionary<Experiment> = {};
  let samples;
  try {
    samples = await sampleInspector.search(sourceDir);
  } catch (err) {
    return experiments;
  }

  for (const sample of samples) {
    const existing = experiments[sample.experiment];
    const { startDate, experiment } = sample;

    const startDateString = `${startDate.toDateString()} ${startDate.toLocaleTimeString()}`;

    if (existing) {
      // WARN the old version used to update existing entries with a new start date
      // this behavior has been preserved, but is it correct?
      existing.startDate = startDateString;
      existing.samples.push(sample);
    } else {
      experiments[experiment] = {
        startDate: startDateString,
        samples: [sample],
      };
    }
  }

  return experiments;
}

const MKW_CFG_LOCATIONS = {
  windows: 'C:\\ProgramFiles\\OxfordNanopore\\MinKNOW\\conf\\user_conf',
  mac: '/Applications/MinKNOW.app/Contents/Resources/conf/user_conf',
  linux: '/opt/ONT/MinKNOW/conf/user_conf',
};

const MKW_OUTPUT_LOCATIONS = {
  windows: 'C:\\data',
  mac: '/Library/MinKNOW/data',
  linux: '/var/lib/minknow/data',
};

const PRIMARY_OUTPUT_LOCATION = '/data';

export async function getSampleDirectory(): Promise<string> {
  switch (os.platform()) {
    case 'win32':
      return (await getOutputDirectoryConfig(MKW_CFG_LOCATIONS.windows)) ?? MKW_OUTPUT_LOCATIONS.windows;
    case 'darwin':
      return (await getOutputDirectoryConfig(MKW_CFG_LOCATIONS.mac)) ?? MKW_OUTPUT_LOCATIONS.mac;
    case 'linux':
    default: {
      // ONT devices store the output in /data
      if (await isONTDevice()) {
        return PRIMARY_OUTPUT_LOCATION;
      }
      // fallback to minknow location
      return (await getOutputDirectoryConfig(MKW_CFG_LOCATIONS.linux)) ?? MKW_OUTPUT_LOCATIONS.linux;
    }
  }
}

export async function getOutputDirectoryConfig(location: string): Promise<string | null> {
  try {
    const raw = await fs.promises.readFile(location, 'utf-8');
    const j = JSON.parse(raw);
    return asString(j.user.output_dirs.base.value0);
  } catch {
    return null;
  }
}

const ONT_DEVICE_TYPES = new Set(['minit', 'gridion', 'promethion']);

export async function isONTDevice(): Promise<boolean> {
  const device = process.env.DEVICE_TYPE;

  if (device && ONT_DEVICE_TYPES.has(device)) {
    return true;
  }

  try {
    const users = await fs.promises.readFile('/etc/passwd', 'utf-8');
    return /^(minit|grid|prom)/im.test(users);
  } catch {
    return false;
  }
}
