import type { Observable } from 'rxjs';
import type { StatusStatusStreamResponse } from './status.type';

import { Empty } from 'google-protobuf/google/protobuf/empty_pb';
import { Status } from '../../../protos/status_pb_service';
import { createGrpcRequest$ } from '../utils';
import { ServiceBase } from '../ServiceBase';

export class StatusApi extends ServiceBase {
  statusStream$(): Observable<StatusStatusStreamResponse> {
    const request = new Empty();

    return createGrpcRequest$(this.context, Status.AliveStream, request);
  }
}
