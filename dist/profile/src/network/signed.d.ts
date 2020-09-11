import type { Credentials } from './Credentials';
import type { NetworkInterface } from './NetworkInterface';
export declare function signMessage(headers: Headers, createMessage: (headers: string[]) => string[], { apikey, apisecret }: Credentials, forceUppercaseHeaders?: boolean): void;
export declare function sign(request: Request, credentials: Credentials): Request;
export declare const SignedNetwork: NetworkInterface;
