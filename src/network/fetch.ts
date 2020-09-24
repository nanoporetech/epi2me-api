import crossFetch, { Request as CrossRequest, Headers as CrossHeaders, Response as CrossResponse } from 'cross-fetch';

export const fetch = globalThis.fetch ?? crossFetch;
export const Request = globalThis.Request ?? CrossRequest;
export const Response = globalThis.Response ?? CrossResponse;
export const Headers = globalThis.Headers ?? CrossHeaders;
