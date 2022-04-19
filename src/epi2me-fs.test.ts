import assert from 'assert';
import fs from 'fs-extra';
import path from 'path';
import sinon, { SinonStub } from 'sinon';
import tmp from 'tmp-promise';
import { EPI2ME_FS as EPI2ME } from './epi2me-fs';
import type { EPI2ME_OPTIONS } from './epi2me-options.type';
import AWS from 'aws-sdk';
import { createInterval, sleep } from './timers';
import { Duration } from './Duration';
import { asSinonStub } from './isStub';
import type { Socket } from './socket';
import type { Epi2meCredentials } from './credentials';
import type { GetObjectRequest } from 'aws-sdk/clients/s3';
import { expectToThrow } from './NodeError';
import type { GraphQLFS } from './graphql-fs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function dummyAWSRequest<T>(fn: () => Promise<T>): AWS.Request<T, any> {
  return {
    promise: fn,
    on: sinon.stub(),
    createReadStream: sinon.stub(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as unknown as AWS.Request<T, any>;
}

describe('epi2me.autoConfigure', () => {
  let clock: sinon.SinonFakeTimers;
  let tmpDir: tmp.DirectoryResult;
  let mkdir: SinonStub;

  beforeEach(async () => {
    tmpDir = await tmp.dir();
    clock = sinon.useFakeTimers();
    mkdir = sinon.stub(fs.promises, 'mkdir').resolves();
  });

  afterEach(() => {
    clock.restore();
    tmpDir.cleanup();
    mkdir.restore();
  });

  function clientFactory(opts: Partial<EPI2ME_OPTIONS> = {}) {
    return new EPI2ME({
      url: 'https://epi2me-test.local',
      log: {
        debug: sinon.stub(),
        info: sinon.stub(),
        warn: sinon.stub(),
        error: sinon.stub(),
        critical: sinon.stub(),
      },
      ...opts,
    });
  }

  it('should require inputFolder', async () => {
    const client = clientFactory();

    await expectToThrow(() => client.autoConfigure({}), 'no input folders specified');
  });

  it('should allow dataset instead of inputFolder', async () => {
    const client = clientFactory({
      id_dataset: '1234',
      outputFolder: path.join(tmpDir.path, 'output'),
    });

    // this error is our "backstop" that throws
    // when the instance hasn't been set
    await expectToThrow(() => client.autoConfigure({}), 'bucketFolder must be set');
  });

  it('should not allow dataset and inputFolder', async () => {
    const client = clientFactory({
      id_dataset: '1234',
      inputFolder: path.join(tmpDir.path, 'input'),
    });

    await expectToThrow(() => client.autoConfigure({}), 'cannot use a dataset and folders as an input');
  });

  it('should require outputFolder', async () => {
    const client = clientFactory({
      inputFolder: path.join(tmpDir.path, 'input'),
    });

    await expectToThrow(() => client.autoConfigure({}), 'must set outputFolder');
  });

  it('should require that the instance be set', async () => {
    const client = clientFactory({
      inputFolders: [path.join(tmpDir.path, 'input')],
      outputFolder: path.join(tmpDir.path, 'output'),
    });

    // this error is our "backstop" that throws
    // when the instance hasn't been set
    await expectToThrow(() => client.autoConfigure({}), 'bucketFolder must be set');
  });
});

describe('epi2me.checkForDownloads', () => {
  let instanceId = 1;
  const clientFactory = (opts = {}) => {
    const newClient = new EPI2ME({
      url: 'https://epi2me-test.local',
      log: {
        debug: sinon.stub(),
        info: sinon.stub(),
        warn: sinon.stub(),
        error: sinon.stub(),
        critical: sinon.stub(),
      },
      id_workflow_instance: instanceId,
      ...opts,
    });
    newClient.config.instance.outputQueueName = 'example output queue';
    instanceId += 1;
    return newClient;
  };

  it('should bail if already running', async () => {
    const client = clientFactory();
    const discoverQueue = sinon.stub(client, 'discoverQueue').resolves('http://queue.url/');
    sinon.stub(client, 'queueLength').resolves(); // undefined
    sinon.stub(client, 'downloadAvailable');
    client.checkForDownloadsRunning = true;

    await client.checkForDownloads();

    assert(discoverQueue.notCalled);
  });

  it('should process undefined messages', async () => {
    const client = clientFactory();
    sinon.stub(client, 'discoverQueue').resolves('http://queue.url/');
    sinon.stub(client, 'queueLength').resolves(); // undefined
    const downloadAvailable = sinon.stub(client, 'downloadAvailable');

    await client.checkForDownloads();

    assert(downloadAvailable.notCalled);
  });

  it('should process null messages', async () => {
    const client = clientFactory();
    sinon.stub(client, 'discoverQueue').resolves('http://queue.url/');
    sinon.stub(client, 'queueLength').resolves(null); // null
    const downloadAvailable = sinon.stub(client, 'downloadAvailable');

    await client.checkForDownloads();

    // assert(debug.lastCall.args[0].match(/no downloads available/));
    assert(downloadAvailable.notCalled);
  });

  it('should process zero messages', async () => {
    const client = clientFactory();
    sinon.stub(client, 'discoverQueue').resolves('http://queue.url/');
    sinon.stub(client, 'queueLength').resolves(0); // zero
    const downloadAvailable = sinon.stub(client, 'downloadAvailable');

    await client.checkForDownloads();

    // assert(debug.lastCall.args[0].match(/no downloads available/));
    assert(downloadAvailable.notCalled);
  });

  it('should process n messages', async () => {
    const client = clientFactory();
    const debug = asSinonStub(client.log.debug);
    sinon.stub(client, 'discoverQueue').resolves('http://queue.url/');
    sinon.stub(client, 'queueLength').resolves(50); // n
    const downloadAvailable = sinon.stub(client, 'downloadAvailable');

    await client.checkForDownloads();

    expect(debug.lastCall.args[0]).toEqual('downloads available: 50');
    assert(downloadAvailable.calledOnce);
  });

  it('should handle new error', async () => {
    const client = clientFactory();
    const error = asSinonStub(client.log.error);

    sinon.stub(client, 'discoverQueue').rejects(new Error('discoverQueue failed'));

    await client.checkForDownloads();

    expect(error.lastCall.args[0]).toEqual('checkForDownloads error');
    assert.deepEqual(client.states.download.failure, {
      'checkForDownloads error': 1,
    });
    assert.equal(client.checkForDownloadsRunning, false, 'semaphore unset');
  });

  it('should handle subsequent error', async () => {
    const client = clientFactory();
    const error = asSinonStub(client.log.error);
    sinon.stub(client, 'discoverQueue').rejects(new Error('discoverQueue failed'));
    client.states.download.failure = {
      'checkForDownloads error': 1,
    };

    await client.checkForDownloads();

    expect(error.lastCall.firstArg).toEqual('checkForDownloads error');
    expect(client.states.download.failure).toEqual({
      'checkForDownloads error': 2,
    });
    assert.equal(client.checkForDownloadsRunning, false, 'semaphore unset');
  });
});

describe('epi2me', () => {
  describe('constructor', () => {
    it('should create an epi2me object with defaults and allow overwriting', () => {
      const client = new EPI2ME({});

      assert.equal(client.url, 'https://epi2me.nanoporetech.com', 'default url');
    });

    it('should create an epi2me object with log functions', () => {
      const log = {
        debug: () => {},
        info: () => {},
        warn: () => {},
        error: () => {},
        critical: () => {},
      };

      const client = new EPI2ME({
        log,
      });

      assert.deepEqual(client.log, log, 'custom logging');
    });

    it('should create an epi2me with opts', () => {
      const client = new EPI2ME({
        url: 'https://epi2me.local:8000',
        apikey: 'FooBar02',
      });
      assert.equal(client.url, 'https://epi2me.local:8000', 'url built from constructor');
    });
  });
});

describe('epi2me.deleteMessage', () => {
  const clientFactory = (opts = {}) => {
    const client = new EPI2ME({
      url: 'https://epi2me-test.local',
      log: {
        debug: sinon.stub(),
        info: sinon.stub(),
        warn: sinon.stub(),
        error: sinon.stub(),
        critical: sinon.stub(),
      },
      ...opts,
    });
    client.config.instance.outputQueueName = 'example output queue';
    return client;
  };

  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });
  afterEach(() => {
    clock.restore();
  });

  it('should invoke discoverqueue with callbacks', async () => {
    const client = clientFactory();
    client.config.instance.outputQueueName = 'my-output-queue';

    const sqs = new AWS.SQS();
    const sessionedSQS = sinon.stub(client, 'sessionedSQS').returns(sqs);
    const discoverQueue = sinon.stub(client, 'discoverQueue').resolves('');
    sinon.stub(sqs, 'deleteMessage').callsFake(() => dummyAWSRequest(sinon.stub()));

    await client.deleteMessage({
      ReceiptHandle: 'test message',
    });

    assert(sessionedSQS.calledOnce);
    assert(discoverQueue.calledOnce);
    assert.equal(discoverQueue.lastCall.args[0], 'my-output-queue', 'queue name passed');
  });

  it('should invoke sqs.deleteMessage without error', async () => {
    const client = clientFactory();
    const sqs = new AWS.SQS();
    sinon.stub(client, 'sessionedSQS').returns(sqs);

    sinon.stub(client, 'discoverQueue').resolves('http://my-output-queue.eu-test-1.aws.com');
    const deleteMessage = sinon.stub(sqs, 'deleteMessage').callsFake(() => dummyAWSRequest(sinon.stub()));

    await client.deleteMessage({
      ReceiptHandle: 'abcd-1234',
    });

    assert(deleteMessage.calledOnce, 'sqs.deleteMessage invoked');
    assert.deepEqual(deleteMessage.args[0][0], {
      QueueUrl: 'http://my-output-queue.eu-test-1.aws.com',
      ReceiptHandle: 'abcd-1234',
    });
  });

  it('should invoke sqs.deleteMessage with error', async () => {
    const client = clientFactory();
    const sqs = new AWS.SQS();
    sinon.stub(client, 'sessionedSQS').returns(sqs);

    sinon.stub(client, 'discoverQueue').resolves('http://my-output-queue.eu-test-1.aws.com');
    sinon.stub(sqs, 'deleteMessage').callsFake(() => dummyAWSRequest(sinon.stub().throws('deleteMessage failed')));

    await expectToThrow(
      () =>
        client.deleteMessage({
          ReceiptHandle: 'abcd-1234',
        }),
      'deleteMessage error',
    );
  });

  it('should invoke sqs.deleteMessage with exception', async () => {
    const client = clientFactory();
    const error = asSinonStub(client.log.error);
    const sqs = new AWS.SQS();
    sinon.stub(client, 'sessionedSQS').returns(sqs);

    sinon.stub(client, 'discoverQueue').resolves('http://my-output-queue.eu-test-1.aws.com');
    sinon.stub(sqs, 'deleteMessage').throws(new Error('deleteMessage failed'));

    const testMessage = {
      message: 'test message',
      ReceiptHandle: 'abcd-1234',
    };

    await expectToThrow(() => client.deleteMessage(testMessage), 'deleteMessage error');
    expect(error.firstCall.firstArg).toEqual('deleteMessage error');
  });

  it('should invoke sqs.deleteMessage with discovery failure and counter set', async () => {
    const client = clientFactory();
    const sqs = new AWS.SQS();
    sinon.stub(client, 'sessionedSQS').callsFake(
      () =>
        // don't do any portal sessioning
        sqs,
    );

    sinon.stub(client, 'discoverQueue').rejects(new Error('could not connect'));
    const deleteMessage = sinon.stub();

    const testMessage = {
      message: 'test message',
      ReceiptHandle: 'abcd-1234',
    };

    await expectToThrow(() => client.deleteMessage(testMessage), 'deleteMessage error');

    expect(deleteMessage.notCalled).toBeTruthy();
    expect(client.states.download.failure?.['deleteMessage error']).toEqual(1);
  });

  it('should invoke sqs.deleteMessage with discovery failure and counter increment', async () => {
    const client = clientFactory();
    const sqs = new AWS.SQS();
    sinon.stub(client, 'sessionedSQS').callsFake(
      () =>
        // don't do any portal sessioning
        sqs,
    );

    sinon.stub(client, 'discoverQueue').rejects(new Error('could not connect'));
    const deleteMessage = sinon.stub();

    client.states.download.failure = {
      'deleteMessage error': 7,
    };

    const testMessage = {
      message: 'test message',
      ReceiptHandle: 'abcd-1234',
    };

    await expectToThrow(() => client.deleteMessage(testMessage), 'deleteMessage error');

    expect(deleteMessage.notCalled).toBeTruthy();
    expect(client.states.download.failure['deleteMessage error']).toEqual(8);
  });
});

