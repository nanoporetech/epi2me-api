import { fetch, Request, Headers } from './fetch';
import { version as API_VERSION } from '../../package.json';
import { isRecord, isString } from '../runtime-typecast';

import type { ObjectDict } from '../ObjectDict';
import type { RequestOptions, ExtendedRequestOptions } from './RequestOptions';
import type { Body } from './Body';
import type { NetworkInterface } from './NetworkInterface';

let fetchMethod = fetch;

export function stubFetch(replacement: (info: RequestInfo, init?: RequestInit) => Promise<Response>): () => void {
  const previous = fetchMethod;
  fetchMethod = replacement;
  return (): void => {
    fetchMethod = previous;
  };
}

async function tryReadAsJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

async function checkJsonResponseForError(response: Response, allowNull = false): Promise<unknown> {
  const jsonResponse = await (allowNull ? tryReadAsJson(response) : response.json());
  if (isRecord(jsonResponse) && isString(jsonResponse.error)) {
    throw new Error(jsonResponse.error);
  }
  return jsonResponse;
}

async function assertResponseStatus(response: Response): Promise<void> {
  if (!response.ok) {
    if (response.status === 504) {
      throw new Error('Please check your network connection and try again');
    }
    await checkJsonResponseForError(response, true);
    throw new Error(`Network error: ${response.statusText}`);
  }
}

export function writeCommonHeaders(options: ExtendedRequestOptions = {}): Headers {
  const headers = new Headers();

  headers.set('Accept', 'application/json');
  headers.set('Content-Type', 'application/json');
  headers.set('X-EPI2ME-Client', options.user_agent ?? 'api');
  headers.set('X-EPI2ME-Version', options.agent_version ?? API_VERSION);

  if (options.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      headers.set(key, value);
    }
  }
  return headers;
}

async function makeRequest(uri: string, options: ExtendedRequestOptions): Promise<Response> {
  const headers = writeCommonHeaders(options);

  const url = new URL(uri, options.base_url);
  const requestInit = {
    headers,
    method: options.method ?? 'get',
    agent: options.agent,
    body: options.body,
  };
  let request = new Request(url.toString(), requestInit);

  if (options.mutate_request) {
    request = await options.mutate_request(request);
  }

  if (options.log) {
    options.log(request);
  }

  let response = await fetchMethod(request);
  await assertResponseStatus(response);

  if (options.mutate_response) {
    response = await options.mutate_response(response);
  }

  return response;
}

function encodeBody(rawBody: Body | ObjectDict, encoding: 'json' | 'url'): Body {
  if (isRecord(rawBody)) {
    if (encoding === 'json') {
      return JSON.stringify(rawBody);
    } else if (encoding === 'url') {
      const result = new URLSearchParams();
      for (const key of Object.keys(rawBody)) {
        result.set(key, String(rawBody[key]));
      }
      // WARN this behavior seems suspicious, the backend requirement for this should be inspected
      result.set('json', JSON.stringify(rawBody));
      result.sort();
      return result;
    } else {
      throw new Error(`Invalid body encoding method ${encoding}`);
    }
  }
  return rawBody;
}

export const Network: NetworkInterface = {
  head(uri: string, options: RequestOptions = {}): Promise<Response> {
    return makeRequest(uri, { ...options, method: 'head' });
  },

  async get(uri: string, options: RequestOptions = {}): Promise<unknown> {
    const response = await makeRequest(uri, { ...options, method: 'get' });
    return checkJsonResponseForError(response);
  },

  async post(uri: string, rawBody: Body | ObjectDict, options: RequestOptions = {}): Promise<unknown> {
    const body = encodeBody(rawBody, options.encode_method ?? 'json');
    const response = await makeRequest(uri, { ...options, body, method: 'post' });
    return checkJsonResponseForError(response);
  },

  async put(uri: string, rawBody: Body | ObjectDict, options: RequestOptions = {}): Promise<unknown> {
    const body = encodeBody(rawBody, options.encode_method ?? 'json');
    const response = await makeRequest(uri, { ...options, body, method: 'put' });
    return checkJsonResponseForError(response);
  },
};
