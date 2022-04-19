import type { ApolloClient, NormalizedCacheObject } from '@apollo/client/core';
import type { CoreOptions } from './CoreOptions.type';

import { GraphQL } from './graphql';
import { signedFetch } from './network/signed';
import { createClient } from './gql-client';
import type { Agent } from 'http';
import { registerProfile } from './registerProfile';
import type { CredentialsResponse } from './registerProfile.type';
import { invariant } from 'ts-runtime-typecheck';
import { USER_AGENT } from './UserAgent.constants';
import type { Credentials } from './network/Credentials.type';

export class GraphQLFS extends GraphQL {
  private proxyAgent?: Agent;

  constructor(opts: Partial<CoreOptions>, proxyAgent?: Agent) {
    super(opts);
    this.proxyAgent = proxyAgent;
    this.client = this.initClient();
  }

  private get credentials(): Credentials | undefined {
    const { apikey, apisecret } = this.options;
    return apikey && apisecret ? { apikey, apisecret } : undefined;
  }

  initClient = (): ApolloClient<NormalizedCacheObject> => {
    return createClient(this.log, () => {
      return (uri: RequestInfo, init: RequestInit = {}): Promise<Response> => {
        const client = {
          name: USER_AGENT,
          version: this.options.agent_version,
        };

        invariant(typeof uri === 'string', 'Request is not supported for signedFetch, please use a URI instead.');

        return signedFetch(uri, init, {
          credentials: this.credentials,
          client,
          agent: this.proxyAgent,
        });
      };
    });
  };

  register(code: string, description: string): Promise<CredentialsResponse> {
    return registerProfile(code, description, this.options.url, this.proxyAgent);
  }

  async jwt(): Promise<string> {
    const client = {
      name: USER_AGENT,
      version: this.options.agent_version,
    };

    const uri = new URL('validate', this.context.url);

    const res = await signedFetch(
      uri.toString(),
      {
        method: 'POST',
      },
      {
        credentials: this.credentials,
        client,
        agent: this.proxyAgent,
      },
    );

    const data: { valid: boolean; jwt: string } = await res.json();

    invariant(data.valid, 'Reported invalid credentials');

    return data.jwt;
  }
}
