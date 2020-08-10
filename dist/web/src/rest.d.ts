import { Logger } from './Logger';
import { EPI2ME_OPTIONS } from './epi2me-options';
import { Index } from './runtime-typecast';
import { ObjectDict } from './ObjectDict';
export declare type AsyncCallback = (err: unknown, data: unknown) => void;
export default class REST {
    options: EPI2ME_OPTIONS;
    log: Logger;
    cachedResponses: Map<string, {
        etag: string;
        response: ObjectDict;
    }>;
    constructor(options: EPI2ME_OPTIONS);
    list(entity: string): Promise<unknown[]>;
    read(entity: string, id: string): Promise<ObjectDict>;
    user(): Promise<ObjectDict>;
    status(): Promise<ObjectDict>;
    jwt(): Promise<string>;
    instanceToken(id: unknown, opts: {}): Promise<ObjectDict>;
    installToken(id: unknown): Promise<ObjectDict>;
    attributes(): Promise<unknown>;
    workflows(cb?: (err: unknown, data: unknown) => void): Promise<unknown>;
    amiImages(): Promise<unknown>;
    /**
     * @deprecated
     * Use the more specific updateAmiImage/createAmiImage/readAmiImage calls
     */
    amiImage(first: string | ObjectDict, second?: ObjectDict): Promise<ObjectDict>;
    updateAmiImage(id: string, obj: ObjectDict): Promise<ObjectDict>;
    createAmiImage(obj: ObjectDict): Promise<ObjectDict>;
    readAmiImage(id: string): Promise<ObjectDict>;
    workflow(first: unknown, second: unknown, third: unknown): Promise<unknown>;
    updateWorkflow(id: string, obj: ObjectDict, cb?: Function): Promise<ObjectDict>;
    createWorkflow(obj: ObjectDict, cb?: Function): Promise<ObjectDict>;
    startWorkflow(config: ObjectDict): Promise<ObjectDict>;
    stopWorkflow(idWorkflowInstance: Index): Promise<ObjectDict>;
    workflowInstances(query?: {
        run_id?: string;
    }): Promise<unknown>;
    workflowInstance(id: Index): Promise<ObjectDict>;
    workflowConfig(id: string): Promise<ObjectDict>;
    register(code: string, description: unknown): Promise<ObjectDict>;
    datasets(query?: {
        show?: string;
    } | AsyncCallback): Promise<unknown>;
    dataset(id: string): Promise<unknown>;
    fetchContent(url: string): Promise<ObjectDict>;
}
