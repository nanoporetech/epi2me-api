import axios from 'axios';
import { buildAxiosFetch } from '@lifeomic/axios-fetch';
import gqlUtils from './gql-utils';

const fetcher = buildAxiosFetch(axios);

const customFetcher = (uri, requestOptions) => {
  // console.log('REQUEST OPTIONS: ', requestOptions);
  const { apikey, apisecret } = requestOptions.headers.keys;
  delete requestOptions.headers.keys; // eslint-disable-line no-param-reassign
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

export default customFetcher;
