import EPI2ME_FS from "./epi2me-fs";
import type REST_FS from "./rest-fs";
import type GraphQL from "./graphql";
import type { Logger } from "./Logger";
import type { ObjectDict } from "./ObjectDict";
import type SampleReader from "./sample-reader";
import type { UtilityFS } from "./utils-fs";
import type { Index } from "./runtime-typecast";
import type { EPI2ME_OPTIONS } from "./epi2me-options";
export default class Factory {
    private readonly EPI2ME;
    private options;
    private primary;
    private runningInstances;
    constructor(api: typeof EPI2ME_FS, opts?: Partial<EPI2ME_OPTIONS>);
    get utils(): UtilityFS;
    get version(): string;
    get log(): Logger;
    get REST(): REST_FS;
    get graphQL(): GraphQL;
    get SampleReader(): SampleReader;
    reset(options?: Partial<EPI2ME_OPTIONS>): void;
    getRunningInstance(id: Index): EPI2ME_FS | undefined;
    getAllRunningInstances(): EPI2ME_FS[];
    private instantiate;
    startRun(options: Partial<EPI2ME_OPTIONS>, workflowConfig: ObjectDict): Promise<EPI2ME_FS>;
    startGQLRun(options: ObjectDict, variables: {
        idWorkflow: Index;
        computeAccountId: Index;
        storageAccountId?: Index;
        isConsentedHuman?: boolean;
        idDataset?: Index;
        storeResults?: boolean;
        region?: string;
        userDefined?: {
            [componentId: string]: {
                [paramOverride: string]: unknown;
            };
        };
        instanceAttributes?: {
            id_attribute: string;
            value: string;
        }[];
    }): Promise<EPI2ME_FS>;
}
