import { grpc } from '@improbable-eng/grpc-web';
import { ProtobufMessage } from '@improbable-eng/grpc-web/dist/typings/message';
import type { Message } from 'google-protobuf';
import { Observable, Observer } from 'rxjs';

const Code = grpc.Code;
grpc.setDefaultTransport(grpc.FetchReadableStreamTransport({ credentials: 'omit' }));

interface RequestConfig {
  grpcUrl: string;
  request: Message;
  service: any;
}

function checkError(
  observer: Observer<Message>,
  code: grpc.Code,
  message: ProtobufMessage | string,
  requestConfig: RequestConfig,
) {
  const { grpcUrl, request, service } = requestConfig;

  if (code !== Code.OK && code !== Code.Aborted) {
    observer.error({
      code,
      code_text: Code[code],
      host: grpcUrl,
      message,
      request,
      service: service.name,
    });
  }
}

function unaryRequest(observer: Observer<Message>, requestConfig: RequestConfig) {
  const { grpcUrl, request, service } = requestConfig;

  return grpc.unary(service, {
    host: grpcUrl,
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

function invokeRequest(observer: Observer<Message>, requestConfig: RequestConfig) {
  const { grpcUrl, request, service } = requestConfig;

  return grpc.invoke(service, {
    host: grpcUrl,
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
  service: any,
  request: TRequest,
  isStream = false,
): Observable<TResponse> {
  const requestConfig = { grpcUrl, service, request };

  return Observable.create((observer: Observer<TRequest>) => {
    if (!grpcUrl) {
      observer.error({
        message: 'No grpc URL provided',
      });

      return;
    }

    const req = isStream ? invokeRequest(observer, requestConfig) : unaryRequest(observer, requestConfig);

    return () => {
      req.close();
      observer.complete();
    };
  });
}
