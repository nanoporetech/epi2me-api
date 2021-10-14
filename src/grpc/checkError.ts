import { grpc } from '@improbable-eng/grpc-web';
import type { ProtobufMessage } from '@improbable-eng/grpc-web/dist/typings/message';
import type { RequestContext } from './utils.type';

type StatusCode = grpc.Code;
const { OK: STATUS_OK, Aborted: STATUS_ABORTED } = grpc.Code;

export interface RequestFailure {
  code: StatusCode;
  code_text: string;
  host: string;
  message: ProtobufMessage | string;
  request: ProtobufMessage;
  service: string;
  method: string;
}

export function checkError(
  code: StatusCode,
  message: ProtobufMessage | string,
  requestConfig: RequestContext,
): RequestFailure | null {
  const {
    serviceContext: { host },
    method,
    request,
  } = requestConfig;

  if (code !== STATUS_OK && code !== STATUS_ABORTED) {
    return {
      code,
      code_text: grpc.Code[code],
      host,
      message,
      request,
      service: method.service.serviceName,
      method: method.methodName,
    };
  }
  return null;
}
