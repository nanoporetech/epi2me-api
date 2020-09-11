import { grpc } from '@improbable-eng/grpc-web';
import { Observable } from 'rxjs';
import { AliveReply } from '../../../protos/status_pb';
export declare class StatusApi {
    private readonly _url;
    private readonly _jwt;
    private readonly _transport?;
    private readonly _destroySubs$;
    constructor(_url: string, _jwt: string, _transport?: grpc.TransportFactory | undefined);
    close(): void;
    statusStream$(): Observable<AliveReply.AsObject>;
}
