import type { Dictionary } from 'ts-runtime-typecheck';

export interface Sample {
  flowcell: string;
  sample: string;
  path: string;
  startDate: Date;
}

export interface Experiment {
  samples: Sample[];
  startDate: string;
}

export type Experiments = Dictionary<Experiment>;
