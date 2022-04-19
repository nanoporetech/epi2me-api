/// <reference lib="dom" />

/*
  WARN signed network relies on the node crypto library, and hence cannot be used in the web export.

  If we need it we could potentially replace the signing behavior with web crypto, but it's problematic
  to test.
*/

import { isUndefined } from 'ts-runtime-typecheck';
import crypto from 'crypto';
import { fetch } from './fetch';
import type { Agent } from 'http';
import type { NodeRequestInit } from './RequestOptions.type';
import type { Credentials } from './Credentials.type';
import type { Client } from './Client.type';
import { commonHeaders } from './common';

export interface SignedFetchOptions {
  client: Client;
  credentials?: Credentials;
  agent?: Agent;
}

export function signMessage(init: RequestInit, client: Client, credentials?: Credentials): Headers {
  const headers = commonHeaders(init, client);

  if (isUndefined(credentials)) {
    return headers;
  }

  headers.set('x-epi2me-apikey', credentials.apikey);
  headers.set('x-epi2me-signaturedate', new Date().toISOString());

  const message = [...headers]
    .filter(([key]) => key.startsWith('x-epi2me'))
    .sort()
    .map(([key, value]) => `${key.toUpperCase()}:${value}`);

  message.push(init.body?.toString() ?? '');

  const digest = crypto.createHmac('sha1', credentials.apisecret).update(message.join('\n')).digest('hex');
  headers.set('x-epi2me-signaturev0', digest);

  return headers;
}

export function signedFetch(uri: string | URL, init: RequestInit, options: SignedFetchOptions): Promise<Response> {
  const { client, credentials, agent } = options;
  const headers = signMessage(init, client, credentials);
  const newInit: NodeRequestInit = { ...init, headers, agent };

  return fetch(uri.toString(), newInit);
}
