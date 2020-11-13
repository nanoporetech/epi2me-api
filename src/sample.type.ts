import type { Dictionary } from 'ts-runtime-typecheck';

export interface Sample {
  flowcell: string;
  sample: string;
  path: string;
}

export interface Experiment {
  samples: Sample[];
  startDate: string;
}

export type Experiments = Dictionary<Experiment>;
