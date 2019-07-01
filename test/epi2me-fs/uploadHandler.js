import assert from 'assert';
import sinon from 'sinon';
import path from 'path';
import tmp from 'tmp';
import fs from 'fs-extra';
import {
  merge
} from 'lodash';
import EPI2ME from '../../src/epi2me-fs';

describe('epi2me.uploadHandler', () => {
  const tmpfile = 'tmpfile.txt';
  let stubs;
  let tmpdir;
  const clientFactory = opts => {
    tmpdir = tmp.dirSync().name;
    fs.writeFile(path.join(tmpdir, tmpfile));
    const client = new EPI2ME(
      merge({
          inputFolder: tmpdir,
          url: 'https://epi2me-test.local',
          log: {
            debug: sinon.stub(),
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub(),
          },
        },
        opts,
      ),
    );

    sinon.stub(client, 'session').resolves();

    return client;
  };

  beforeEach(() => {
    stubs = [];
  });

  afterEach(() => {
    stubs.forEach(s => {
      s.restore();
    });
  });

  it('should open readStream', async () => {
    const client = clientFactory();
    stubs.push(
      sinon.stub(client, 'sessionedS3').resolves({
        upload: () => ({
          // params, options passed
          on: () => {
            // support for httpUploadProgress
          },
          promise: () => Promise.resolve(),
        }),
      }),
    );

    sinon.stub(client, 'uploadComplete').resolves();

    try {
      await client.uploadHandler({
        name: tmpfile,
        relative: path.basename(tmpfile),
        path: path.join(tmpdir, tmpfile),
      });
    } catch (error) {
      assert.fail(error);
    }
  });

  it('should handle read stream errors', async () => {
    const client = clientFactory();
    const crso = fs.createReadStream;
    stubs.push(
      sinon.stub(fs, 'createReadStream').callsFake((...args) => {
        const readStream = crso(...args);
        readStream.on('open', () => {
          readStream.emit('error');
        }); // fire a readstream error at some point after the readstream created
        return readStream;
      }),
    );

    sinon.stub(client, 'sessionedS3').resolves({
      upload: params => {
        assert(params); // not a very useful test
        return {
          on: () => {
            // support for httpUploadProgress
          },
          promise: () => Promise.resolve(),
        };
      },
    });

    sinon.stub(client, 'uploadComplete').resolves();

    try {
      await client.uploadHandler({
        id: 'my-file',
        name: tmpfile,
        relative: path.basename(tmpfile),
        path: path.join(tmpdir, tmpfile),
      });
      assert.fail('unexpected success');
    } catch (error) {
      assert(String(error).match(/error in upload readstream/));
    }
  });

  it('should handle bad file name - ENOENT', async () => {
    const client = clientFactory();
    try {
      await client.uploadHandler({
        id: 'my-file',
        name: 'bad file name',
        relative: 'bad file name',
        path: path.join(tmpdir, 'bad file name'),
      });
    } catch (err) {
      assert(String(err).match(/ENOENT/));
    }
  });

  it('should handle structured input folders', async () => {
    const client = clientFactory();
    const crso = fs.createReadStream;
    stubs.push(
      sinon.stub(fs, 'createReadStream').callsFake(() => {
        return crso(path.join(tmpdir, tmpfile));
      }),
    );

    sinon.stub(client, 'sessionedS3').resolves({
      upload: params => {
        assert(params); // not a very useful test
        return {
          on: () => {
            // support for httpUploadProgress
          },
          promise: () => Promise.resolve(),
        };
      },
    });

    sinon.stub(client, 'uploadComplete').resolves();

    try {
      await client.uploadHandler({
        id: 'FILE_72',
        name: '12345.fastq',
        relative: 'TEST_2%5C12345.fastq',
        path: 'C:\\Data\\MinKNOW\\TEST2%5C12345.fastq',
      });

      assert.deepEqual(client.uploadComplete.lastCall.args, [
        '/component-0/12345.fastq/TEST_2%5C12345.fastq',
        {
          id: 'FILE_72',
          name: '12345.fastq',
          relative: 'TEST_2%5C12345.fastq',
          path: 'C:\\Data\\MinKNOW\\TEST2%5C12345.fastq',
        },
      ]);
    } catch (error) {
      assert.fail(error);
    }
  });
});
