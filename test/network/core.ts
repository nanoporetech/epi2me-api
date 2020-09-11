import { Network, stubFetch } from '../../src/network';
import { Request, Response } from 'cross-fetch';
import assert from 'assert';
import { asRecord } from '../../src/runtime-typecast';

const BASE_OPTS = { base_url: 'https://test.example.com', agent_version: '3.1.4' };

// NOTE this function takes the place of "fetch" within the network util
// allowing us to return mock responses.
async function debugRouter(info: RequestInfo, init?: RequestInit): Promise<Response> {
  const request = new Request(info, init);
  const { method, headers } = request;
  const url = new URL(request.url);
  switch (url.pathname) {
    case '/echo': {
      return new Response(await request.blob(), { headers });
    }
    case '/blank': {
      return new Response();
    }
    case '/504': {
      return new Response(null, { status: 504 });
    }
    case '/400': {
      return new Response(null, { status: 400 });
    }
    case '/json-error': {
      return new Response(JSON.stringify({ error: 'bang' }));
    }
    case '/describe': {
      const body = await request.text();
      const result = {
        method,
        url,
        headers: [...headers.entries()],
        body,
      };
      return new Response(JSON.stringify(result));
    }
    default: {
      return new Response('not found', { status: 404 });
    }
  }
}

