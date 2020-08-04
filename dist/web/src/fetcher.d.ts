import type { Response, RequestInfo, RequestInit } from 'node-fetch';
interface ApiOptions {
    apikey: string;
    apisecret: string;
}
export declare type Fetch = (uri: RequestInfo, init: RequestInit) => Promise<Response>;
export declare function createCustomFetcher({ apikey, apisecret }: ApiOptions): Fetch;
export {};
