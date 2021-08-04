import { constructUploadParameters, instantiateFileUpload, processFile, readSettings } from '../../src/fileUploader';
import { EPI2ME_FS as EPI2ME, EPI2ME_FS } from '../../src/epi2me-fs';
import { expect } from 'chai';
import { DB } from '../../src/db';
import { UploadContext, UploadSettings } from '../../src/fileUploader.type';
import { ProgressState, States, SuccessState, UploadState } from '../../src/epi2me-state.type';
import { stub, SinonStub } from 'sinon';
import { FileStat } from '../../src/inputScanner.type';
import path from 'path';
import tmp from 'tmp';
import fs from 'fs';
import { Configuration } from '../../src/Configuration.type';
import { Subject } from 'rxjs';
import { sleep } from '../../src/timers';
import { NoopLogger } from '../../src/Logger';
import { Duration } from '../../src/Duration';

function generateRandomFastQ(readCount: number, perRead: number) {
  /*
    Bytes = readCount * (9 + perRead * 2) + (readCount - 1)
  */
  const reads: string[] = [];

  const ACGTU = 'ACGTU';

  for (let i = 0; i < readCount; i += 1) {
    const data = [];
    const qualities = [];
    for (let j = 0; j < perRead; j += 1) {
      const value = Math.floor(5 * Math.random());
      const quality = Math.floor(93 * Math.random());
      data.push(ACGTU[value]);
      qualities.push(String.fromCharCode(quality + 33));
    }
    reads.push(`@FAKE\n${data.join('')}\n+\n${qualities.join('')}`);
  }

  return reads.join('\n');
}

function uploadContextFactory(settings: Partial<UploadSettings> = {}, state: Partial<UploadState> = {}): UploadContext {
  return {
    settings: {
      maxFiles: Infinity,
      maxFileSize: Infinity,
      requiresStorage: false,
      ...settings,
    },
    hasStopped: false,
    stopped$: new Subject(),
    state: {
      filesCount: 0,
      success: {} as SuccessState, // TODO this is left absent as it's not needed right now, but should be done
      types: {},
      // failure: {},
      niceTypes: '',
      progress: {} as ProgressState, // TODO this is left absent as it's not needed right now, but should be done
      ...state,
    },
    database: {
      log: NoopLogger,
      uploadFile: stub(),
      splitFile: stub(),
      splitDone: stub(),
      splitClean: stub(),
      seenUpload: stub(),
      skipFile: stub(),
    } as unknown as DB,
    warnings: [],
    logger: NoopLogger,
    instance: {
      discoverQueue: stub().resolves(''),
      realtimeFeedback: stub().resolves(),
      sessionedS3: stub().callsFake(() => {
        return {
          upload: stub().callsFake(() => {
            return {
              on: stub(),
              promise: stub(),
            };
          }),
        };
      }),
      sessionedSQS: stub().callsFake(() => {
        return {
          sendMessage: stub().callsFake(() => {
            return {
              promise: stub().returns(Promise.resolve({ MessageId: '0' })),
            };
          }),
        };
      }),
      getS3SessionedService: stub().callsFake(() => {
        return {
          upload: stub().callsFake(() => {
            return {
              on: stub(),
              promise: stub(),
            };
          }),
        };
      }),
      getSQSSessionedService: stub().callsFake(() => {
        return {
          sendMessage: stub().callsFake(() => {
            return {
              promise: stub().returns(Promise.resolve({ MessageId: '0' })),
            };
          }),
        };
      }),
      config: {
        options: {
          fileCheckInterval: Duration.Milliseconds(10), // nice and fast for the tests
          uploadTimeout: Duration.Milliseconds(10), // nice and fast again
        } as Partial<Configuration['options']>,
        instance: {
          bucket: 'bucket ID',
          bucketFolder: '/bucket/folder',
          key_id: 'fake key id',
          chain: {
            components: {
              '100': { inputQueueName: 'uploadMessageQueue' },
              '200': { inputQueueName: 'downloadMessageQueue' },
            },
          },
        } as Partial<Configuration['instance']>,
      } as Partial<Configuration>,
      uploadState: stub(),
      uploadComplete: stub(),
    } as unknown as EPI2ME_FS,
  } as UploadContext;
}

