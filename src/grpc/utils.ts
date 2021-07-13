import type { ProtobufMessage } from '@improbable-eng/grpc-web/dist/typings/message';
import type { Message } from 'google-protobuf';
import type { Observer } from 'rxjs';
import type { RequestConfig, Tokens } from './utils.type';

import { grpc } from '@improbable-eng/grpc-web';
import { Observable } from 'rxjs';

const Code = grpc.Code;
grpc.setDefaultTransport(grpc.FetchReadableStreamTransport({ credentials: 'omit' }));

function checkError(
  observer: Observer<Message>,
  code: grpc.Code,
  message: ProtobufMessage | string,
  requestConfig: RequestConfig,
): void {
  const { grpcUrl, request, service } = requestConfig;

  if (code !== Code.OK && code !== Code.Aborted) {
    observer.error({
      code,
      code_text: Code[code],
      host: grpcUrl,
      message,
      request,
      service: service.service.serviceName,
      method: service.methodName,
    });
  }
}

function getMetadata({ tokens }: { tokens: Tokens }): grpc.Metadata {
  const metadata = new grpc.Metadata();
  metadata.set('jwt', tokens.jwt);
  return metadata;
}

function unaryRequest(observer: Observer<Message>, requestConfig: RequestConfig): grpc.Request {
  const { grpcUrl, request, service, tokens, transport } = requestConfig;

  return grpc.unary(service, {
    transport,
    host: grpcUrl,
    metadata: getMetadata({ tokens }),
    onEnd: ({ status, message }) => {
      if (message) {
        observer.next(message as Message);
      }

      checkError(observer, status, message as Message, requestConfig);
      observer.complete();
    },
    request,
  });
}

function invokeRequest(observer: Observer<Message>, requestConfig: RequestConfig): grpc.Request {
  const { grpcUrl, request, service, tokens, transport } = requestConfig;

  return grpc.invoke(service, {
    transport,
    host: grpcUrl,
    metadata: getMetadata({ tokens }),
    onEnd: (code, message) => {
      checkError(observer, code, message, requestConfig);
      observer.complete();
    },
    onMessage: (message) => {
      if (message) {
        observer.next(message as Message);
      }
    },
    request,
  });
}

export function createGrpcRequest$<TRequest extends Message, TResponse extends Message>(
  grpcUrl: string,
  tokens: Tokens,
  service: any,
  request: TRequest,
  isStream = false,
  transport?: grpc.TransportFactory,
): Observable<TResponse> {
  const requestConfig = { grpcUrl, tokens, service, request, transport };

  return new Observable((observer: Observer<TResponse>) => {
    if (!grpcUrl) {
      observer.error({
        message: 'No grpc URL provided',
      });
      return;
    }

    const req = isStream
      ? invokeRequest((observer as unknown) as Observer<Message>, requestConfig)
      : unaryRequest((observer as unknown) as Observer<Message>, requestConfig);

    return (): void => {
      req.close();
      observer.complete();
    };
  });
}