describe('epi2me.discoverQueue', () => {
  const clientFactory = (opts = {}) =>
    new EPI2ME({
      url: 'https://epi2me-test.local',
      log: {
        debug: sinon.stub(),
        info: sinon.stub(),
        warn: sinon.stub(),
        error: sinon.stub(),
        critical: sinon.stub(),
      },
      ...opts,
    });

  it('discovers successfully', async () => {
    const client = clientFactory();
    const sqs = new AWS.SQS();
    sinon.stub(client, 'sessionedSQS').returns(sqs);
    sinon.stub(sqs, 'getQueueUrl').callsFake(() =>
      dummyAWSRequest(() =>
        Promise.resolve({
          QueueUrl: 'https://my.cloud/queues/my_queue',
        }),
      ),
    );

    const data = await client.discoverQueue('my_queue');

    assert.equal(data, 'https://my.cloud/queues/my_queue', 'success callback fired with queue url');
  });

  it('discovers with cache hit', async () => {
    const client = clientFactory();
    client.config.instance.discoverQueueCache.my_queue = 'https://my.cloud/queues/my_queue';
    const sqs = new AWS.SQS();
    const sessionedSQS = sinon.stub(client, 'sessionedSQS').returns(sqs);
    sinon.stub(sqs, 'getQueueUrl').callsFake(() =>
      dummyAWSRequest(() =>
        Promise.resolve({
          QueueUrl: 'https://my.cloud/queues/my_queue',
        }),
      ),
    );

    const data = await client.discoverQueue('my_queue');

    expect(data).toEqual('https://my.cloud/queues/my_queue');
    expect(sessionedSQS.notCalled).toBeTruthy();
  });

  it('fails to discover', async () => {
    const client = clientFactory();
    const sqs = new AWS.SQS();
    sinon.stub(client, 'sessionedSQS').returns(sqs);
    sinon.stub(sqs, 'getQueueUrl').callsFake(() => dummyAWSRequest(() => Promise.reject(new Error('no such queue'))));

    await expectToThrow(() => client.discoverQueue('my_queue'), 'failed to find queue for my_queue');
  });
});

