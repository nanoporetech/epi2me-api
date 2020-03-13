import { buildAxiosFetch } from '@lifeomic/axios-fetch';
import axios from 'axios';
import gqlUtils from './gql-utils';

const fetcher = buildAxiosFetch(axios);

const customFetcher = (uri, requestOptions) => {
  const { apikey, apisecret } = requestOptions.headers.keys;
  delete requestOptions.headers.keys; // eslint-disable-line no-param-reassign
  gqlUtils.setHeaders(requestOptions, {
    apikey,
    apisecret,
    signing: true,
  });

  return fetcher(uri, requestOptions);
};

export default customFetcher;
