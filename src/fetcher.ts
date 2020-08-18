import { buildAxiosFetch } from '@lifeomic/axios-fetch';
import type { Response, RequestInfo, RequestInit } from 'node-fetch';
import axios, { Method, AxiosRequestConfig } from 'axios';
import gqlUtils from './gql-utils';

const fetcher = buildAxiosFetch(axios);

interface ApiOptions {
  apikey: string;
  apisecret: string;
}

const methods = new Set(['get', 'delete', 'head', 'options', 'post', 'put', 'patch', 'link', 'unlink']);

function isMethod(str: string): str is Method {
  return methods.has(str.toLowerCase());
}

export type Fetch = (uri: RequestInfo, init: RequestInit) => Promise<Response>;

export function createCustomFetcher({ apikey, apisecret }: ApiOptions): Fetch {
  return (uri: RequestInfo, init: RequestInit = {}): Promise<Response> => {
    let request: AxiosRequestConfig;
    if (!init.method || isMethod(init.method)) {
      request = init as AxiosRequestConfig;
    } else {
      // NOTE we could just force the method to be "get" if the value is invalid
      throw new Error(`Invalid method ${init.method}`);
    }
    gqlUtils.setHeaders(request, {
      apikey,
      apisecret,
      signing: true,
    });
    return fetcher(uri, init);
  };
}
