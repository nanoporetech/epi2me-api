import type { grpc } from '@improbable-eng/grpc-web';
import type { AliveReply } from '../../../protos/status_pb';
import type { Observable } from 'rxjs';

import { Empty } from 'google-protobuf/google/protobuf/empty_pb';
import { Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { Status } from '../../../protos/status_pb_service';
import { createGrpcRequest$ } from '../utils';

export class StatusApi {
  private readonly _destroySubs$ = new Subject();

  constructor(
    private readonly _url: string,
    private readonly _jwt: string,
    private readonly _transport?: grpc.TransportFactory,
  ) {}

  public close(): void {
    this._destroySubs$.next();
  }

  public statusStream$(): Observable<AliveReply.AsObject> {
    const request = new Empty();

    return createGrpcRequest$<Empty, AliveReply>(
      this._url,
      { jwt: this._jwt },
      Status.AliveStream,
      request,
      true,
      this._transport,
    ).pipe(
      map((response) => response.toObject()),
      takeUntil(this._destroySubs$),
    );
  }
}