describe('epi2me.downloadAvailable', () => {
  const clientFactory = (opts = {}) => {
    const client = new EPI2ME({
      url: 'https://epi2me-test.local',
      log: {
        debug: sinon.stub(),
        info: sinon.stub(),
        warn: sinon.stub(),
        error: sinon.stub(),
        critical: sinon.stub(),
      },
      ...opts,
    });
    client.config.instance.outputQueueName = 'example output queue';
    return client;
  };

  it('should resolve if already busy', async () => {
    const client = clientFactory();
    client.downloadWorkerPool = {
      one: 1,
      two: 2,
      three: 3,
    };
    sinon.stub(client, 'receiveMessages').resolves();

    await client.downloadAvailable();

    assert(asSinonStub(client.receiveMessages).notCalled);
  });

  it('should handle discoverQueue errors', async () => {
    const client = clientFactory();
    sinon.stub(client, 'discoverQueue').rejects(new Error('discoverQueue failed'));
    const receiveMessages = sinon.stub(client, 'receiveMessages').resolves();

    await expectToThrow(() => client.downloadAvailable(), 'receiveMessage error');
    expect(receiveMessages.notCalled).toBeTruthy();
  });

  it('should handle new receiveMessage error', async () => {
    const client = clientFactory();
    const sqs = new AWS.SQS();
    delete client.downloadWorkerPool; // force missing
    sinon.stub(client, 'discoverQueue').resolves('http://queue.url/');
    sinon.stub(client, 'sessionedSQS').returns(sqs);
    sinon.stub(sqs, 'receiveMessage').callsFake(() =>
      dummyAWSRequest(async () => {
        throw new Error('timed out');
      }),
    );
    const receiveMessages = sinon.stub(client, 'receiveMessages').resolves();

    await expectToThrow(() => client.downloadAvailable(), 'receiveMessage error');
    expect(receiveMessages.notCalled).toBeTruthy();
  });

  it('should handle subsequent receiveMessage error', async () => {
    const client = clientFactory();
    const sqs = new AWS.SQS();
    client.states.download.failure = {
      'receiveMessage error': 1,
    };
    delete client.downloadWorkerPool; // force missing
    sinon.stub(client, 'discoverQueue').resolves('http://queue.url/');
    sinon.stub(client, 'sessionedSQS').returns(sqs);
    sinon.stub(sqs, 'receiveMessage').callsFake(() =>
      dummyAWSRequest(async () => {
        throw new Error('timed out');
      }),
    );
    const receiveMessages = sinon.stub(client, 'receiveMessages').resolves();

    await expectToThrow(() => client.downloadAvailable(), 'receiveMessage error');
    expect(receiveMessages.notCalled).toBeTruthy();
    expect(client.states.download.failure).toEqual({
      'receiveMessage error': 2,
    });
  });

  it('should process message set', async () => {
    const client = clientFactory();
    const sqs = new AWS.SQS();
    delete client.downloadWorkerPool; // force missing
    sinon.stub(client, 'discoverQueue').resolves('http://queue.url/');
    sinon.stub(client, 'sessionedSQS').returns(sqs);
    sinon.stub(sqs, 'receiveMessage').callsFake(() =>
      dummyAWSRequest(async () => {
        return {};
      }),
    );

    const receiveMessages = sinon.stub(client, 'receiveMessages').resolves();

    await client.downloadAvailable();

    assert(receiveMessages.calledOnce);
  });
});

