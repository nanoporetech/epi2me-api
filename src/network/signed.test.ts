import { signMessage } from '../../src/network/signed';
import sinon from 'sinon';
import { USER_AGENT } from '../UserAgent.constants';

describe('signMessage', () => {
  it('signs correctly', () => {
    const credentials = {
      apikey: 'a0207e050372b7b0b10cdce458e9e7f3a9cb3bd6',
      apisecret: 'vo6QhSWdu9MqKQk9IC1ql9X7jI9zU1ptN9pqrJ0kPJ4fANYcGvKbB4Pp9QMG164J',
    };

    sinon.useFakeTimers();

    const client = {
      name: USER_AGENT,
      version: '2019.8.30-1719',
    };

    const headers = signMessage(
      {
        body: 'gqlQueryHere',
      },
      client,
      credentials,
    );

    expect(Object.fromEntries(Array.from(headers))).toEqual({
      accept: 'application/json',
      'content-type': 'application/json',
      'x-epi2me-client': USER_AGENT,
      'x-epi2me-version': '2019.8.30-1719',
      'x-epi2me-apikey': 'a0207e050372b7b0b10cdce458e9e7f3a9cb3bd6',
      'x-epi2me-signaturedate': '1970-01-01T00:00:00.000Z',
      'x-epi2me-signaturev0': 'ffebfac74151ebd7fca9c67bb1974ac623e0ea50',
    });

    sinon.restore();
  });
});

// TODO
// - test the sign method
// - test get/head/put/post sign request
// - test mutate_request is always overridden by signing
// - test get/head/put/post get directed to the correct methods
