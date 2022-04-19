import type { Client } from './Client.type';
import type { Agent } from 'http';
import type { NodeRequestInit } from './RequestOptions.type';
import { Headers } from './fetch';

export function commonHeaders(init: RequestInit, client: Client): Headers {
  const headers = new Headers();

  headers.set('accept', 'application/json');
  headers.set('content-type', 'application/json');
  headers.set('x-epi2me-client', client.name);
  headers.set('x-epi2me-version', client.version);

  // NOTE can be `string[][] | Record<string, string> | Headers`
  // and we need to handle `Record<string, string>` differently
  if (init.headers) {
    if (Array.isArray(init.headers) || init.headers instanceof Headers) {
      for (const [key, value] of init.headers) {
        headers.set(key, value.toString());
      }
    } else {
      for (const [key, value] of Object.entries(init.headers)) {
        headers.set(key, value.toString());
      }
    }
  }

  return headers;
}

export interface CommonFetchOptions {
  client: Client;
  agent?: Agent;
}

export function commonFetch(uri: string | URL, init: RequestInit, options: CommonFetchOptions): Promise<Response> {
  const { client, agent } = options;
  const headers = commonHeaders(init, client);
  const newInit: NodeRequestInit = { ...init, headers, agent };

  return fetch(uri.toString(), newInit);
}