describe('epi2me-fs', () => {
  let instanceID = 0;

  /**
   *
   * @returns Epi2meCredentials
   */
  const instanceFactory = () => {
    instanceID += 1;

    const API = new EPI2ME({
      id_workflow_instance: instanceID,
      sessionGrace: 5,
    });
    API.graphQL = {
      instanceToken: sinon.stub().resolves({
        token: {
          accessKeyId: 'KEY::GRAPHQL',
          secretAccessKey: 'SECRET_KEY::GRAPHQL',
          sessionToken: 'TOKEN::GRAPHQL',
          expiration: '',
        },
      }),
    } as unknown as GraphQLFS;

    return API;
  };

  describe('fetchToken', () => {
    it('should fetch a token using GRAPHQL', async () => {
      const inst = instanceFactory();
      const s3 = inst.sessionedS3();
      await (s3.config.credentials as Epi2meCredentials).refreshPromise();

      assert.strictEqual(asSinonStub(inst.graphQL.instanceToken).callCount, 1, 'GRAPHQL fetch ok');
    });
  });
});

// MC-1304 - test download streams
describe('epi2me.initiateDownloadStream', () => {
  let tmpfile: string;
  let tmpdir: tmp.DirectoryResult;
  let stubs: sinon.SinonStub[];
  let clock: sinon.SinonFakeTimers;

  const clientFactory = (opts = {}) => {
    const client = new EPI2ME({
      log: {
        info: sinon.stub(),
        warn: sinon.stub(),
        error: sinon.stub(),
        debug: sinon.stub(),
        critical: sinon.stub(),
      },
      ...opts,
    });

    sinon.stub(client, 'checkForDownloads');
    sinon.stub(client, 'deleteMessage');
    //	sinon.stub(client.sqs, "changeMessageVisibility");

    return client;
  };

  beforeEach(async () => {
    clock = sinon.useFakeTimers();
    tmpdir = await tmp.dir();
    tmpfile = path.join(tmpdir.path, 'tmpfile.txt');
    stubs = [];
    stubs.push(sinon.stub(fs, 'unlink'));
    stubs.push(sinon.stub(fs, 'stat'));

    await fs.promises.writeFile(tmpfile, 'dataset');
  });

  afterEach(async () => {
    clock.restore();
    stubs.forEach((s) => {
      s.restore();
    });
    // await fs.promises.rm(tmpfile);
    // await tmpdir.cleanup();
  });

  it('should handle s3 error', async () => {
    const client = clientFactory({});
    sinon.stub(client, 'sessionedS3').throws(new Error('S3 Error'));

    await expectToThrow(
      () =>
        client.initiateDownloadStream(
          {
            bucket: '',
            path: '',
          },
          {},
          tmpfile,
        ),
      'S3 Error',
    );
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

    sinon.stub(client, 'sessionedS3').returns(s3);

    sinon.stub(s3, 'getObject').callsFake(() => {
      const request = dummyAWSRequest<GetObjectRequest>(() => {
        throw new Error('nope');
      });
      asSinonStub(request.createReadStream).callsFake(() => {
        const readStream = fs.createReadStream(tmpfile);
        readStream.on('open', () => {
          readStream.emit('error', new Error('Test'));
        });
        return readStream;
      });
      return request;
    });

    const filename = path.join(tmpdir.path, 'tmpfile.txt');

    await expectToThrow(() =>
      client.initiateDownloadStream(
        {
          bucket: '',
          path: '',
        },
        {},
        filename,
      ),
    );
    assert(asSinonStub(client.deleteMessage).notCalled, 'should not delete sqs message on error');
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
      const request = dummyAWSRequest<GetObjectRequest>(() => {
        throw new Error('nope');
      });
      asSinonStub(request.createReadStream).callsFake(() => {
        const readStream = fs.createReadStream(tmpfile);
        readStream.on('open', () => {
          readStream.emit('error', new Error('Test'));
        });
        return readStream;
      });
      return request;
    });

    const filename = path.join(tmpdir.path, 'tmpfile2.txt');
    const fscWS = fs.createWriteStream; // original, and best
    stubs.push(
      sinon.stub(fs, 'createWriteStream').callsFake((...args) => {
        const writeStream = fscWS(...args);
        writeStream.on('open', () => {
          writeStream.emit('error', new Error('Test'));
        });
        return writeStream;
      }),
    );

    await expectToThrow(() =>
      client.initiateDownloadStream(
        {
          bucket: '',
          path: '',
        },
        {},
        filename,
      ),
    );

    assert(asSinonStub(client.deleteMessage).notCalled, 'should not delete sqs message on error');
    assert.deepEqual(
      client.states.download.success,
      { files: 0, reads: 0, bytes: 0, niceReads: 0, niceSize: 0 },
      'should not count as download success on error',
    );
  });

  it('should handle transfer timeout errors', async () => {
    const client = clientFactory({ downloadTimeout: 1 }); // effectively zero. Zero would result in default value
    const s3 = new AWS.S3();
    sinon.stub(client, 'sessionedS3').callsFake(() => s3);

    sinon.stub(s3, 'getObject').callsFake(() => {
      const request = dummyAWSRequest<GetObjectRequest>(() => {
        throw new Error('nope');
      });
      asSinonStub(request.createReadStream).callsFake(() => {
        fs.writeFileSync(tmpfile, new Array(1e5).join('aaa'));
        const readStream = fs.createReadStream(tmpfile);
        // Writing random data to file so that the timeout fails before the readstream is done
        //          clock.tick(2000 * client.config.options.downloadTimeout); // should cause transferTimeout to fire
        readStream.on('open', () => {
          // defer error emission
          readStream.emit('error', new Error('fake timeout'));
        });
        return readStream;
      });
      return request;
    });

    const filename = path.join(tmpdir.path, 'tmpfile.txt');

    await expectToThrow(() =>
      client.initiateDownloadStream(
        {
          bucket: '',
          path: '',
        },
        {},
        filename,
      ),
    );

    assert(asSinonStub(client.deleteMessage).notCalled, 'should not delete sqs message on error');
    assert.equal(client.states.download.success.files, 0, 'should not count as download success on error');
  });
});