function epi2meInstanceFactory(split_size: number, input: string[], types: string[]): EPI2ME_FS {
  const seenFiles = new Set();

  return {
    log: NoopLogger,
    uploadStopped$: new Subject<boolean>(),
    discoverQueue: stub().resolves(''),
    realtimeFeedback: stub().resolves(),
    sessionedS3: stub().callsFake(() => {
      return {
        upload: stub().callsFake(() => {
          return {
            on: stub(),
            promise: stub(),
          };
        }),
      };
    }),
    sessionedSQS: stub().callsFake(() => {
      return {
        sendMessage: stub().callsFake(() => {
          return {
            promise: stub().resolves({ MessageId: '0' }),
          };
        }),
      };
    }),
    getS3SessionedService: stub().callsFake(() => {
      return {
        upload: stub().callsFake(() => {
          return {
            on: stub(),
            promise: stub(),
          };
        }),
      };
    }),
    getSQSSessionedService: stub().callsFake(() => {
      return {
        sendMessage: stub().callsFake(() => {
          return {
            promise: stub().returns(Promise.resolve({ MessageId: '0' })),
          };
        }),
      };
    }),
    uploadState: stub(),
    uploadComplete: stub(),
    config: {
      workflow: {
        workflowAttributes: {
          split_size,
        },
      },
      options: {
        inputFolders: input,
        filetype: types,
        fileCheckInterval: Duration.Milliseconds(10), // nice and fast for the tests
        uploadTimeout: Duration.Milliseconds(10), // nice and fast again
      } as Partial<Configuration['options']>,
      instance: {
        bucket: 'bucket ID',
        bucketFolder: '/bucket/folder',
        key_id: 'fake key id',
        chain: {
          components: {
            '100': { inputQueueName: 'uploadMessageQueue' },
            '200': { inputQueueName: 'downloadMessageQueue' },
          },
        },
      } as Partial<Configuration['instance']>,
    } as Partial<Configuration>,
    db: {
      log: NoopLogger,
      uploadFile: stub(),
      splitFile: stub(),
      splitDone: stub(),
      splitClean: stub(),
      seenUpload: stub().callsFake((str) => {
        if (seenFiles.has(str)) {
          return true;
        }
        seenFiles.add(str);
        return false;
      }),
      skipFile: stub(),
    } as unknown as DB,
    states: {
      upload: {
        filesCount: 0,
        success: {} as SuccessState, // TODO this is left absent as it's not needed right now, but should be done
        types: {},
        // failure: {},
        niceTypes: '',
        progress: {} as ProgressState, // TODO this is left absent as it's not needed right now, but should be done
      },
      warnings: [],
    } as States,
    uploadJob: stub(),
  } as unknown as EPI2ME_FS;
}

function fileStatFactory(
  values: Partial<FileStat> = {},
  location: { root?: string; relative: string } = {
    root: '/route',
    relative: 'to/a file.example',
  },
): FileStat {
  const name = path.basename(location.relative);
  const absolute = path.join(location.root ?? '/route', location.relative);
  return {
    name,
    path: absolute,
    relative: location.relative,
    size: 0,
    id: 'File_42',
    ...values,
  };
}

function simulatedUpload(
  { retryDelayOptions }: AWS.S3.ClientConfiguration,
  fakeUpload: (attempt: number, progress: Subject<{ loaded: number }>) => void | Promise<void>,
) {
  let retry = 1;
  const progress = new Subject<{ loaded: number }>();
  return () => ({
    on(_, handler) {
      progress.subscribe((p) => handler(p));
    },
    abort: stub(),
    async promise() {
      while (true) {
        try {
          return await fakeUpload(retry, progress);
        } catch (err) {
          const delay = retryDelayOptions.customBackoff(retry, err);
          if (delay < 0) {
            throw err;
          }
          await sleep(Duration.Milliseconds(delay));
          retry += 1;
        }
      }
    },
  });
}

