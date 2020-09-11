import { grpc } from '@improbable-eng/grpc-web';
import { Subject, Observable } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';
import { ExperimentMap, SamplesRequest } from '../../../protos/samples_pb';
import { Samples } from '../../../protos/samples_pb_service';
import { createGrpcRequest$ } from '../utils';

export class SampleReaderApi {
  private readonly _destroySubs$ = new Subject();

  constructor(
    private readonly _url: string,
    private readonly _jwt: string,
    private readonly _transport?: grpc.TransportFactory,
  ) {}

  public close(): void {
    this._destroySubs$.next();
  }

  public getSamples$(path: string): Observable<ExperimentMap.AsObject> {
    const request = new SamplesRequest();
    request.setPath(path);

    return createGrpcRequest$<SamplesRequest, ExperimentMap>(
      this._url,
      { jwt: this._jwt },
      Samples.Samples,
      request,
      true,
      this._transport,
    ).pipe(
      map((response) => response.toObject()),
      takeUntil(this._destroySubs$),
    );
  }
}