describe('epi2me-api.processMessage', () => {
  const clientFactory = (opts = {}) => {
    const client = new EPI2ME({
      url: 'https://epi2me-test.local',
      log: {
        debug: sinon.stub(),
        info: sinon.stub(),
        warn: sinon.stub(),
        error: sinon.stub(),
        critical: sinon.stub(),
      },
      ...opts,
    });
    sinon.stub(client, 'getSocket').returns({
      emit: sinon.stub(),
      watch: sinon.stub(),
      destroy: sinon.stub(),
    } as unknown as Socket);
    return client;
  };

  let stubs: SinonStub[];
  beforeEach(() => {
    stubs = [sinon.stub(fs.promises, 'mkdir')];
  });

  afterEach(() => {
    stubs.forEach((s) => {
      s.restore();
    });
  });

  it('should handle bad message json', (done) => {
    const client = clientFactory({
      downloadMode: 'telemetry',
    });
    client.telemetryLogStream = fs.createWriteStream('/dev/null');

    const stub = sinon.stub(client, 'deleteMessage').resolves();
    const msg = {
      Body: '{message: body}',
      ReceiptHandle: '',
    };

    client.processMessage(msg);

    sinon.assert.calledWith(stub, msg);
    assert(asSinonStub(client.log.error).calledOnce);
    stub.restore();
    done();
  });

  it('should parse message json', (done) => {
    const client = clientFactory({
      downloadMode: 'telemetry',
    });
    client.telemetryLogStream = fs.createWriteStream('/dev/null');

    sinon.stub(client, 'sessionedS3').rejects(new Error('error message'));

    assert.doesNotThrow(() => {
      client.processMessage({
        Body: '{"message": "body"}',
      });
    });
    assert(asSinonStub(client.log.warn).calledOnce); // No path
    done();
  });

  it('should not double-prepend drive letters MC-6850', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true });
    const client = clientFactory({
      filter: 'on',
      downloadMode: 'data+telemetry',
      outputFolder: tmpDir.name,
    });
    client.telemetryLogStream = fs.createWriteStream('/dev/null');

    // MC-7519: Multiple instances running means multiple outputs need to be namespaced by id_workflow_instance
    // processMessage should be called for running instances so there should be an id_workflow_instance
    client.config.instance.id_workflow_instance = '1234567';

    const s3 = new AWS.S3();

    sinon.stub(client, 'sessionedS3').resolves(s3);
    const initiateDownloadStream = sinon.stub(client, 'initiateDownloadStream').resolves();
    sinon.stub(client, 'deleteMessage').resolves();

    await client.processMessage({
      Body: JSON.stringify({
        bucket: 'epi2test',
        path: 'OUTPUT-UUID/INPUT-UUID/9999/999999/component-2/OK/pass/CLASSIFIED/fastq_runid_shasum_15.fastq/fastq_runid_shasum_15.fastq',
        telemetry: {
          hints: {
            folder: 'OK/pass/CLASSIFIED',
          },
        },
      }),
    });

    assert.strictEqual(
      initiateDownloadStream.args[0][2],
      path.join(tmpDir.name, '1234567/OK/PASS/CLASSIFIED/fastq_runid_shasum_15.fastq'),
    );
    tmpDir.removeCallback();
  });

  it('should retain output folder when no telemetry', async () => {
    const tmpDir = tmp.dirSync({ unsafeCleanup: true });
    const client = clientFactory({
      filter: 'on',
      downloadMode: 'data+telemetry',
      outputFolder: tmpDir.name,
    });
    client.telemetryLogStream = fs.createWriteStream('/dev/null');
    // MC-7519: Multiple instances running means multiple outputs need to be namespaced by id_workflow_instance
    // processMessage should be called for running instances so there should be an id_workflow_instance
    client.config.instance.id_workflow_instance = '1234567';

    const s3 = new AWS.S3();
    sinon.stub(client, 'sessionedS3').resolves(s3);
    const initiateDownloadStream = sinon.stub(client, 'initiateDownloadStream').resolves();
    sinon.stub(client, 'deleteMessage').resolves();

    await client.processMessage({
      Body: JSON.stringify({
        bucket: '',
        path: 'OUTPUT-UUID/INPUT-UUID/9999/999999/component-2/OK/pass/CLASSIFIED/fastq_runid_shasum_15.fastq/fastq_runid_shasum_15.fastq',
      }),
    });

    assert.strictEqual(
      initiateDownloadStream.args[0][2],
      path.join(tmpDir.name, '1234567', 'fastq_runid_shasum_15.fastq'),
    );
    tmpDir.removeCallback();
  });

  // it('should retain output folder when filtering off', async () => {
  //   const tmpDir = tmp.dirSync();
  //   const client = clientFactory({
  //     filter: 'off',
  //     downloadMode: 'data+telemetry',
  //     outputFolder: tmpDir.name,
  //   });
  //   const stub = sinon.stub(client, 'sessionedS3').callsFake(() => 's3 object');

  //   const stub2 = sinon
  //     .stub(client, 'initiateDownloadStream')
  //     .callsFake((s3, messageBody, message, outputFile, completeCb) => {
  //       completeCb();
  //     });

  //   try {
  //     await client.processMessage(
  //       {
  //         Body: JSON.stringify({
  //           path:
  //             'OUTPUT-UUID/INPUT-UUID/9999/999999/component-2/OK/pass/CLASSIFIED/fastq_runid_shasum_15.fastq/fastq_runid_shasum_15.fastq',
  //           telemetry: {
  //             hints: {
  //               folder: 'OK/pass/CLASSIFIED',
  //             },
  //           },
  //         }),
  //       },
  //       () => {},
  //     );
  //   } catch (err) {
  //     assert.fail(err);
  //   }

  //   assert.equal(stub2.args[0][3], path.join(tmpDir.name, 'fastq_runid_shasum_15.fastq'));
  //   tmpDir.removeCallback();
  //   stub.restore();
  //   stub2.restore();
  // });

  it('should correctly process real-world filter folder MC-6850', async () => {
    const tmpDir = tmp.dirSync();
    const client = clientFactory({
      filter: 'on',
      downloadMode: 'data+telemetry',
      outputFolder: tmpDir.name,
    });
    client.telemetryLogStream = fs.createWriteStream('/dev/null');
    // MC-7519: Multiple instances running means multiple outputs need to be namespaced by id_workflow_instance
    // processMessage should be called for running instances so there should be an id_workflow_instance
    client.config.instance.id_workflow_instance = '1234567';

    const s3 = new AWS.S3();
    sinon.stub(client, 'sessionedS3').resolves(s3);
    const initiateDownloadStream = sinon.stub(client, 'initiateDownloadStream').resolves();
    sinon.stub(client, 'deleteMessage').resolves();

    await client.processMessage({
      Body: JSON.stringify({
        key_id: 'a14b0525-cb44-4f5c-8f12-96f858c6f09f',
        bucket: 'eu-west-1-metrichor-live',
        components: {
          0: {
            inputQueueName: '0F95872C-D6D2-11E8-9DBC-0371A22B323C',
          },
          1: {
            command:
              'python /usr/local/bin/fq_homogenizer.py --input_folder %inputfolder --min_qscore %min_qscore --regex *.fastq --detect_barcode %detect_barcode',
            params: {
              detect_barcode: 'Auto',
              user_defined: {},
              min_qscore: '7',
              ports: [
                {
                  port: '*',
                  title: 'End workflow',
                  type: 'output',
                },
                {
                  type: 'output',
                  title: 'Pass',
                  port: 'PASS',
                },
              ],
            },
            fail: '0',
            next: {
              '*': '0',
              PASS: '2',
            },
            wid: 1693,
            inputQueueName: 'iq_homogenizer-3100',
            dockerRegistry: '622693934964.dkr.ecr.eu-west-1.amazonaws.com',
          },
          2: {
            params: {
              output_format: 'fastq.bam',
              reference: 's3://metrichor-prod-biodata-eu-west-1/reference-genomes/10710/ONT/lambda.fasta',
              ports: [
                {
                  type: 'output',
                  title: 'End workflow',
                  port: '*',
                },
                {
                  port: 'PASS',
                  type: 'output',
                  title: 'Pass',
                },
              ],
              cwl: 's3://metrichor-prod-cwl-eu-west-1/bioinformatics-workflows/telemap-workflow/amd64-v1.3.5-release/telemap_map_epi2me_directive.yml',
            },
            command:
              'cgd --working_directory /tmp/analysis/%id_worker -o %outputfolder -d %cwl workflow.data.input.path=%input workflow.data.reference.path=%reference workflow.data.min_mq=0 workflow.data.primary_only=true',
            wid: 1647,
            inputQueueName: 'iq_telemap-135',
            next: {
              '*': '0',
            },
            fail: '0',
            dockerRegistry: '622693934964.dkr.ecr.eu-west-1.amazonaws.com',
          },
        },
        id_workflow_instance: '182103',
        targetComponentId: '0',
        path: '0F95872C-D6D2-11E8-9DBC-0371A22B323C/2185/182103/component-2/PASS/fastq_runid_738d663ef9214e590fb4806bf5aed784b941fd48_1.fastq/fastq_runid_738d663ef9214e590fb4806bf5aed784b941fd48_1.fastq.bam',
        telemetry: {
          filename: 'fastq_runid_738d663ef9214e590fb4806bf5aed784b941fd48_1.fastq.bam',
          id_workflow_instance: '182103',
          id_workflow: 1647,
          component_id: '2',
          params: {
            output_format: 'fastq.bam',
            reference: 's3://metrichor-prod-biodata-eu-west-1/reference-genomes/10710/ONT/lambda.fasta',
            ports: [
              {
                type: 'output',
                title: 'End workflow',
                port: '*',
              },
              {
                port: 'PASS',
                type: 'output',
                title: 'Pass',
              },
            ],
            cwl: 's3://metrichor-prod-cwl-eu-west-1/bioinformatics-workflows/telemap-workflow/amd64-v1.3.5-release/telemap_map_epi2me_directive.yml',
          },
          version: '2.55.6',
          itype: 'r3.8xlarge',
          ec2_instance: 'i-09d960a7e4b2d2411',
          message_id: '0c25e648-d239-44d4-9a93-18b30118889e',
          filesize: 28383807,
          timings: {
            t_wrkr_dn: '2018-10-23T15:00:00.272Z',
            t_wrkr_dl: '2018-10-23T15:00:01.062Z',
            t_wrkr_an: '2018-10-23T15:00:31.773Z',
            t_wrkr_ul: '2018-10-23T15:00:34.356Z',
          },
          id_master: '1694',
          message: 'upload ok',
          hints: {
            folder: 'pass',
          },
          batch_summary: {
            NA: {
              reads_num: 3842,
              exit_status: {
                'Workflow successful': 3655,
                'No alignment found': 187,
              },
              seqlen: 21252771,
              run_ids: {
                '738d663ef9214e590fb4806bf5aed784b941fd48': 3842,
              },
            },
            seqlen: 21252771,
            reads_num: 3842,
          },
          data_files: [
            '0F95872C-D6D2-11E8-9DBC-0371A22B323C/2185/182103/component-2/PASS/fastq_runid_738d663ef9214e590fb4806bf5aed784b941fd48_1.fastq.data.json',
          ],
          src_prefix:
            '0F95872C-D6D2-11E8-9DBC-0371A22B323C/2185/182103/component-1/PASS/fastq_runid_738d663ef9214e590fb4806bf5aed784b941fd48_1.fastq/',
          tgt_prefix: '0F95872C-D6D2-11E8-9DBC-0371A22B323C/2185/182103/component-2/PASS/',
          id_user: '2185',
        },
        id_master: '1694',
      }),
    });

    assert.strictEqual(
      initiateDownloadStream.args[0][2],
      path.join(tmpDir.name, '1234567/PASS/fastq_runid_738d663ef9214e590fb4806bf5aed784b941fd48_1.fastq.bam'),
      'initiateDownloadStream argument',
    );
    assert.strictEqual(
      asSinonStub(fs.promises.mkdir).args[0][0],
      path.join(tmpDir.name, '1234567', 'PASS'),
      'mkdirpSync argument',
    );
    tmpDir.removeCallback();
  });
});

