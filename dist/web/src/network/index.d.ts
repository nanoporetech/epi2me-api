import type { ExtendedRequestOptions } from './RequestOptions';
import type { NetworkInterface } from './NetworkInterface';
export declare function stubFetch(replacement: (info: RequestInfo, init?: RequestInit) => Promise<Response>): () => void;
export declare function writeCommonHeaders(options?: ExtendedRequestOptions): Headers;
export declare const Network: NetworkInterface;
