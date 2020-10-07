import type { ObjectDict } from './ObjectDict';

export interface Sample {
  flowcell: string;
  sample: string;
  path: string;
}

export interface Experiment {
  samples: Sample[];
  startDate: string;
}

export type Experiments = ObjectDict<Experiment>;