describe('epi2me.queueLength', () => {
  let client: EPI2ME;

  const queueUrl = 'queueUrl';

  beforeEach(() => {
    client = new EPI2ME({
      log: {
        warn: sinon.stub(),
        error: sinon.stub(),
        debug: sinon.stub(),
        info: sinon.stub(),
        critical: sinon.stub(),
      },
    });
  });

  it('should return sqs queue', async () => {
    const sqs = new AWS.SQS();
    sinon.stub(client, 'sessionedSQS').callsFake(() => sqs);
    sinon.stub(sqs, 'getQueueAttributes').callsFake(() =>
      dummyAWSRequest(() =>
        Promise.resolve({
          Attributes: {
            ApproximateNumberOfMessages: '10',
          },
        }),
      ),
    );

    const len = await client.queueLength(queueUrl);
    assert.equal(len, 10, 'expected length');
  });

  it('should handle poor response', async () => {
    const sqs = new AWS.SQS();
    sinon.stub(client, 'sessionedSQS').callsFake(() => sqs);
    sinon
      .stub(sqs, 'getQueueAttributes')
      .callsFake(() => dummyAWSRequest(() => Promise.resolve({ Attributes: undefined })));

    await expectToThrow(() => client.queueLength(queueUrl), 'error in getQueueAttributes');
  });

  it('should handle sessionedSQS errors', async () => {
    const sqs = new AWS.SQS();
    sinon.stub(client, 'sessionedSQS').returns(sqs);
    sinon
      .stub(sqs, 'getQueueAttributes')
      .callsFake(() => dummyAWSRequest(() => Promise.reject('getQueueAttributes dummy error')));

    await expectToThrow(() => client.queueLength(queueUrl), 'error in getQueueAttributes');
  });
});

