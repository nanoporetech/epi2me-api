import { GraphQL } from '@metrichor/epi2me-web'
import { asDefined, invariant, isDefined } from 'ts-runtime-typecheck';

const JWT = process.env.JWT; // read ONT JWT from environment variables

async function main () {
  invariant(isDefined(JWT), `Please set JWT as an environment variable`);

  const graphql = new GraphQL({
    jwt: await convertJWT(JWT)
  });

  const response = await graphql.workflows({});

  console.log(response.allWorkflows?.results)
}

async function convertJWT (jwt: string): Promise<string> {
  const res = await (new GraphQL()).convertONTJWT(jwt);

  return asDefined(res.access);
}

main().catch(console.error)