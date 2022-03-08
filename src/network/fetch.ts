/// <reference lib="dom" />

import crossFetch, { Request as CrossRequest, Headers as CrossHeaders, Response as CrossResponse } from 'cross-fetch';
import type { NodeFetch } from './RequestOptions.type';

export const fetch: NodeFetch = globalThis.fetch?.bind(globalThis) ?? crossFetch;
export const Request = globalThis.Request ?? CrossRequest;
export const Response = globalThis.Response ?? CrossResponse;
export const Headers = globalThis.Headers ?? CrossHeaders;