describe('epi2me.receiveMessages', () => {
  let client: EPI2ME;
  let clock: sinon.SinonFakeTimers;

  beforeEach(() => {
    client = new EPI2ME({
      log: {
        info: sinon.stub(),
        warn: sinon.stub(),
        error: sinon.stub(),
        debug: sinon.stub(),
        critical: sinon.stub(),
      },
    });
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });

  it('should ignore empty message', async () => {
    await client.receiveMessages();

    assert.equal(asSinonStub(client.log.info).lastCall.args, 'complete (empty)');
  });

  it('should queue and process download messages using downloadWorkerPool', async () => {
    sinon.stub(client, 'processMessage').callsFake(() => sleep(Duration.ZERO));

    void client.receiveMessages({
      Messages: [
        {
          MessageId: '1',
        },
        {
          MessageId: '2',
        },
        {
          MessageId: '3',
        },
        {
          MessageId: '4',
        },
      ],
    }); // no awaiting here so we can resolve promises with a clock tick

    assert.equal(Object.keys(client.downloadWorkerPool ?? {}).length, 4, 'pending message count');

    clock.tick(10);

    await Promise.all(Object.values(client.downloadWorkerPool ?? {}));

    assert.equal(Object.keys(client.downloadWorkerPool ?? {}).length, 0, 'processed message count');
    assert.equal((client.processMessage as SinonStub).callCount, 4, 'processMessage invocation count');
  });
});

