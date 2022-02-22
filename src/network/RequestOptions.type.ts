/// <reference lib="dom" />

import type { Credentials } from './Credentials.type';
import type { Agent } from 'http';
import type { LogMethod } from '../Logger.type';
import type { Body } from './Body.type';

export interface RequestOptions {
  base_url?: string;
  agent_version?: string;
  method?: 'head' | 'get' | 'put' | 'post';
  headers?: Headers | Record<string, string>;
  encode_method?: 'json' | 'url';
  body?: Body;
  agent?: Agent;
  log?: LogMethod;
  credentials?: Credentials;
  mutate_response?: (response: Response) => Promise<Response>;
  mutate_request?: (request: Request) => Promise<Request>;
}

export interface ExtendedRequestOptions extends RequestOptions {
  method?: 'head' | 'get' | 'put' | 'post';
  body?: Body;
}
