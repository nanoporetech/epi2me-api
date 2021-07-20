import type { Index, Dictionary, UnknownFunction } from 'ts-runtime-typecheck';
import type { CoreOptions } from './CoreOptions.type';
import type { Duration } from './Duration';

export interface Configuration {
  options: CoreOptions & {
    endpoint?: string;
    region: string;
    sessionGrace: Duration;
    uploadTimeout: Duration;
    uploadRetries: number;
    downloadTimeout: Duration;
    fileCheckInterval: Duration;
    downloadCheckInterval: Duration;
    stateCheckInterval: Duration;
    inFlightDelay: Duration;
    waitTimeSeconds: Duration;
    debounceWindow: Duration;
    useGraphQL: boolean;
    waitTokenError: number;
    transferPoolSize: number;
    downloadMode: 'data' | 'telemetry' | 'none' | 'data+telemetry';
    filetype: string[];
    sampleDirectory: string;

    // optional values
    id_workflow_instance?: Index;
    id_dataset?: Index;
    proxy?: string;

    // EPI2ME-FS options
    inputFolder?: string;
    inputFolders: string[];
    outputFolder?: string;
    awsAcceleration?: string;
    agent_address?: string;
    telemetryCb?: UnknownFunction;
    dataCb?: UnknownFunction;
    remoteShutdownCb?: UnknownFunction;
  };
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
