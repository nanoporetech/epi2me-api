import type { RequestOptions } from './RequestOptions';
import type { Body } from './Body';

export interface NetworkInterface {
  get(uri: string, options: RequestOptions): Promise<unknown>;
  head(uri: string, options: RequestOptions): Promise<unknown>;
  put(uri: string, body: Body, options: RequestOptions): Promise<unknown>;
  post(uri: string, body: Body, options: RequestOptions): Promise<unknown>;
}
