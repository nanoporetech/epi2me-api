import { getGraphQLEndpoint } from './graphql';
import { NestedError } from './NodeError';
import { fetch } from './network/fetch';
import type { Agent } from 'http';
import { asUnion, isString, isStruct, JSONValue } from 'ts-runtime-typecheck';
import type { CredentialsResponse } from './registerProfile.type';

export async function registerProfile(
  code: string,
  description: string,
  endpoint: string,
  httpAgent: Agent | undefined,
): Promise<CredentialsResponse> {
  let content;
  try {
    const url = new URL('apiaccess', getGraphQLEndpoint(endpoint));
    const res = await fetch(url.toString(), {
      method: 'POST',
      agent: httpAgent,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code, description }),
    });

    content = (await res.json()) as JSONValue;
  } catch (err) {
    throw new NestedError(
      'Experienced network error registering profile with EPI2ME servers. Check your internet connection.',
      err,
    );
  }

  const response = asCredentialsResponse(content);

  if ('detail' in response) {
    throw new Error(`Invalid registration code: ${response.detail}.`);
  }

  return response;
}

const isCredentialsError = isStruct({
  detail: isString,
});

const isCredentialsResult = isStruct({
  apisecret: isString,
  apikey: isString,
  description: isString,
});

const asCredentialsResponse = asUnion(isCredentialsError, isCredentialsResult);
