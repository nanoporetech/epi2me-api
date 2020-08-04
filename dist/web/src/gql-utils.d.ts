import { Logger } from './Logger';
import { ObjectDict } from './ObjectDict';
import { AxiosRequestConfig } from 'axios';
interface SigningOptions {
    apikey?: string;
    apisecret?: string;
}
declare type HeaderOptions = {
    proxy?: string;
    user_agent?: string;
    agent_version?: string;
    log?: Logger;
    signing?: boolean;
    headers?: ObjectDict;
} & SigningOptions;
interface GQLUtility {
    version: string;
    setHeaders(req: AxiosRequestConfig, options: HeaderOptions): void;
}
declare const gqlUtils: GQLUtility;
export default gqlUtils;
