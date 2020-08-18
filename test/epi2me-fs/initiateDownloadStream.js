import assert from 'assert';
import sinon from 'sinon';
import path from 'path';
import tmp from 'tmp';
import fs from 'fs-extra';
import { merge } from 'lodash';
import AWS from 'aws-sdk';
import EPI2ME from '../../src/epi2me-fs';

// MC-1304 - test download streams
describe('epi2me.initiateDownloadStream', () => {
  let tmpfile;
  let tmpdir;
  let stubs;
  let clock;

  const clientFactory = (opts) => {
    const client = new EPI2ME(
      merge(
        {
          log: {
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub(),
            debug: sinon.stub(),
            json: sinon.stub(),
          },
        },
        opts,
      ),
    );

    sinon.stub(client, 'checkForDownloads');
    sinon.stub(client, 'deleteMessage');
    //	sinon.stub(client.sqs, "changeMessageVisibility");

    return client;
  };

  beforeEach(() => {
    clock = sinon.useFakeTimers();
    tmpdir = tmp.dirSync({ unsafeCleanup: true });
    tmpfile = tmp.fileSync({ prefix: 'prefix-', postfix: '.txt' });
    stubs = [];
    stubs.push(sinon.stub(fs, 'unlink'));
    stubs.push(sinon.stub(fs, 'stat').callsFake(() => Promise.resolve(0)));

    fs.writeFile(path.join(tmpdir.name, 'tmpfile.txt'), 'dataset', () => {});
  });

  afterEach(() => {
    clock.restore();
    stubs.forEach((s) => {
      s.restore();
    });
  });

  it('should handle s3 error', async () => {
    const client = clientFactory({});
    sinon.stub(client, 'sessionedS3').throws(new Error('S3 Error'));

    try {
      await client.initiateDownloadStream({}, {}, tmpfile.name);
    } catch (e) {
      assert(String(e).match(/S3 Error/));
    }

    assert(client.log.error.calledOnce, 'should log error message');
  });

  /*
    it('should open read stream and write to outputFile', (done) => {
        let client = clientFactory({
            inputFolder:    tmpdir.name,
            uploadedFolder: '+uploaded',
            outputFolder:   '+downloads'
        });

        let readStream,
            msg = {msg: 'bla'},
            s3 = s3Mock(() => {
                readStream = fs.createReadStream(tmpfile.name);
                return readStream;
            });

//		client.states.download.success = 1; // required for recent min(download,upload) fudge?
        client.initiateDownloadStream(s3, {}, msg, tmpfile.name, () => {
//                    assert.equal(readStream.destroyed, true, "should destroy the read stream"); // fails on node > 2.2.1
//                    assert(client.deleteMessage.calledWith(msg), "should delete sqs message on success"); // fails on node > 2.2.1
	    console.log(client.log);
            assert(client.log.error.notCalled, "should not throw exception");
            assert(client.log.warn.notCalled, "should not throw warning");
            //assert.equal(client.states.download.success, 1, "should count as download success");
            done();
        });
    });
*/

  it('should handle read stream errors', async () => {
    const client = clientFactory({});
    const s3 = new AWS.S3();

    sinon.stub(client, 'sessionedS3').callsFake(() => s3);

    sinon.stub(s3, 'getObject').callsFake(() => {
      return {
        on: () => {},
        createReadStream: () => {
          tmpfile = tmp.fileSync({ prefix: 'prefix-', postfix: '.txt' });
          const readStream = fs.createReadStream(tmpfile.name);
          readStream.on('open', () => {
            readStream.emit('error', new Error('Test'));
          });
          return readStream;
        },
      };
    });

    const filename = path.join(tmpdir.name, 'tmpfile.txt');

    try {
      await client.initiateDownloadStream({}, {}, filename);
    } catch (e) {
      assert.fail(e);
    }
    assert(client.deleteMessage.notCalled, 'should not delete sqs message on error');
    assert.deepEqual(
      client.states.download.success,
      { files: 0, bytes: 0, reads: 0, niceReads: 0, niceSize: 0 },
      'should not count as download success on error',
    );

    assert.deepEqual(client.states.download.success, { files: 0, bytes: 0, reads: 0, niceReads: 0, niceSize: 0 });
  });

  it('should handle write stream errors', async () => {
    const client = clientFactory({});
    const s3 = new AWS.S3();

    sinon.stub(client, 'sessionedS3').callsFake(() => s3);
    sinon.stub(s3, 'getObject').callsFake(() => {
      return {
        on: () => {},
        createReadStream: () => {
          tmpfile = tmp.fileSync({ prefix: 'prefix-', postfix: '.txt' });
          const readStream = fs.createReadStream(tmpfile.name);
          return readStream;
        },
      };
    });

    const filename = path.join(tmpdir.name, 'tmpfile2.txt');
    let writeStream = null;
    const fscWS = fs.createWriteStream; // original, and best
    stubs.push(
      sinon.stub(fs, 'createWriteStream').callsFake((...args) => {
        writeStream = fscWS(...args);
        writeStream.on('open', () => {
          writeStream.emit('error', new Error('Test'));
        });
        return writeStream;
      }),
    );

    await client.initiateDownloadStream({}, {}, filename);

    assert(client.deleteMessage.notCalled, 'should not delete sqs message on error');
    assert.deepEqual(
      client.states.download.success,
      { files: 0, reads: 0, bytes: 0, niceReads: 0, niceSize: 0 },
      'should not count as download success on error',
    );
  });

  it('should handle createWriteStream error', async () => {
    const client = clientFactory({});
    const s3 = new AWS.S3();

    sinon.stub(client, 'sessionedS3').callsFake(() => s3);

    try {
      await client.initiateDownloadStream({}, {}, null);
    } catch (e) {
      assert(String(e).match(/Error/)); // it's a little bit too internal-y
    }
  });

  it('should handle transfer timeout errors', async () => {
    const client = clientFactory({ downloadTimeout: 1 }); // effectively zero. Zero would result in default value
    const s3 = new AWS.S3();
    sinon.stub(client, 'sessionedS3').callsFake(() => s3);

    sinon.stub(s3, 'getObject').callsFake(() => {
      return {
        on: sinon.fake(),
        createReadStream: () => {
          fs.writeFileSync(tmpfile.name, new Array(1e5).join('aaa'));
          const readStream = fs.createReadStream(tmpfile.name);
          // Writing random data to file so that the timeout fails before the readstream is done
          //          clock.tick(2000 * client.config.options.downloadTimeout); // should cause transferTimeout to fire
          readStream.on('open', () => {
            // defer error emission
            readStream.emit('error', new Error('fake timeout'));
          });
          return readStream;
        },
      };
    });

    const filename = path.join(tmpdir.name, 'tmpfile.txt');

    try {
      await client.initiateDownloadStream(s3, {}, filename);
    } catch (e) {
      assert.fail(e); // does not reject immediately (req.createReadStream)
    }

    assert(client.deleteMessage.notCalled, 'should not delete sqs message on error');
    assert.equal(client.states.download.success.files, 0, 'should not count as download success on error');
  });
});
