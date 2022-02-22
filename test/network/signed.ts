import { signMessage } from '../../src/network/signed';
import { writeCommonHeaders } from '../../src/network';
import assert from 'assert';
import sinon from 'sinon';
import { USER_AGENT } from '../../src/UserAgent.constants';

describe('signMessage', () => {
  it('signs correctly', () => {
    const requestBody = 'gqlQueryHere';
    const apikey = 'a0207e050372b7b0b10cdce458e9e7f3a9cb3bd6';
    const apisecret = 'vo6QhSWdu9MqKQk9IC1ql9X7jI9zU1ptN9pqrJ0kPJ4fANYcGvKbB4Pp9QMG164J';
    sinon.useFakeTimers();
    const requestHeaders = writeCommonHeaders({
      agent_version: '2019.8.30-1719',
    });
    const createMessage = (headers: string[]): string[] => [...headers, requestBody];
    signMessage(requestHeaders, createMessage, { apikey, apisecret }, true);
    for (const [header, value] of requestHeaders.entries()) {
      assert.equal(
        value,
        {
          ACCEPT: 'application/json',
          'CONTENT-TYPE': 'application/json',
          'X-EPI2ME-CLIENT': USER_AGENT,
          'X-EPI2ME-VERSION': '2019.8.30-1719',
          'X-EPI2ME-APIKEY': 'a0207e050372b7b0b10cdce458e9e7f3a9cb3bd6',
          'X-EPI2ME-SIGNATUREDATE': '1970-01-01T00:00:00.000Z',
          'X-EPI2ME-SIGNATUREV0': 'ffebfac74151ebd7fca9c67bb1974ac623e0ea50',
        }[header.toUpperCase()],
      );
    }
    sinon.restore();
  });
});

// TODO
// - test the sign method
// - test get/head/put/post sign request
// - test mutate_request is always overridden by signing
// - test get/head/put/post get directed to the correct methods
