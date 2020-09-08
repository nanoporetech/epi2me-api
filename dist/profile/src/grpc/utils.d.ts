import type { Message } from 'google-protobuf';
import { Observable } from 'rxjs';
interface Tokens {
    jwt: string;
}
export declare function createGrpcRequest$<TRequest extends Message, TResponse extends Message>(grpcUrl: string, tokens: Tokens, service: any, request: TRequest, isStream?: boolean): Observable<TResponse>;
export {};