describe('Network', () => {
  let revertFetchMethod;
  beforeEach(() => {
    revertFetchMethod = stubFetch(debugRouter);
  });
  afterEach(() => {
    revertFetchMethod();
  });
  describe('Network.get', () => {
    it('should call fetch with GET method', async () => {
      const res = await Network.get('/describe', BASE_OPTS);
      assert.deepStrictEqual(res, {
        method: 'GET',
        url: BASE_OPTS.base_url + '/describe',
        headers: [
          ['accept', 'application/json'],
          ['content-type', 'application/json'],
          ['x-epi2me-client', 'api'],
          ['x-epi2me-version', BASE_OPTS.agent_version],
        ],
        body: '',
      });
    });
    it('should throw if the response contains an "error" parameter', async () => {
      let threw = false;
      try {
        await Network.get('/json-error', BASE_OPTS);
      } catch (err) {
        assert.equal(err.message, 'bang');
        threw = true;
      }
      assert(threw, 'Response containing error did not throw');
    });
    it('should throw if the response is not valid JSON', async () => {
      let threw = false;
      try {
        await Network.get('/blank', BASE_OPTS);
      } catch (err) {
        threw = true;
      }
      assert(threw, 'Response containing invalid JSON did not throw');
    });
    it('should throw if the response status is not OK', async () => {
      let threw = false;
      try {
        await Network.get('/400', BASE_OPTS);
      } catch (err) {
        assert.equal(err.message, 'Network error: Bad Request');
        threw = true;
      }
      assert(threw, 'Error response did not throw');
    });
    it('should throw network error if response is 504', async () => {
      let threw = false;
      try {
        await Network.get('/504', BASE_OPTS);
      } catch (err) {
        assert.equal(err.message, 'Please check your network connection and try again');
        threw = true;
      }
      assert(threw, 'Error response did not throw');
    });
  });
  describe('Network.head', () => {
    it('should call fetch with HEAD method', async () => {
      const res = await Network.head('/describe', BASE_OPTS);
      assert.deepStrictEqual(await res.json(), {
        method: 'HEAD',
        url: BASE_OPTS.base_url + '/describe',
        headers: [
          ['accept', 'application/json'],
          ['content-type', 'application/json'],
          ['x-epi2me-client', 'api'],
          ['x-epi2me-version', BASE_OPTS.agent_version],
        ],
        body: '',
      });
    });

    it('should not throw if the response contains an "error" parameter', async () => {
      await Network.head('/json-error', BASE_OPTS);
    });
    it('should not throw if the response is not valid JSON', async () => {
      await Network.head('/blank', BASE_OPTS);
    });
    it('should throw if the response status is not OK', async () => {
      let threw = false;
      try {
        await Network.head('/400', BASE_OPTS);
      } catch (err) {
        assert.equal(err.message, 'Network error: Bad Request');
        threw = true;
      }
      assert(threw, 'Error response did not throw');
    });
    it('should throw network error if response is 504', async () => {
      let threw = false;
      try {
        await Network.head('/504', BASE_OPTS);
      } catch (err) {
        assert.equal(err.message, 'Please check your network connection and try again');
        threw = true;
      }
      assert(threw, 'Error response did not throw');
    });
  });
  describe('Network.put', () => {
    it('should call fetch with PUT method', async () => {
      const res = await Network.put(
        '/describe',
        {
          data: 'example',
        },
        BASE_OPTS,
      );
      assert.deepStrictEqual(await res, {
        method: 'PUT',
        url: BASE_OPTS.base_url + '/describe',
        headers: [
          ['accept', 'application/json'],
          ['content-type', 'application/json'],
          ['x-epi2me-client', 'api'],
          ['x-epi2me-version', BASE_OPTS.agent_version],
        ],
        body: '{"data":"example"}',
      });
    });
    it('should submit the body in the request', async () => {
      const res = await Network.put('/echo', { example: 'data' }, BASE_OPTS);
      assert.deepStrictEqual(res, { example: 'data' });
    });
    it('should URL encode the body if the encoding option is set', async () => {
      const res = await Network.put(
        '/describe',
        { name: 'test entity', id_entity: 123 },
        { ...BASE_OPTS, encode_method: 'url' },
      );
      assert.deepStrictEqual(
        asRecord(res).body,
        'id_entity=123&json=%7B%22name%22%3A%22test+entity%22%2C%22id_entity%22%3A123%7D&name=test+entity',
      );
    });
    it('should throw if the response contains an "error" parameter', async () => {
      let threw = false;
      try {
        await Network.put('/json-error', {}, BASE_OPTS);
      } catch (err) {
        assert.equal(err.message, 'bang');
        threw = true;
      }
      assert(threw, 'Response containing error did not throw');
    });
    it('should throw if the response is not valid JSON', async () => {
      let threw = false;
      try {
        await Network.put('/blank', {}, BASE_OPTS);
      } catch (err) {
        threw = true;
      }
      assert(threw, 'Response containing invalid JSON did not throw');
    });
    it('should throw if the response status is not OK', async () => {
      let threw = false;
      try {
        await Network.put('/400', {}, BASE_OPTS);
      } catch (err) {
        assert.equal(err.message, 'Network error: Bad Request');
        threw = true;
      }
      assert(threw, 'Error response did not throw');
    });
    it('should throw network error if response is 504', async () => {
      let threw = false;
      try {
        await Network.put('/504', {}, BASE_OPTS);
      } catch (err) {
        assert.equal(err.message, 'Please check your network connection and try again');
        threw = true;
      }
      assert(threw, 'Error response did not throw');
    });
  });
  describe('Network.post', () => {
    it('should call fetch with POST method', async () => {
      const res = await Network.post('/describe', { data: 'example' }, BASE_OPTS);
      assert.deepStrictEqual(res, {
        method: 'POST',
        url: BASE_OPTS.base_url + '/describe',
        headers: [
          ['accept', 'application/json'],
          ['content-type', 'application/json'],
          ['x-epi2me-client', 'api'],
          ['x-epi2me-version', BASE_OPTS.agent_version],
        ],
        body: '{"data":"example"}',
      });
    });
    it('should submit the body in the request', async () => {
      const res = await Network.post('/echo', { example: 'data' }, BASE_OPTS);
      assert.deepStrictEqual(res, { example: 'data' });
    });
    it('should URL encode the body if the encoding option is set', async () => {
      const res = await Network.post(
        '/describe',
        { name: 'test entity', id_entity: 123 },
        { ...BASE_OPTS, encode_method: 'url' },
      );
      assert.deepStrictEqual(
        asRecord(res).body,
        'id_entity=123&json=%7B%22name%22%3A%22test+entity%22%2C%22id_entity%22%3A123%7D&name=test+entity',
      );
    });
    it('should throw if the response contains an "error" parameter', async () => {
      let threw = false;
      try {
        await Network.post('/json-error', {}, BASE_OPTS);
      } catch (err) {
        assert.equal(err.message, 'bang');
        threw = true;
      }
      assert(threw, 'Response containing error did not throw');
    });
    it('should throw if the response is not valid JSON', async () => {
      let threw = false;
      try {
        await Network.post('/blank', {}, BASE_OPTS);
      } catch (err) {
        threw = true;
      }
      assert(threw, 'Response containing invalid JSON did not throw');
    });
    it('should throw if the response status is not OK', async () => {
      let threw = false;
      try {
        await Network.post('/400', {}, BASE_OPTS);
      } catch (err) {
        assert.equal(err.message, 'Network error: Bad Request');
        threw = true;
      }
      assert(threw, 'Error response did not throw');
    });
    it('should throw network error if response is 504', async () => {
      let threw = false;
      try {
        await Network.post('/504', {}, BASE_OPTS);
      } catch (err) {
        assert.equal(err.message, 'Please check your network connection and try again');
        threw = true;
      }
      assert(threw, 'Error response did not throw');
    });
  });
  // TODO
  // - ensure behaviour of writeCommonHeaders
  // - validate the mutate_request option
  // - validate the mutate_response option
});
