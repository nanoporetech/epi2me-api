import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
// import { setContext } from 'apollo-link-context';
import { ApolloLink, execute } from 'apollo-link';

import axios from 'axios';
import { createHttpLink } from 'apollo-link-http';

// import utils from './utils';
import gqlUtils from './gql-utils';
import { gqlUrl } from './default_options.json';

const { buildAxiosFetch } = require('@lifeomic/axios-fetch');

const fetcher = buildAxiosFetch(axios);

const customFetcher = (uri, requestOptions) => {
  // console.log('REQUEST OPTIONS: ', requestOptions);
  const { apikey, apisecret } = requestOptions.headers.keys;
  delete requestOptions.headers.keys;
  gqlUtils.setHeaders(requestOptions, {
    // Local
    // apikey: 'bd2e57b8cbaffe1c957616c4afca0f6734ae9012',
    // apisecret: 'a527f9aa0713a5f9cfd99af9a174b73d4df34dcbb3be13b97ccd108314ab0f17',
    apikey,
    apisecret,

    signing: true,
    // Dev
    // apikey: '181b88d2847677555df2b4aeda35b0538e582509',
    // apisecret: '63323a39ac1df7e8325df25558505adac59471fdd113ded00783e00909fc085e',
  });

  // console.log(requestOptions.headers);

  // requestOptions.headers = {
  //   ...requestOptions.headers,
  // };
  // console.log(uri);
  // console.log('REQUEST OPTIONS: ', requestOptions);
  return fetcher(uri, requestOptions);
};

// const httpLink = createHttpLink({ url, fetch: buildAxiosFetch(axios) });
// const httpLink = createHttpLink({ uri: `${gqlUrl}/graphql`, fetch: customFetcher });

const link = new ApolloLink((operation, forward) => {
  // console.log('context: ', operation.getContext(), '\n context ends');
  const url = operation.getContext().uri || gqlUrl;
  const { apikey, apisecret } = operation.getContext();
  // operation.setContext(({ headers }) => ({
  //   headers: {
  //     apikey,
  //     apisecret,
  //     ...headers,
  //   },
  // }));
  // return forward(operation);
  const httpLink = createHttpLink({
    uri: `${url}/graphql`,
    fetch: customFetcher,
    headers: { keys: { apikey, apisecret } },
  });
  return execute(httpLink, operation);
});

// const link = new ApolloLink().split(
//   operation => operation.getContext().uri,
//   createHttpLink({ uri: `${uri}/graphql`, fetch: customFetcher }),
//   createHttpLink({ uri: `${url}/graphql`, fetch: customFetcher }),
// );

