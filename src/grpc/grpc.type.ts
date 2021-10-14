// import type { ServiceDefinition } from '@grpc/grpc-js';
import type { ProtobufMessage } from '@improbable-eng/grpc-web/dist/typings/message';
import type {
  MethodDefinition,
  UnaryMethodDefinition,
  ServiceDefinition,
} from '@improbable-eng/grpc-web/dist/typings/service';

export type Message = ProtobufMessage;
export type Method<Req extends Message = Message, Res extends Message = Message> = MethodDefinition<Req, Res>;
export type UnaryMethod<Req extends Message = Message, Res extends Message = Message> = UnaryMethodDefinition<Req, Res>;
export type Service = ServiceDefinition;