describe('file uploader', () => {
  it('requires a workflow', () => {
    const instance = new EPI2ME({});
    expect(() => instantiateFileUpload(instance)).throws('Workflow is not defined');
  });

  it('requires a database', () => {
    const instance = new EPI2ME({});
    instance.config.workflow = {};
    expect(() => instantiateFileUpload(instance)).throws('Database is not defined');
  });

  it('requires a storage account if the workflow needs storage', () => {
    const instance = new EPI2ME({});
    instance.config.workflow = {
      workflowAttributes: {
        requires_storage: true,
      },
    };
    instance.config.instance.bucket = 'bucket ID';
    instance.config.instance.bucketFolder = '/bucket/folder';
    instance.db = {} as DB; // WARN this assumes the test will not continue past the expected error
    expect(() => instantiateFileUpload(instance)).throws(
      'Workflow requires storage enabled. Please provide a valid storage account',
    );
  });

  it('generates a warning if the scanner encounters a FS error', async () => {
    const dir = tmp.dirSync().name;
    const instance = epi2meInstanceFactory(100, [path.join(dir, 'missing_folder')], ['fastq', 'fasta']);

    const stop$ = instance.uploadStopped$ as Subject<boolean>;
    const stop = () => {
      stop$.next(true);
      stop$.complete();
    };

    // ensure we try to stop even after a failure
    after(stop);

    const uploader = await instantiateFileUpload(instance);
    const didComplete = uploader();

    await sleep(Duration.Milliseconds(1));

    stop();
    await didComplete;

    const { warnings } = instance.states;
    expect(warnings.filter(({ type }) => type === 'WARNING_SCAN_FAIL').length, 'File scan warnings').to.equals(1);
  });

  it('generates a warning when upload fails', async () => {
    const dir = tmp.dirSync().name;
    const instance = epi2meInstanceFactory(100, [dir], ['fastq', 'fasta']);

    const addFile = async (name, reads) => {
      const data = generateRandomFastQ(reads, 30);
      const location = path.join(dir, name);
      await fs.promises.writeFile(location, data);
    };

    (instance.sessionedS3 as SinonStub).callsFake((conf: AWS.S3.ClientConfiguration) => {
      return {
        upload: simulatedUpload(conf, () => {
          throw new Error('Simulated upload failure');
        }),
      };
    });
    instance.config.options.uploadRetries = 0;

    const stop$ = instance.uploadStopped$ as Subject<boolean>;
    const stop = () => {
      stop$.next(true);
      stop$.complete();
    };

    // ensure we try to stop even after a failure
    after(stop);

    addFile('reference.fasta', 10);
    addFile('another.fq', 1);

    const uploader = await instantiateFileUpload(instance);
    const didComplete = uploader();

    await sleep(Duration.Milliseconds(10));

    stop();
    await didComplete;

    const { warnings } = instance.states;
    expect(
      warnings.filter(({ type }) => type === 'WARNING_FILE_UPLOAD_FAILED').length,
      'File upload failure warnings',
    ).to.equals(2);
    expect(
      warnings.filter(({ type }) => type === 'WARNING_FILE_UPLOAD_RETRIES_EXCEEDED').length,
      'File upload retry warnings',
    ).to.equals(2);
  });

  it('handles cancellation during upload retry', async () => {
    const dir = tmp.dirSync().name;
    const instance = epi2meInstanceFactory(100, [dir], ['fastq', 'fasta']);

    const addFile = async (name, reads) => {
      const data = generateRandomFastQ(reads, 30);
      const location = path.join(dir, name);
      await fs.promises.writeFile(location, data);
    };

    (instance.sessionedS3 as SinonStub).callsFake((conf: AWS.S3.ClientConfiguration) => {
      return {
        upload: simulatedUpload(conf, async (attempt) => {
          // fail the first attempt, succeed after that
          if (attempt > 1) {
            return;
          }
          // delay then throw... bit like a network timeout
          await sleep(Duration.Milliseconds(100));
          throw new Error('Simulated upload failure');
        }),
      };
    });

    const stop$ = instance.uploadStopped$ as Subject<boolean>;
    const stop = () => {
      stop$.next(true);
      stop$.complete();
    };

    // ensure we try to stop even after a failure
    after(stop);

    addFile('reference.fasta', 10);

    const uploader = await instantiateFileUpload(instance);
    const didComplete = uploader();
    const { warnings } = instance.states;

    await sleep(Duration.Milliseconds(5));
    // shouldn't have failed yet, check the warnings then stop it while the upload is pending
    expect(warnings.length).to.equals(0);

    stop();
    await didComplete;
    // should have exited cleanly and created a warning for the failed upload
    expect(
      warnings.filter(({ type }) => type === 'WARNING_FILE_UPLOAD_FAILED').length,
      'File upload failure warnings',
    ).to.equals(1);
  }).timeout(5000); // increase the timeout for this one, limited by the retry interval timer

  it('will retry an upload', async () => {
    const dir = tmp.dirSync().name;
    const instance = epi2meInstanceFactory(100, [dir], ['fastq', 'fasta']);

    const addFile = async (name, reads) => {
      const data = generateRandomFastQ(reads, 30);
      const location = path.join(dir, name);
      await fs.promises.writeFile(location, data);
    };

    (instance.sessionedS3 as SinonStub).callsFake((conf: AWS.S3.ClientConfiguration) => {
      return {
        upload: simulatedUpload(conf, async (attempt) => {
          // fail the first attempt, succeed after that
          if (attempt > 1) {
            return;
          }
          throw new Error('Simulated upload failure');
        }),
      };
    });

    const stop$ = instance.uploadStopped$ as Subject<boolean>;
    const stop = () => {
      stop$.next(true);
      stop$.complete();
    };

    // ensure we try to stop even after a failure
    after(stop);

    addFile('reference.fasta', 10);

    const uploader = await instantiateFileUpload(instance);
    const didComplete = uploader();
    const { warnings } = instance.states;
    // fake timers can probably speed this up
    await sleep(Duration.Seconds(2.1));
    // shouldn't have failed yet, check the warnings then stop it while the upload is pending
    expect(
      warnings.filter(({ type }) => type === 'WARNING_FILE_UPLOAD_FAILED').length,
      'File upload failure warnings',
    ).to.equals(1);

    stop();
    await didComplete;
    // should have exited cleanly and created a warning for the failed upload
    expect(warnings.length).to.equals(1);
    // 1 file should have uploaded
    expect(instance.states.upload.filesCount).to.equals(1);
  }).timeout(5000);

  it('generates progress events', async () => {
    const dir = tmp.dirSync().name;
    const instance = epi2meInstanceFactory(100, [dir], ['thing']);

    let fileSize = 0;
    const addFile = async (name, reads) => {
      const data = generateRandomFastQ(reads, 30);
      const location = path.join(dir, name);
      fileSize = data.length; // assumes utf-8
      await fs.promises.writeFile(location, data);
    };

    const progress = new Subject();
    (instance.sessionedS3 as SinonStub).callsFake(() => ({
      upload() {
        return {
          on(_, handler) {
            progress.subscribe((p) => handler(p));
          },
          abort: stub(),
          promise: stub().callsFake(async () => {
            for (let i = 1; i < 6; i += 1) {
              progress.next({ loaded: i });
            }
          }),
        };
      },
    }));

    const stop$ = instance.uploadStopped$ as Subject<boolean>;
    const stop = () => {
      stop$.next(true);
      stop$.complete();
    };

    // ensure we try to stop even after a failure
    after(stop);

    await addFile('reference.thing', 10);

    const uploader = await instantiateFileUpload(instance);
    const didComplete = uploader();
    const { warnings } = instance.states;

    await sleep(Duration.Milliseconds(5));
    stop();
    await didComplete;

    expect(warnings.length).to.equals(0);
    const calls = (instance.uploadState as SinonStub).getCalls().map((c) => c.args);

    expect(calls[0], 'instance.uploadState call 1').to.deep.equals([
      'progress',
      'incr',
      {
        total: fileSize,
      },
    ]);

    for (let i = 1; i < 6; i += 1) {
      expect(calls[i], 'instance.uploadState call ' + (i + 1)).to.deep.equals([
        'progress',
        'incr',
        {
          bytes: 1,
        },
      ]);
    }

    expect(calls[6], 'instance.uploadState call 7').to.deep.equals([
      'progress',
      'decr',
      {
        total: fileSize,
        bytes: 5,
      },
    ]);

    expect(calls[7], 'instance.uploadState call 8').to.deep.equals([
      'success',
      'incr',
      {
        files: 1,
        bytes: fileSize,
        reads: 0,
        sequences: 0,
      },
    ]);

    expect(calls[8], 'instance.uploadState call 9').to.deep.equals([
      'types',
      'incr',
      {
        '.thing': 1,
      },
    ]);
  });

  it('correctly resets progress after an error', async () => {
    const dir = tmp.dirSync().name;
    const instance = epi2meInstanceFactory(100, [dir], ['thing']);

    let fileSize = 0;
    const addFile = async (name, reads) => {
      const data = generateRandomFastQ(reads, 30);
      const location = path.join(dir, name);
      fileSize = data.length; // assumes utf-8
      await fs.promises.writeFile(location, data);
    };

    (instance.sessionedS3 as SinonStub).callsFake((conf: AWS.S3.ClientConfiguration) => {
      return {
        upload: simulatedUpload(conf, async (_, progress) => {
          progress.next({ loaded: fileSize * 0.2 });
          progress.next({ loaded: fileSize * 0.6 });
          await sleep(Duration.Milliseconds(5));
          throw new Error('simulated failure');
        }),
      };
    });

    instance.config.options.uploadRetries = 0;

    const stop$ = instance.uploadStopped$ as Subject<boolean>;
    const stop = () => {
      stop$.next(true);
      stop$.complete();
    };

    // ensure we try to stop even after a failure
    after(stop);

    await addFile('reference.thing', 10);

    const uploader = await instantiateFileUpload(instance);
    const didComplete = uploader();
    const { warnings } = instance.states;

    await sleep(Duration.Milliseconds(5));
    stop();
    await didComplete;

    expect(warnings).to.deep.include({
      msg: 'Uploading reference.thing failed.',
      type: 'WARNING_FILE_UPLOAD_FAILED',
    });
    expect(warnings).to.deep.include({
      msg: 'Exceeded maximum retries uploading reference.thing. This file will not be uploaded.',
      type: 'WARNING_FILE_UPLOAD_RETRIES_EXCEEDED',
    });

    const calls = (instance.uploadState as SinonStub).getCalls().map((c) => c.args);

    expect(calls[0], 'instance.uploadState call 1').to.deep.equals([
      'progress',
      'incr',
      {
        total: fileSize,
      },
    ]);

    expect(calls[1], 'instance.uploadState call 2').to.deep.equals([
      'progress',
      'incr',
      {
        bytes: 0.2 * fileSize,
      },
    ]);

    expect(calls[2][0]).to.equals('progress');
    expect(calls[2][1]).to.equals('incr');
    expect(calls[2][2].bytes).to.closeTo(0.4 * fileSize, 0.0001);

    expect(calls[3][0]).to.equals('progress');
    expect(calls[3][1]).to.equals('decr');
    expect(calls[3][2].bytes).to.closeTo(0.6 * fileSize, 0.0001);
    expect(calls[3][2].total).to.equals(fileSize);
  });

  it('handles malformed workflow chains', async () => {
    const dir = tmp.dirSync().name;
    const instance = epi2meInstanceFactory(100, [dir], ['fastq', 'fasta']);

    instance.config.instance.chain = { WRONG: [] };
    instance.config.options.uploadRetries = 0;

    const addFile = async (name, reads) => {
      const data = generateRandomFastQ(reads, 30);
      const location = path.join(dir, name);
      await fs.promises.writeFile(location, data);
    };

    const stop$ = instance.uploadStopped$ as Subject<boolean>;
    const stop = () => {
      stop$.next(true);
      stop$.complete();
    };

    // ensure we try to stop even after a failure
    after(stop);

    await addFile('reference.fasta', 10);

    const uploader = await instantiateFileUpload(instance);

    const didComplete = uploader();

    await sleep(Duration.Milliseconds(5));

    stop();
    await didComplete;

    expect(instance.states.upload.failure).to.deep.equal({
      'Error: Unexpected chain definition': 1,
    });
  });

  describe('read settings', () => {
    it('provides sensible defaults', () => {
      expect(
        readSettings({
          workflow: {},
          instance: {
            bucket: 'bucket ID',
            bucketFolder: '/bucket/folder',
          },
          options: {
            uploadRetries: 5,
          },
        }),
      ).to.deep.equal({
        maxFiles: Infinity,
        maxFileSize: Infinity,
        requiresStorage: false,
        bucket: 'bucket ID',
        bucketFolder: '/bucket/folder',
        sseKeyId: undefined,
        retries: 5,
      });
    });

    it('accepts workflowAttributes', () => {
      expect(
        readSettings({
          workflow: {
            workflowAttributes: {
              requires_storage: true,
              max_size: '42',
              max_files: '314',
            },
          },
          instance: {
            bucket: 'bucket ID',
            bucketFolder: '/bucket/folder',
          },
          options: {
            uploadRetries: 5,
          },
        }),
      ).to.deep.equal({
        maxFiles: 314,
        maxFileSize: 42,
        requiresStorage: true,
        bucket: 'bucket ID',
        bucketFolder: '/bucket/folder',
        sseKeyId: undefined,
        retries: 5,
      });

      expect(
        readSettings({
          workflow: {
            workflowAttributes: {
              split_size: 42,
            },
          },
          instance: {
            bucket: 'bucket ID',
            bucketFolder: '/bucket/folder',
          },
          options: {
            uploadRetries: 5,
          },
        }),
      ).to.deep.include({
        split: {
          maxChunkBytes: 42,
        },
      });

      expect(
        readSettings({
          workflow: {
            workflowAttributes: {
              split_reads: 11,
            },
          },
          instance: {
            bucket: 'bucket ID',
            bucketFolder: '/bucket/folder',
          },
          options: {
            uploadRetries: 5,
          },
        }),
      ).to.deep.include({
        split: {
          maxChunkReads: 11,
        },
      });

      expect(
        readSettings({
          workflow: {
            workflowAttributes: {
              split_reads: 8,
              split_size: 60,
            },
          },
          instance: {
            bucket: 'bucket ID',
            bucketFolder: '/bucket/folder',
          },
          options: {
            uploadRetries: 5,
          },
        }),
      ).to.deep.include({
        split: {
          maxChunkReads: 8,
          maxChunkBytes: 60,
        },
      });
    });

    it('accepts workflow_attributes', () => {
      expect(
        readSettings({
          workflow: {
            workflow_attributes: {
              requires_storage: true,
              max_size: '42',
              max_files: '314',
            },
          },
          instance: {
            bucket: 'bucket ID',
            bucketFolder: '/bucket/folder',
          },
          options: {
            uploadRetries: 5,
          },
        }),
      ).to.deep.equal({
        maxFiles: 314,
        maxFileSize: 42,
        requiresStorage: true,
        retries: 5,
        bucket: 'bucket ID',
        bucketFolder: '/bucket/folder',
        sseKeyId: undefined,
      });

      expect(
        readSettings({
          workflow: {
            workflow_attributes: {
              split_size: 42,
            },
          },
          instance: {
            bucket: 'bucket ID',
            bucketFolder: '/bucket/folder',
          },
          options: {
            uploadRetries: 5,
          },
        }),
      ).to.deep.include({
        split: {
          maxChunkBytes: 42,
        },
      });

      expect(
        readSettings({
          workflow: {
            workflow_attributes: {
              split_reads: 11,
            },
          },
          instance: {
            bucket: 'bucket ID',
            bucketFolder: '/bucket/folder',
          },
          options: {
            uploadRetries: 5,
          },
        }),
      ).to.deep.include({
        split: {
          maxChunkReads: 11,
        },
      });

      expect(
        readSettings({
          workflow: {
            workflow_attributes: {
              split_reads: 8,
              split_size: 60,
            },
          },
          instance: {
            bucket: 'bucket ID',
            bucketFolder: '/bucket/folder',
          },
          options: {
            uploadRetries: 5,
          },
        }),
      ).to.deep.include({
        split: {
          maxChunkReads: 8,
          maxChunkBytes: 60,
        },
      });
    });

    it('accepts attributes', () => {
      expect(
        readSettings({
          workflow: {
            attributes: {
              'epi2me:category': ['storage'],
              'epi2me:max_size': ['42'],
              'epi2me:max_files': ['314'],
            },
          },
          instance: {
            bucket: 'bucket ID',
            bucketFolder: '/bucket/folder',
          },
          options: {
            uploadRetries: 5,
          },
        }),
      ).to.deep.equal({
        maxFiles: 314,
        maxFileSize: 42,
        requiresStorage: true,
        retries: 5,
        bucket: 'bucket ID',
        bucketFolder: '/bucket/folder',
        sseKeyId: undefined,
      });

      expect(
        readSettings({
          workflow: {
            attributes: {
              'epi2me:split_size': [42],
            },
          },
          instance: {
            bucket: 'bucket ID',
            bucketFolder: '/bucket/folder',
          },
          options: {
            uploadRetries: 5,
          },
        }),
      ).to.deep.include({
        split: {
          maxChunkBytes: 42,
        },
      });

      expect(
        readSettings({
          workflow: {
            attributes: {
              'epi2me:split_reads': [11],
            },
          },
          instance: {
            bucket: 'bucket ID',
            bucketFolder: '/bucket/folder',
          },
          options: {
            uploadRetries: 5,
          },
        }),
      ).to.deep.include({
        split: {
          maxChunkReads: 11,
        },
      });

      expect(
        readSettings({
          workflow: {
            attributes: {
              'epi2me:split_reads': [8],
              'epi2me:split_size': [60],
            },
          },
          instance: {
            bucket: 'bucket ID',
            bucketFolder: '/bucket/folder',
          },
          options: {
            uploadRetries: 5,
          },
        }),
      ).to.deep.include({
        split: {
          maxChunkReads: 8,
          maxChunkBytes: 60,
        },
      });
    });
  });

  describe('process file', () => {
    it('skips if there are too many files', async () => {
      const ctx = uploadContextFactory({ maxFiles: 10 }, { filesCount: 10 });
      await processFile(ctx, fileStatFactory({ relative: 'my/file.eg' }));
      expect(ctx.warnings).to.deep.include({
        type: 'WARNING_FILE_TOO_MANY',
        msg: `Maximum 10 file(s) already uploaded. Marking my/file.eg as skipped.`,
      });
      expect((ctx.database.skipFile as SinonStub).callCount).to.equal(1);
    });

    it('skips if the file is empty', async () => {
      const ctx = uploadContextFactory();
      await processFile(ctx, fileStatFactory({ size: 0, relative: 'my/file.eg' }));
      expect(ctx.warnings).to.deep.include({
        type: 'WARNING_FILE_EMPTY',
        msg: `The file my/file.eg is empty. It will be skipped.`,
      });
      expect((ctx.database.skipFile as SinonStub).callCount).to.equal(1);
    });

    it('skips if the file is empty', async () => {
      const ctx = uploadContextFactory({ maxFileSize: 1024 });
      await processFile(ctx, fileStatFactory({ size: 2000, relative: 'my/file.eg' }));
      expect(ctx.warnings).to.deep.include({
        type: 'WARNING_FILE_TOO_BIG',
        msg: `The file my/file.eg is bigger than the maximum size limit (1.0KB). It will be skipped.`,
      });
      expect((ctx.database.skipFile as SinonStub).callCount).to.equal(1);
    });

    it('does not split non fastq files', async () => {
      const ctx = uploadContextFactory({
        split: { maxChunkReads: 1 }, // this ensures fastq files are always split
      });
      const dir = tmp.dirSync().name;
      const tmpfile = path.join(dir, 'file.fasta');
      await fs.promises.writeFile(tmpfile, '');
      await processFile(ctx, fileStatFactory({ size: 2000 }, { root: dir, relative: 'file.fasta' }));
      expect((ctx.instance.sessionedS3 as SinonStub).callCount).to.equals(1);
      expect(ctx.state.filesCount).to.equals(1);
    });

    it("splits a fastq file if it's over maxFileSize", async () => {
      const ctx = uploadContextFactory({
        split: { maxChunkBytes: 100 }, // this ensures fastq files are always split
      });
      const dir = tmp.dirSync().name;
      const tmpfile = path.join(dir, 'file.fastq');
      const data = generateRandomFastQ(10, 30);
      await fs.promises.writeFile(tmpfile, data);
      await processFile(ctx, fileStatFactory({ size: data.length }, { root: dir, relative: 'file.fastq' }));
      // NOTE we expect the splitter to create 5 chunks for our 1 input file, therefore triggering 5 uploads
      expect((ctx.instance.sessionedS3 as SinonStub).callCount, 'Uploads jobs').to.equals(5);
      // but it only counts as 1 file as far as the user is concerned
      expect(ctx.state.filesCount, 'File count').to.equals(1);
      // generates 1 split warning per file ( not per chunk )
      expect(ctx.warnings.filter(({ type }) => type === 'WARNING_FILE_SPLIT').length, 'File split warnings').to.equals(
        1,
      );
    });

    it("does not split a fastq file if it's under maxFileSize", async () => {
      const ctx = uploadContextFactory({
        split: { maxChunkBytes: 1000 }, // this ensures fastq files are always split
      });
      const dir = tmp.dirSync().name;
      const tmpfile = path.join(dir, 'file.fastq');
      const data = generateRandomFastQ(10, 30);
      await fs.promises.writeFile(tmpfile, data);
      await processFile(ctx, fileStatFactory({ size: data.length }, { root: dir, relative: 'file.fastq' }));
      // NOTE this should not split so we will see
      // 1 upload job, 1 file and 0 split warnings
      expect((ctx.instance.sessionedS3 as SinonStub).callCount, 'Uploads jobs').to.equals(1);
      expect(ctx.state.filesCount, 'File count').to.equals(1);
      expect(ctx.warnings.filter(({ type }) => type === 'WARNING_FILE_SPLIT').length, 'File split warnings').to.equals(
        0,
      );
    });

    it('splits any fastq file is maxChunkReads is specified', async () => {
      const ctx = uploadContextFactory({
        split: { maxChunkReads: 1000 }, // this ensures fastq files are always split
      });
      const dir = tmp.dirSync().name;
      const tmpfile = path.join(dir, 'file.fastq');
      const data = generateRandomFastQ(10, 30);
      await fs.promises.writeFile(tmpfile, data);
      await processFile(ctx, fileStatFactory({ size: data.length }, { root: dir, relative: 'file.fastq' }));
      // NOTE we expect this to "split" but as a single file
      // so we will see 1 upload job, 1 file and 1 split warning
      expect((ctx.instance.sessionedS3 as SinonStub).callCount, 'Uploads jobs').to.equals(1);
      expect(ctx.state.filesCount, 'File count').to.equals(1);
      expect(ctx.warnings.filter(({ type }) => type === 'WARNING_FILE_SPLIT').length, 'File split warnings').to.equals(
        1,
      );
    });
  });

  describe('constructUploadParameters', () => {
    it('processes a plain fastq file correctly', () => {
      expect(
        constructUploadParameters(
          uploadContextFactory({
            bucket: 'a bucket',
            bucketFolder: '0000-0000-1111',
          }),
          {
            name: 'example.fastq',
            path: '/source/example.fastq',
            relative: 'example.fastq',
            size: 42,
            id: 'FILE_1',
          },
          undefined,
        ),
      ).to.deep.equal({
        Bucket: 'a bucket',
        Key: `0000-0000-1111/component-0/FILE_1.fastq/FILE_1.fastq`,
        Body: undefined,
        ContentLength: 42,
      });
    });

    it('deals with gzipped fastq files', () => {
      expect(
        constructUploadParameters(
          uploadContextFactory({
            bucket: 'bucket ID',
            bucketFolder: '/bucket/folder',
          }),
          {
            name: 'example.fastq.gz',
            path: '/source/experiment/pass/example.fastq.gz',
            relative: 'pass/example.fastq.gz',
            size: 4096,
            id: 'FILE_2',
          },
          undefined,
        ),
      ).to.deep.equal({
        Bucket: 'bucket ID',
        Key: `/bucket/folder/component-0/FILE_2.fastq.gz/FILE_2.fastq.gz`,
        Body: undefined,
        ContentLength: 4096,
      });
    });

    it('encodes sse key', () => {
      expect(
        constructUploadParameters(
          uploadContextFactory({
            bucket: 'bucket ID',
            bucketFolder: '/bucket/folder',
            sseKeyId: 'secret sauce',
          }),
          {
            name: 'example.fastq.gz',
            path: '/source/experiment/pass/example.fastq.gz',
            relative: 'pass/example.fastq.gz',
            size: 4096,
            id: 'FILE_2',
          },
          undefined,
        ),
      ).to.deep.equal({
        Bucket: 'bucket ID',
        Key: `/bucket/folder/component-0/FILE_2.fastq.gz/FILE_2.fastq.gz`,
        Body: undefined,
        ContentLength: 4096,
        SSEKMSKeyId: 'secret sauce',
        ServerSideEncryption: 'aws:kms',
      });
    });

    it('normalises fq files', () => {
      expect(
        constructUploadParameters(
          uploadContextFactory({
            bucket: 'bucket ID',
            bucketFolder: '/bucket/folder',
          }),
          {
            name: 'example.fq',
            path: '/source/experiment/pass/example.fq',
            relative: 'pass/example.fq',
            size: 11,
            id: 'FILE_3',
          },
          undefined,
        ),
      ).to.deep.equal({
        Bucket: 'bucket ID',
        Key: `/bucket/folder/component-0/FILE_3.fastq/FILE_3.fastq`,
        Body: undefined,
        ContentLength: 11,
      });
    });
  });

  it('end to end', async () => {
    const dir = tmp.dirSync().name;
    const instance = epi2meInstanceFactory(100, [dir], ['fastq', 'fasta']);

    const addFile = async (name, reads) => {
      const data = generateRandomFastQ(reads, 30);
      const location = path.join(dir, name);
      await fs.promises.writeFile(location, data);
    };

    const stop$ = instance.uploadStopped$ as Subject<boolean>;
    const stop = () => {
      stop$.next(true);
      stop$.complete();
    };

    // ensure we try to stop even after a failure
    after(stop);

    await addFile('reference.fasta', 10);
    await addFile('data.fq', 1);
    await addFile('dummy.zip', 0);

    const uploader = await instantiateFileUpload(instance);

    const didComplete = uploader();

    await sleep(Duration.Milliseconds(50));

    const { warnings, upload } = instance.states;
    expect((instance.sessionedS3 as SinonStub).callCount, 'Uploads jobs').to.equals(2);
    expect(upload.filesCount, 'File count').to.equals(2);
    expect(warnings.filter(({ type }) => type === 'WARNING_FILE_SPLIT').length, 'File split warnings').to.equals(0);

    await addFile('another.fastq', 10);

    await sleep(Duration.Milliseconds(50));

    expect((instance.sessionedS3 as SinonStub).callCount, 'Uploads jobs').to.equals(7);
    expect(upload.filesCount, 'File count').to.equals(3);
    expect(warnings.filter(({ type }) => type === 'WARNING_FILE_SPLIT').length, 'File split warnings').to.equals(1);

    stop();

    await Promise.race([didComplete, sleep(Duration.Seconds(0.5)).then(() => Promise.reject('Loop did not stop'))]);
  });
});