// const keysLink = setContext((request, { apikey, apisecret }) => {
//   // const { headers } = previousContext;
//   // const req = {
//   //   headers,
//   // };
//   // // utils.headers(req, {
//   // //   apikey: 'bd2e57b8cbaffe1c957616c4afca0f6734ae9012',
//   // //   apisecret: 'a527f9aa0713a5f9cfd99af9a174b73d4df34dcbb3be13b97ccd108314ab0f17',
//   // //   signing: true,
//   // // });
//   // return {
//   //   headers: {
//   //     ...req.headers,
//   //     // Cookie:
//   //     //   'x-metrichor-jwt=eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJpZF91c2VyIjo1MDg5LCJ1c2VyX2FjY291bnRzIjpbeyJpZF91c2VyX2FjY291bnQiOjExMTA0NjA0LCJhY2NvdW50Ijp7ImlkX2FjY291bnQiOjI4MDkyMzc2NSwic2ZfaWQiOiIxQjAwODlCNS1BMTc4LTE3OEUtOTcyRC04NTU1OTM2MEEyRkQiLCJudW1iZXIiOiJDMDAzNjgwIiwibmFtZSI6Ik94Zm9yZCBOYW5vcG9yZSBUZWNobm9sb2dpZXMiLCJpc19kZWxldGVkIjowLCJpc19zaGFyZWQiOjF9LCJyb2xlIjoiUCIsImFncmVlbWVudF9udW1iZXIiOiJNQU46QzAwMzY4MDoyNzM5MzRlMS1jODhiLTRlMjAtODMyNC02ODA4ODE0YWJhZWIiLCJpc19hY3RpdmUiOjEsInVzZXIiOjUwODl9XSwibWVtYmVyc2hpcHMiOlt7ImlkX21lbWJlcnNoaXAiOjk4NzU2MjcyLCJ1c2VyZ3JvdXAiOnsiaWRfdXNlcmdyb3VwIjoyMCwiZ3JvdXBuYW1lIjoiY29tbXVuaXR5In0sInVzZXIiOjUwODl9LHsiaWRfbWVtYmVyc2hpcCI6OTg3NTYyNzMsInVzZXJncm91cCI6eyJpZF91c2VyZ3JvdXAiOjExLCJncm91cG5hbWUiOiJvbnRfcmVhZCJ9LCJ1c2VyIjo1MDg5fSx7ImlkX21lbWJlcnNoaXAiOjk4NzU2Mjc0LCJ1c2VyZ3JvdXAiOnsiaWRfdXNlcmdyb3VwIjoxLCJncm91cG5hbWUiOiJhZG1pbiJ9LCJ1c2VyIjo1MDg5fV0sImlzX2FkbWluIjp0cnVlLCJpc19zdXBwb3J0IjpmYWxzZSwidXNlcm5hbWUiOiJjaHJpcy5yYW1zaGF3QG5hbm9wb3JldGVjaC5jb20iLCJyZWFsbmFtZSI6IkNocmlzIFJhbXNoYXciLCJpc19hY3RpdmUiOjEsImlkX3JlZ2lvbl9wcmVmZXJyZWQiOjEsImFwaWtleSI6IiJ9.M8dH1C-zV2EXY3LyN-yB-F-CnL6TlqVQV7bTPOesHIPEwIAdyVa6SRGXyKH0L8R0LKBZ6GyL1XPlyd6Pcvs2Kuva0ThPq_4BARDbrJq46sOX2npivIRZYJWrI1BuREE8-N7J3kzp28SU9XceYRs0euk-aF7q5nhRowoMXXN4LRBYWP_32z4uMHnx6KTbcGkLzP6c8_c8EW5TQMS_6I0a26_x0YV8ZQdqBcoaVGyAimyKoC1EgiZoJVhsRjYfzdb78l0uI53MCYxx_VZ6-2PDyhEf2s7VYoHmmK-PQQ5jxKo8QkRqArJvvp9nYmJfP0DyK8h2a0_c6fcu78jM9kbJPf-CI97CQy1Oypq-17Fj0MtNnj15UoMyL4DHCQeYSB2odMA7n7MM7ej8bgEX4QCAXQa3V5giK-LnxZTBqgqeP2_2lLgt5Kua2c3VjTl0r6r1cOsxP7jaecQ0A46sRr2bXmseBaWcUogNndwgEmJrInH4B6z_J80I55gKHh461DmyzSS1a3doYLEgu7uspgoJlTb3LVqa1y_RF2PIJxRIkec8rbRqg1uUKQ8-jBMNFsl5-CXgrogZgfG9uj3j4i_LC8DsZLyz63lY2zxYRH7tDB_p9Y2VEKjLzSF5yAWHASye0uUowDPwdpPtFDrvWJUFzBjbwWXfhH6p5f6Z3Zhp7rQ',
//   //     // 'x-metrichor-jwt=',
//   //   },
//   // };
//   // operation.setContext(({ headers }) => ({
//   return {
//     headers: {
//       apikey,
//       apisecret,
//     },
//   };
// }));
// return forward(operation);
// return previousContext;
// });

// const link = ApolloLink.from([keysLink, authLink]);

const cache = new InMemoryCache();

const client = new ApolloClient({
  link,
  cache,
});

export default client;
