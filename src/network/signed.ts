/*
  WARN signed network relies on the node crypto library, and hence cannot be used in the web export.

  If we need it we could potentially replace the signing behavior with web crypto, but it's problematic
  to test.
*/
import { Network } from './index';
import crypto from 'crypto';

import type { RequestOptions } from './RequestOptions';
import type { Body } from './Body';
import type { Credentials } from './Credentials';
import type { NetworkInterface } from './NetworkInterface';

export function signMessage(
  headers: Headers,
  createMessage: (headers: string[]) => string[],
  { apikey, apisecret }: Credentials,
  forceUppercaseHeaders = false,
): void {
  headers.set('X-EPI2ME-ApiKey', apikey);
  headers.set('X-EPI2ME-SignatureDate', new Date().toISOString());

  const keys = Array.from(headers.keys())
    .sort()
    .filter((o) => o.match(/^x-epi2me/i));

  // Case matters. Uppercase for gql. Else for portal.
  const message = createMessage(
    keys.map((key) => `${forceUppercaseHeaders ? key.toUpperCase() : key}:${headers.get(key)}`),
  ).join('\n');

  const digest = crypto.createHmac('sha1', apisecret).update(message).digest('hex');
  headers.set('X-EPI2ME-SignatureV0', digest);
}

export function sign(request: Request, credentials: Credentials): Request {
  const headers = request.headers;
  let url = request.url;
  // MC-6412 - signing generated with https://...:443 but validated with https://...
  if (url.match(/^https:/)) {
    url = url.replace(/:443/, '');
  }
  if (url.match(/^http:/)) {
    url = url.replace(/:80/, '');
  }

  const createMessage = (headers: string[]): string[] => [url, ...headers];
  signMessage(headers, createMessage, credentials);
  return request;
}

export const SignedNetwork: NetworkInterface = {
  async get(uri: string, options: RequestOptions = {}): Promise<unknown> {
    const key = options.credentials;
    if (key) {
      return Network.get(uri, {
        ...options,
        mutate_request: async (req) => sign(req, key),
      });
    }
    return Network.get(uri, options);
  },

  async head(uri: string, options: RequestOptions = {}): Promise<unknown> {
    const key = options.credentials;
    if (key) {
      return Network.head(uri, {
        ...options,
        mutate_request: async (req) => sign(req, key),
      });
    }
    return Network.head(uri, options);
  },

  async put(uri: string, body: Body, options: RequestOptions = {}): Promise<unknown> {
    const key = options.credentials;
    if (key) {
      return Network.put(uri, body, {
        ...options,
        mutate_request: async (req) => sign(req, key),
      });
    }
    return Network.put(uri, body, options);
  },

  async post(uri: string, body: Body, options: RequestOptions = {}): Promise<unknown> {
    const key = options.credentials;
    if (key) {
      return Network.post(uri, body, {
        ...options,
        mutate_request: async (req) => sign(req, key),
      });
    }
    return Network.post(uri, body, options);
  },
};
