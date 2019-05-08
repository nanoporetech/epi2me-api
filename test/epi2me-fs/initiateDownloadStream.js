import assert from 'assert';
import sinon from 'sinon';
import path from 'path';
import tmp from 'tmp';
import fs from 'fs-extra';
import { merge } from 'lodash';
import EPI2ME from '../../src/epi2me-fs';

// MC-1304 - test download streams
describe('epi2me.initiateDownloadStream', () => {
  let tmpfile;
  let tmpdir;
  let writeStream;
  let stubs;

  const s3Mock = cb => ({
    getObject: () => ({
      on: () => {},
      createReadStream: cb,
    }),
  });

  const clientFactory = opts => {
    const client = new EPI2ME(
      merge(
        {
          log: {
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub(),
            debug: sinon.stub(),
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
    tmpdir = tmp.dirSync({ unsafeCleanup: true });
    tmpfile = tmp.fileSync({ prefix: 'prefix-', postfix: '.txt' });
    stubs = [];
    stubs.push(sinon.stub(fs, 'unlink'));
    stubs.push(sinon.stub(fs, 'stat').callsFake(() => Promise.resolve(0)));

    fs.writeFile(path.join(tmpdir.name, 'tmpfile.txt'), 'dataset', () => {});

    writeStream = null;
    const fscWS = fs.createWriteStream; // original, and best
    stubs.push(
      sinon.stub(fs, 'createWriteStream').callsFake((...args) => {
        writeStream = fscWS(...args);
        return writeStream;
      }),
    );
  });

  afterEach(() => {
    stubs.forEach(s => {
      s.restore();
    });
  });

  it('should handle s3 error', done => {
    const client = clientFactory({});
    const s3 = s3Mock(() => {
      throw new Error('S3 Error');
    });
    client.initiateDownloadStream(s3, {}, {}, tmpfile.name, () => {
      assert(client.log.error.calledOnce, 'should log error message');
      done();
    });
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
  it('should handle read stream errors', done => {
    const client = clientFactory({});

    const s3 = s3Mock(() => {
      tmpfile = tmp.fileSync({ prefix: 'prefix-', postfix: '.txt' });
      const readStream = fs.createReadStream(tmpfile.name);
      readStream.on('open', () => {
        readStream.emit('error', new Error('Test'));
      });
      return readStream;
    });

    const filename = path.join(tmpdir.name, 'tmpfile.txt');

    client.initiateDownloadStream(s3, {}, {}, filename, () => {
      // assert.equal(readStream.destroyed, true, "should destroy the read stream"); // fails on node > 2.2.1
      assert(client.deleteMessage.notCalled, 'should not delete sqs message on error');
      assert.deepEqual(
        client.states.download.success,
        { files: 0, bytes: 0, reads: 0 },
        'should not count as download success on error',
      );
      done();
    });

    assert.deepEqual(client.states.download.success, { files: 0, bytes: 0, reads: 0 });
  });

  it('should handle write stream errors', done => {
    const client = clientFactory({});

    const s3 = s3Mock(() => {
      tmpfile = tmp.fileSync({ prefix: 'prefix-', postfix: '.txt' });
      const readStream = fs.createReadStream(tmpfile.name);
      return readStream;
    });

    const filename = path.join(tmpdir.name, 'tmpfile2.txt');

    client.initiateDownloadStream(s3, {}, {}, filename, () => {
      // assert.equal(readStream.destroyed, true, "should destroy the read stream"); // fails on node > 2.2.1
      assert(client.deleteMessage.notCalled, 'should not delete sqs message on error');
      assert.deepEqual(
        client.states.download.success,
        { files: 0, reads: 0, bytes: 0 },
        'should not count as download success on error',
      );
      done();
    });
    writeStream.on('open', () => {
      writeStream.emit('error', new Error('Test'));
    });
  });

  it('should handle createWriteStream error', done => {
    const client = clientFactory({});

    assert.doesNotThrow(() => {
      client.initiateDownloadStream(s3Mock(() => {}), {}, {}, null, done);
    });
  });
  /*
  it('should handle transfer timeout errors', async () => {
    const clock = sinon.useFakeTimers();
    const client = clientFactory({ downloadTimeout: 1 }); // effectively zero. Zero would result in default value

    const s3 = s3Mock(() => {
      tmpfile = tmp.fileSync({ prefix: 'prefix-', postfix: '.txt' });
      const readStream = fs.createReadStream(tmpfile.name);
      // Writing random data to file so that the timeout fails before the readstream is done
      clock.tick(5000); // more than downloadTimeout: 1
      fs.writeFileSync(tmpfile.name, new Array(1e5).join('aaa'));
      return readStream;
    });

    const filename = path.join(tmpdir.name, 'tmpfile.txt');

    const p = new Promise(resolve => {
      client.initiateDownloadStream(s3, {}, {}, filename, resolve);
    });
    await p;
    console.log(client.log.debug.args);
    console.log(client.log.warn.args);
    console.log(client.log.info.args);
    assert(client.deleteMessage.notCalled, 'should not delete sqs message on error');
    assert.equal(client.states.download.success, 0, 'should not count as download success on error');
    clock.restore();
  });
*/
});
