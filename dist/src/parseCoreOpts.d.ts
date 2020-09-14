import { ObjectDict } from './ObjectDict';
import { EPI2ME_OPTIONS } from './epi2me-options';
import { Logger } from './Logger';
export declare function parseCoreOpts(opt: ObjectDict | Partial<EPI2ME_OPTIONS>): {
    url: string;
    apikey?: string;
    apisecret?: string;
    agent_version: string;
    jwt?: string;
    local: boolean;
    log: Logger;
    user_agent: string;
    signing: boolean;
};
