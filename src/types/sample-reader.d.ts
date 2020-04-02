export namespace Epi2meSampleReaderAPINS {
  export interface ISampleReaderOptions {
    path?: string;
  }

  export type ISampleReaderConstructor = new (options?: ISampleReaderOptions) => ISampleReaderInstance;

  export interface ISampleReaderInstance {
    getExperiments(args: GetExperimentsOpts): Promise<Epi2meSampleReaderResponseNS.IExperiments>;
    updateExperiments(sourceDir: string): Promise<void>;
    experiments: Epi2meSampleReaderResponseNS.IExperiments;
  }

  interface GetExperimentsOpts {
    sourceDir: string;
    refresh?: boolean;
  }
}

export namespace Epi2meSampleReaderResponseNS {
  export interface ISample {
    flowcell: string;
    sample: string;
    path: string;
  }

  export interface IExperiment {
    samples: ISample[];
    startDate: string;
  }

  export interface IExperiments {
    [experimentName: string]: IExperiment;
  }
}

export default class SampleReader implements Epi2meSampleReaderAPINS.ISampleReaderInstance {
  experiments: Epi2meSampleReaderResponseNS.IExperiments;
  getExperiments({
    sourceDir,
    refresh,
  }: {
    sourceDir?: string | undefined;
    refresh?: boolean | undefined;
  }): Promise<Epi2meSampleReaderResponseNS.IExperiments>;
  updateExperiments(sourceDir?: string): Promise<void>;
}
