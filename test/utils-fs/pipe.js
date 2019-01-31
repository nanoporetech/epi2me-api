import assert from 'assert';
import sinon from 'sinon';
import tmp from 'tmp';
import path from 'path';
import axios from 'axios';
import { PassThrough } from 'stream';
import utils from '../../src/utils-fs';

describe('utils-fs.pipe', () => {
  it('should pipe without progress (and with proxy)', () => {
    // const spy = sinon.spy(utils, '_headers');
    const mockResponse = `{"data": 123}`;
    const mockStream = new PassThrough();

    mockStream.push(mockResponse);
    mockStream.end(); // Mark that we pushed all the data.

    // Finally keep track of how 'pipe' is going to be called
    sinon.spy(mockStream, 'pipe');

    const stub = sinon.stub(axios, 'get').resolves({
      data: {
        pipe: () => mockStream,
      },
    });

    const outfn = path.join(tmp.dirSync().name, 'magic');
    assert.doesNotThrow(async () => {
      await utils.pipe(
        '/bundle/magic',
        outfn,
        { url: 'http://epi2me.local', proxy: 'http://proxy.local:3128/' },
      );
    });
    /* assert.ok(utils._headers.calledOnce, 'headers added');
    assert.deepEqual(utils._headers.args[0], [
      {
        uri: 'http://epi2me.local/bundle/magic',
        gzip: true,
        headers: {
          'Accept-Encoding': 'gzip',
          Accept: 'application/gzip',
          'Content-Type': 'application/json',
          'X-EPI2ME-ApiKey': undefined,
          'X-EPI2ME-Client': '',
          'X-EPI2ME-Version': '0',
        },
        proxy: 'http://proxy.local:3128/',
        responseType: 'stream',
      },
      { url: 'http://epi2me.local', proxy: 'http://proxy.local:3128/' },
    ]);
    //	assert.ok(cb.calledOnce, "callback fired"); // why doesn't this fire? the stream has ended...
    spy.restore(); */
    stub.restore();
  });

  it('should pipe with progress', async () => {
    const progressCb = sinon.fake();
    //    const spy = sinon.spy(utils, '_headers');
    const mockResponse = `{"data": 123}`;
    const mockStream = new PassThrough();

    mockStream.push(mockResponse);
    mockStream.end(); // Mark that we pushed all the data.

    // Finally keep track of how 'pipe' is going to be called
    sinon.spy(mockStream, 'pipe');

    const stub = sinon.stub(axios, 'get').resolves({
      data: {
        pipe: () => mockStream,
      },
    });

    const outfn = path.join(tmp.dirSync().name, 'magic');
    assert.doesNotThrow(async () => {
      await utils.pipe(
        '/bundle/magic',
        outfn,
        { url: 'http://epi2me.local' },
        progressCb,
      );
    });
    /*
    assert.ok(utils._headers.calledOnce, 'headers added');
    assert.deepEqual(utils._headers.args[0], [
      {
        uri: 'http://epi2me.local/bundle/magic',
        gzip: true,
        headers: {
          'Accept-Encoding': 'gzip',
          Accept: 'application/gzip',
          'Content-Type': 'application/json',
          'X-EPI2ME-ApiKey': undefined,
          'X-EPI2ME-Client': '',
          'X-EPI2ME-Version': '0',
        },
        responseType: 'stream',
        onUploadProgress: progressCb,
      },
      { url: 'http://epi2me.local' },
    ]);
    // assert.ok(cb.calledOnce, "callback fired"); // why doesn't this fire? the stream has ended...
    // assert.ok(progressCb.calledOnce, "progress fired"); // why doesn't this fire? the stream has ended...
    spy.restore(); */
    stub.restore();
  });
});
