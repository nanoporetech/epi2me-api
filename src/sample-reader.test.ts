// import { mockFS, MockResult } from './mock-fs';
import { getExperiments } from './sample-reader';
import path from 'path';

import MOCK_DATASET from './sample-reader.test.json';
import { isNullish } from 'ts-runtime-typecheck';
import type { NodeError } from './NodeError';

interface Directory {
  [key: string]: Directory | string;
}

const vfs = Object.fromEntries(
  MOCK_DATASET.map(({ files, experiment }) => [experiment, files]),
) as unknown as Directory;

jest.mock('fs', () => {
  function resolve(dir: Directory, parts: string[]): Directory | string {
    const next = parts.shift();
    if (isNullish(next)) {
      return dir;
    }
    if (next in dir) {
      const entry = dir[next];
      if (parts.length === 0) {
        return entry;
      }
      if (typeof entry === 'string') {
        const err: NodeError = new Error(`ENOTDIR: not a directory '${next}'`);
        err.code = 'ENOTDIR';
        throw err;
      }
      return resolve(entry, parts);
    }
    const err: NodeError = new Error(`ENOENT: no such file or directory '${next}'`);
    err.code = 'ENOENT';
    throw err;
  }

  return {
    promises: {
      async stat(location: string) {
        const entry = resolve(
          vfs,
          location.startsWith(path.sep) ? location.slice(1).split(path.sep) : location.split(path.sep),
        );

        const isDirectory = typeof entry === 'object';

        return {
          isDirectory: () => isDirectory,
          size: 0,
          birthtimeMs: 0,
          mtimeMs: 0,
        };
      },
      async readdir(location: string) {
        const entry = resolve(
          vfs,
          location.startsWith(path.sep) ? location.slice(1).split(path.sep) : location.split(path.sep),
        );

        if (typeof entry !== 'object') {
          const err: NodeError = new Error(`ENOTDIR: not a directory '${path.basename(location)}'`);
          err.code = 'ENOTDIR';
          throw err;
        }

        return [...Object.keys(entry)];
      },
    },
  };
});

describe('sample reader', () => {
  describe('mock dataset', () => {
    for (const { samples, experiment: experimentName } of MOCK_DATASET) {
      it(experimentName, async () => {
        if (samples.length === 0) {
          expect(await getExperiments(`${path.sep}${experimentName}`)).toEqual({});
        } else {
          const sampleName = samples[0].path.split('/')[1];
          const experiment = {
            samples: samples.map((sample) => {
              return expect.objectContaining({
                ...sample,
                path: `${path.sep}${experimentName}${path.sep}${sample.path}`,
              });
            }),
          };

          expect(await getExperiments(`${path.sep}${experimentName}`)).toEqual({
            [sampleName]: expect.objectContaining(experiment),
          });
        }
      });
    }
  });
});
