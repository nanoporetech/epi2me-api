import type { Observable } from 'rxjs';
import type { SamplesGetSamplesResponse } from './samples.type';

import { SamplesRequest } from '../../../protos/samples_pb';
import { Samples } from '../../../protos/samples_pb_service';
import { createGrpcRequest$ } from '../utils';
import { ServiceBase } from '../ServiceBase';

export class SampleReaderApi extends ServiceBase {
  getSamples$(path: string): Observable<SamplesGetSamplesResponse> {
    const request = new SamplesRequest();
    request.setPath(path);

    return createGrpcRequest$(this.context, Samples.Samples, request);
  }
}
