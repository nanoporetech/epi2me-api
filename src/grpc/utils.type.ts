import type { grpc } from '@improbable-eng/grpc-web';
import type { Observable } from 'rxjs';
import type { Message, Method } from './grpc.type';

export interface Tokens {
  jwt: string;
}

export interface ServiceContext {
  host: string;
  tokens: Tokens;
  destroy$: Observable<void>;
  // Transport can be optionally passed in to support running on node
  // Default is the browser compatible FetchReadableStreamTransport
  transport?: grpc.TransportFactory;
}

export interface RequestContext<
  Req extends Message = Message,
  Res extends Message = Message,
  Meth extends Method = Method<Req, Res>,
> {
  method: Meth;
  request: Req;
  serviceContext: ServiceContext;
}
