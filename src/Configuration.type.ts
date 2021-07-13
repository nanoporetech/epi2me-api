import type { Index, Dictionary } from 'ts-runtime-typecheck';
import type { EPI2ME_OPTIONS } from './epi2me-options.type';

export interface Configuration {
  options: EPI2ME_OPTIONS;
  instance: {
    id_workflow_instance?: Index;
    id_workflow?: Index;
    inputQueueName?: string;
    outputQueueName?: string;
    outputQueueURL?: string;
    discoverQueueCache: Dictionary;
    bucket?: string;
    start_date?: string;
    id_user?: Index;
    bucketFolder?: string;
    remote_addr?: string;
    region?: string;
    summaryTelemetry?: Dictionary;
    telemetryNames?: Dictionary<Dictionary<string>>;
    chain?: Dictionary;
    key_id?: string;
    awssettings: {
      region: string;
    };
  };
  workflow?: Dictionary;
}
