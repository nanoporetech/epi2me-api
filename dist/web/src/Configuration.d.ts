import { EPI2ME_OPTIONS } from './epi2me-options';
import { ObjectDict } from './ObjectDict';
import { Index } from './runtime-typecast';
export interface Configuration {
    options: EPI2ME_OPTIONS;
    instance: {
        id_workflow_instance?: Index;
        id_workflow?: Index;
        inputQueueName?: string;
        outputQueueName?: string;
        outputQueueURL?: string;
        discoverQueueCache: ObjectDict;
        bucket?: string;
        user_defined?: ObjectDict;
        start_date?: string;
        id_user?: Index;
        bucketFolder?: string;
        remote_addr?: string;
        region?: string;
        summaryTelemetry?: ObjectDict;
        chain?: ObjectDict;
        key_id?: string;
        awssettings: {
            region: string;
        };
    };
    workflow?: ObjectDict;
}
