import { grpc } from '@improbable-eng/grpc-web';
import { Observable } from 'rxjs';
export declare class SampleReaderApi {
    private readonly _url;
    private readonly _jwt;
    private readonly _transport?;
    private readonly _destroySubs$;
    constructor(_url: string, _jwt: string, _transport?: grpc.TransportFactory | undefined);
    close(): void;
    getSamples$(): Observable<any>;
}
