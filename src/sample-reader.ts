import type { Experiment, Experiments } from './sample.type';

import { fdir } from 'fdir';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { asString, Dictionary } from 'ts-runtime-typecheck';

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
  const fileToCheck = 'fastq_pass'; // Actually a dir now
  // TODO refactor this to use fs-inspect to reduce our dependencies
  const crawler = new fdir()
    .withBasePath()
    .withErrors()
    .withDirs()
    .filter((path: string) => !path.includes(fileToCheck))
    .exclude((path: string) => path.includes('fastq_'))
    .withMaxDepth(3)
    .crawl(sourceDir);

  const experiments: Dictionary<Experiment> = {};

  let files;
  try {
    files = (await crawler.withPromise()) as string[];
  } catch {
    // TODO this doesn't really feel like the correct behaviour
    // should we check for ENOENT here perhaps?
    return experiments;
  }

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
    const existing = experiments[experiment];

    if (existing) {
      // WARN the old version used to update existing entries with a new start date
      // this behavior has been preserved, but is it correct?
      existing.startDate = startDateString;
      existing.samples.push(newSample);
    } else {
      experiments[experiment] = {
        startDate: startDateString,
        samples: [newSample],
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
    const raw = await fs.readFile(location, 'utf-8');
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
    const users = await fs.readFile('/etc/passwd', 'utf-8');
    return /^(minit|grid|prom)/im.test(users);
  } catch {
    return false;
  }
}
