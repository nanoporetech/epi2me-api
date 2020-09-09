import EPI2ME_FS from './epi2me-fs';
import { BehaviorSubject } from 'rxjs';
import { Map as ImmutableMap } from 'immutable';
import type REST_FS from './rest-fs';
import type GraphQL from './graphql';
import type { Logger } from './Logger';
import type { ObjectDict } from './ObjectDict';
import type SampleReader from './sample-reader';
import type { UtilityFS } from './utils-fs';
import type { Index } from './runtime-typecast';
import type { EPI2ME_OPTIONS } from './epi2me-options';
export interface InstanceAttribute {
    id_attribute: Index;
    value: string;
}
export interface GQLWorkflowConfig {
    idWorkflow: Index;
    computeAccountId: Index;
    storageAccountId?: Index;
    isConsentedHuman?: boolean;
    idDataset?: Index;
    storeResults?: boolean;
    region?: string;
    userDefined?: ObjectDict<ObjectDict>;
    instanceAttributes?: InstanceAttribute[];
}
export default class Factory {
    private readonly EPI2ME;
    private options;
    private primary;
    readonly runningInstances$: BehaviorSubject<ImmutableMap<Index, EPI2ME_FS>>;
    private readonly addRunningInstance$;
    private readonly removeRunningInstanceById$;
    constructor(api: typeof EPI2ME_FS, opts?: Partial<EPI2ME_OPTIONS>);
    get utils(): UtilityFS;
    get version(): string;
    get log(): Logger;
    get REST(): REST_FS;
    get graphQL(): GraphQL;
    get sampleReader(): SampleReader;
    reset(options?: Partial<EPI2ME_OPTIONS>): void;
    getRunningInstance(id: Index): EPI2ME_FS | undefined;
    private instantiate;
    startRun(options: Partial<EPI2ME_OPTIONS>, workflowConfig: {
        id_workflow: string;
        is_consented_human: 0 | 1;
        user_defined: unknown;
        instance_attributes: unknown;
        compute_account?: string;
        storage_account?: string;
        store_results?: boolean;
    }): Promise<EPI2ME_FS>;
    /**
     * @param {Object<string, any>} options
     * @param {GQLRunVariables} variables { userDefined: { [componentID]: { [paramOverride]: any } } }
     */
    startGQLRun(options: ObjectDict, variables: GQLWorkflowConfig): Promise<EPI2ME_FS>;
}
