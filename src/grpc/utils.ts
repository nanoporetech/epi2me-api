import type { RequestContext, ServiceContext, Tokens } from './utils.type';
import type { Message, Method, UnaryMethod } from './grpc.type';

import { grpc } from '@improbable-eng/grpc-web';
import { map, Observable, takeUntil } from 'rxjs';
import { checkError } from './checkError';
import { asDefined } from 'ts-runtime-typecheck';

/**
 * Globally set the default Transport
 * See: https://github.com/improbable-eng/grpc-web/blob/master/client/grpc-web/docs/transport.md
 */
grpc.setDefaultTransport(grpc.FetchReadableStreamTransport({ credentials: 'omit' }));

function getMetadata({ tokens }: { tokens: Tokens }): grpc.Metadata {
  const metadata = new grpc.Metadata();
  metadata.set('jwt', tokens.jwt);
  return metadata;
}

function isUnaryMethod<Req extends Message, Res extends Message>(
  method: Method<Req, Res>,
): method is UnaryMethod<Req, Res> {
  return !(method.requestStream || method.responseStream);
}

// unary RPCs (1 request 1 response)
function unaryRequest$<Req extends Message, Res extends Message>(
  requestConfig: RequestContext<Req, Res, UnaryMethod<Req, Res>>,
): Observable<Res> {
  const {
    request,
    method,
    serviceContext: { host, tokens, transport },
  } = requestConfig;

  return new Observable((observer) => {
    const req = grpc.unary(method, {
      transport,
      host,
      metadata: getMetadata({ tokens }),
      onEnd: ({ status, message }) => {
        if (message) {
          observer.next(message as Res);
        }

        const error = checkError(status, asDefined(message), requestConfig);
        if (error) {
          observer.error(error);
        }
        observer.complete();
      },
      request,
    });

    return req.close.bind(req);
  });
}

// server-side streaming RPCs (1 request N responses)
function invokeRequest$<Req extends Message, Res extends Message>(
  requestConfig: RequestContext<Req, Res>,
): Observable<Res> {
  const {
    request,
    method,
    serviceContext: { host, tokens, transport },
  } = requestConfig;

  return new Observable((observer) => {
    const req = grpc.invoke(method, {
      transport,
      host: host,
      metadata: getMetadata({ tokens }),
      onEnd: (code, message) => {
        const error = checkError(code, message, requestConfig);
        if (error) {
          observer.error(error);
        }
        observer.complete();
      },
      onMessage: (message: Res) => {
        if (message) {
          observer.next(message);
        }
      },
      request,
    });

    return req.close.bind(req);
  });
}

export function createGrpcRequest$<Req extends Message, Res extends Message>(
  serviceContext: ServiceContext,
  method: Method<Req, Res>,
  request: Req,
): Observable<ReturnType<Res['toObject']>> {
  const { host, destroy$ } = serviceContext;

  if (!host) {
    throw new Error('No gRPC URL provided');
  }

  const request$ = isUnaryMethod(method)
    ? unaryRequest$({ request, serviceContext, method })
    : invokeRequest$({ request, serviceContext, method });

  return request$.pipe(
    map((response) => response.toObject() as ReturnType<Res['toObject']>),
    takeUntil(destroy$),
  );
}

export function createServiceContext(
  host: string,
  jwt: string,
  destroy$: Observable<void>,
  transport?: grpc.TransportFactory,
): ServiceContext {
  return {
    host,
    tokens: {
      jwt,
    },
    destroy$,
    transport,
  };
}
