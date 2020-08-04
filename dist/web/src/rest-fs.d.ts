import REST, { AsyncCallback } from './rest';
import { ObjectDict } from './ObjectDict';
export default class REST_FS extends REST {
    workflows(cb?: AsyncCallback): Promise<unknown>;
    workflow(id: unknown, obj: unknown, cb?: AsyncCallback): Promise<unknown>;
    workflowInstances(first?: ObjectDict | AsyncCallback, second?: ObjectDict): Promise<unknown>;
    datasets(first: {
        show?: string;
    } | AsyncCallback, second?: {
        show?: string;
    }): Promise<unknown>;
    bundleWorkflow(idWorkflow: string, filepath: string, progressCb: (e: unknown) => void): Promise<unknown>;
}
