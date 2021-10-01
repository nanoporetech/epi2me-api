import { expect } from 'chai';
import fs from 'fs-extra';
import path from 'path';
import sinon, { SinonStub } from 'sinon';
import tmp from 'tmp';
import { EPI2ME_FS as EPI2ME } from '../../src/epi2me-fs';
import { EPI2ME_OPTIONS } from '../../src/epi2me-options.type';
import { syncify } from '../../test-helpers/syncify';

describe('epi2me.autoConfigure', () => {
  let clock;
  let tmpDir;

  beforeEach(() => {
    tmpDir = tmp.dirSync();
    clock = sinon.useFakeTimers();
    sinon.stub(fs, 'mkdirp').resolves();
  });

  afterEach(() => {
    clock.restore();
    tmpDir.removeCallback();
    (fs.mkdirp as SinonStub).restore();
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

    const syncResult = await syncify(() => client.autoConfigure({}));
    expect(syncResult).throws('no input folders specified');
  });

  it('should allow dataset instead of inputFolder', async () => {
    const client = clientFactory({
      id_dataset: '1234',
      outputFolder: path.join(tmpDir.name, 'output'),
    });

    const syncResult = await syncify(() => client.autoConfigure({}));
    // this error is our "backstop" that throws
    // when the instance hasn't been set
    expect(syncResult).throws('bucketFolder must be set');
  });

  it('should not allow dataset and inputFolder', async () => {
    const client = clientFactory({
      id_dataset: '1234',
      inputFolder: path.join(tmpDir.name, 'input'),
    });

    const syncResult = await syncify(() => client.autoConfigure({}));
    expect(syncResult).throws('cannot use a dataset and folders as an input');
  });

  it('should require outputFolder', async () => {
    const client = clientFactory({
      inputFolder: path.join(tmpDir.name, 'input'),
    });

    const syncResult = await syncify(() => client.autoConfigure({}));
    expect(syncResult).throws('must set outputFolder');
  });

  it('should require that the instance be set', async () => {
    const client = clientFactory({
      inputFolders: [path.join(tmpDir.name, 'input')],
      outputFolder: path.join(tmpDir.name, 'output'),
    });

    const syncResult = await syncify(() => client.autoConfigure({}));
    // this error is our "backstop" that throws
    // when the instance hasn't been set
    expect(syncResult).throws('bucketFolder must be set');
  });
});
