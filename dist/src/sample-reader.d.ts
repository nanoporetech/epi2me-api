import { ObjectDict } from './ObjectDict';
export interface Sample {
    flowcell: string;
    sample: string;
    path: string;
}
export interface Experiment {
    samples: Sample[];
    startDate: string;
}
export declare type Experiments = ObjectDict<Experiment>;
export default class SampleReader {
    experiments: Experiments;
    getExperiments({ sourceDir, refresh }: {
        sourceDir?: string | undefined;
        refresh?: boolean | undefined;
    }): Promise<Experiments>;
    updateExperiments(sourceDir?: string): Promise<void>;
}