describe('epi2me.sessionedS3', () => {
  it('should session', () => {
    const client = new EPI2ME({});
    assert.doesNotThrow(() => {
      const s3 = client.sessionedS3();
      assert.ok(s3 instanceof AWS.S3);
    });
  });
});

describe('epi2me.sessionedSQS', () => {
  it('should session', () => {
    const client = new EPI2ME({});

    assert.doesNotThrow(() => {
      const sqs = client.sessionedSQS();
      assert.ok(sqs instanceof AWS.SQS);
    });
  });
});

describe('epi2me.stopEverything', () => {
  let clock: sinon.SinonFakeTimers;
  const clientFactory = (opts = {}) => {
    const tmpdir = tmp.dirSync().name;
    const client = new EPI2ME({
      inputFolder: tmpdir,
      url: 'https://epi2me-test.local',
      log: {
        debug: sinon.stub(),
        info: sinon.stub(),
        warn: sinon.stub(),
        error: sinon.stub(),
        critical: sinon.stub(),
      },
      ...opts,
    });

    return client;
  };

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });
  afterEach(() => {
    clock.restore();
  });

  it('should clear download interval', async () => {
    const client = clientFactory();
    sinon.stub(client.graphQL, 'stopWorkflow').resolves();
    client.timers.downloadCheckInterval = createInterval(Duration.Milliseconds(100), () => {});

    await client.stopEverything();
    // check downloadCheckInterval is cleared
  });

  it('should clear statecheck interval', async () => {
    const client = clientFactory();
    sinon.stub(client.graphQL, 'stopWorkflow').resolves();
    client.timers.stateCheckInterval = createInterval(Duration.Milliseconds(100), () => {});

    await client.stopEverything();
    // check statecheck is cleared
  });

  it('should clear filecheck interval', async () => {
    const client = clientFactory();
    sinon.stub(client.graphQL, 'stopWorkflow').resolves();

    client.timers.downloadCheckInterval = createInterval(Duration.Milliseconds(100), () => {});
    client.timers.stateCheckInterval = createInterval(Duration.Milliseconds(100), () => {});
    client.timers.fileCheckInterval = createInterval(Duration.Milliseconds(100), () => {});

    await client.stopEverything();

    // check filecheck interval is cleared
  });

  it('should request stopWorkflow without callback', async () => {
    const client = clientFactory({
      id_workflow_instance: 12345,
    });
    const stub1 = sinon.stub(client.graphQL, 'stopWorkflow').resolves();

    await client.stopEverything();

    sinon.assert.calledOnce(stub1); // rest call made
  });
});

// TODO check if we need a test for 8328
// https://jira.oxfordnanolabs.local/browse/MC-8328
