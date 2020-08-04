import { AxiosRequestConfig, AxiosResponse } from 'axios';
import { LogMethod } from './Logger';
import { ObjectDict } from './ObjectDict';
export interface Utility {
    version: string;
    headers(request: AxiosRequestConfig, options: UtilityOptions): void;
    head(uri: string, options: UtilityOptions): Promise<AxiosResponse>;
    get(uri: string, options: UtilityOptions): Promise<ObjectDict>;
    post<T = ObjectDict>(uriIn: string, obj: ObjectDict, options: UtilityOptions & {
        handler?: (res: AxiosResponse) => Promise<T>;
    }): Promise<T | ObjectDict>;
    put(uri: string, id: string, obj: ObjectDict, options: UtilityOptions): Promise<ObjectDict>;
    mangleURL(uri: string, options: UtilityOptions): string;
    processLegacyForm(req: AxiosRequestConfig, data: ObjectDict): void;
    convertResponseToObject(data: string | ObjectDict): ObjectDict;
}
export interface UtilityOptions {
    url: string;
    skip_url_mangle?: boolean;
    user_agent?: string;
    agent_version?: string;
    headers?: ObjectDict;
    signing?: boolean;
    proxy?: string;
    apisecret?: string;
    apikey?: string;
    log?: {
        debug: LogMethod;
    };
    legacy_form?: boolean;
}
declare const utils: Utility;
export default utils;
