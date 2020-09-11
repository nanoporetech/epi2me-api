import type { RequestOptions } from './RequestOptions';
import type { Body } from './Body';
import type { ObjectDict } from '../ObjectDict';

export interface NetworkInterface {
  head(uri: string, options: RequestOptions): Promise<Response>;
  get(uri: string, options: RequestOptions): Promise<unknown>;
  put(uri: string, body: Body | ObjectDict, options: RequestOptions): Promise<unknown>;
  post(uri: string, body: Body | ObjectDict, options: RequestOptions): Promise<unknown>;
}
