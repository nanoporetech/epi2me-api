import type { grpc } from '@improbable-eng/grpc-web';
import type { Message } from 'google-protobuf';

export interface Tokens {
  jwt: string;
}

export type TransportFactory = grpc.TransportFactory;
export type { Message };
export interface RequestConfig {
  grpcUrl: string;
  tokens: Tokens;
  request: Message;
  service: any;
  // Transport can be optionally passed in to support running on node
  // Default is the browser compatible FetchReadableStreamTransport
  transport?: grpc.TransportFactory;
}
