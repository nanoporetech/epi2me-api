import EPI2ME from "./epi2me";
import EPI2ME_FS from "./epi2me-fs";
import { Logger } from "./Logger";
import GraphQL from "./graphql";
import REST from "./rest";
import SampleReader from "./sample-reader";
import type { Utility } from "./utils";
import type { UtilityFS } from "./utils-fs";
import REST_FS from "./rest-fs";
import { EPI2ME_OPTIONS } from "./epi2me-options";
import { ObjectDict } from "./ObjectDict";
declare type API_CTOR = {
    new (optstring: EPI2ME_OPTIONS | string): EPI2ME | EPI2ME_FS;
    version: string;
    utils: Utility | UtilityFS;
};
export default class Factory {
    EPI2ME: API_CTOR;
    options: EPI2ME_OPTIONS;
    masterInstance: EPI2ME | EPI2ME_FS;
    log: Logger;
    REST: REST | REST_FS;
    graphQL: GraphQL;
    SampleReader?: SampleReader;
    utils: Utility | UtilityFS;
    version: string;
    runningInstances: ObjectDict;
    constructor(api: API_CTOR, opts: EPI2ME_OPTIONS);
    startRun(options: EPI2ME_OPTIONS, workflowConfig: ObjectDict): Promise<EPI2ME | EPI2ME_FS>;
    startGQLRun(options: EPI2ME_OPTIONS, variables: ObjectDict): Promise<EPI2ME | EPI2ME_FS>;
}
export {};
