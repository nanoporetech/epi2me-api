import type { RequestOptions } from './RequestOptions.type';
import type { Body } from './Body.type';
import type { Dictionary } from 'ts-runtime-typecheck';

export interface NetworkInterface {
  head(uri: string, options: RequestOptions): Promise<Response>;
  get(uri: string, options: RequestOptions): Promise<unknown>;
  put(uri: string, body: Body | Dictionary, options: RequestOptions): Promise<unknown>;
  post(uri: string, body: Body | Dictionary, options: RequestOptions): Promise<unknown>;
}
