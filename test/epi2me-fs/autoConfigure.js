import assert from 'assert';
import fs from 'fs-extra';
import { merge } from 'lodash';
import path from 'path';
import sinon from 'sinon';
import tmp from 'tmp';
import { EPI2ME_FS as EPI2ME } from '../../src/epi2me-fs';

describe('epi2me.autoConfigure', () => {
  let clock;
  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    clock.restore();
  });

  const clientFactory = (opts) =>
    new EPI2ME(
      merge(
        {
          url: 'https://epi2me-test.local',
          log: {
            debug: sinon.stub(),
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub(),
            critical: sinon.stub(),
          },
        },
        opts,
      ),
    );

  it('should require inputFolder', async () => {
    const tmpDir = tmp.dirSync();
    const client = clientFactory();

    const autoStartCb = sinon.fake();
    const mkdirp = sinon.stub(fs, 'mkdirp').callsFake((folder, cb) => {
      cb();
    });
    const mkdirpSync = sinon.stub(fs, 'mkdirpSync').callsFake();

    let err;
    try {
      await client.autoConfigure({}, autoStartCb);
    } catch (e) {
      err = e;
    }

    assert(String(err).match(/must set inputFolder/));

    mkdirp.restore();
    mkdirpSync.restore();
    tmpDir.removeCallback();
  });

  it('should require outputFolder', async () => {
    const tmpDir = tmp.dirSync();
    const client = clientFactory({
      inputFolder: path.join(tmpDir.name, 'input'),
    });
    await client.setClassConfigREST({});

    const autoStartCb = sinon.fake();
    const mkdirp = sinon.stub(fs, 'mkdirp').callsFake((folder, cb) => {
      cb();
    });
    const mkdirpSync = sinon.stub(fs, 'mkdirpSync').callsFake();

    let err;
    try {
      await client.autoConfigure({}, autoStartCb);
    } catch (e) {
      err = e;
    }
    assert(String(err).match(/must set outputFolder/));
    mkdirp.restore();
    mkdirpSync.restore();
    tmpDir.removeCallback();
  });

  it('should require inputqueue', async () => {
    const tmpDir = tmp.dirSync();
    const client = clientFactory({
      inputFolders: [path.join(tmpDir.name, 'input')],
      outputFolder: path.join(tmpDir.name, 'output'),
    });
    await client.setClassConfigREST({});

    const autoStartCb = sinon.fake();
    const mkdirp = sinon.stub(fs, 'mkdirp').callsFake((folder, cb) => {
      cb();
    });
    const mkdirpSync = sinon.stub(fs, 'mkdirpSync').callsFake();

    let err;
    try {
      await client.autoConfigure({}, autoStartCb);
    } catch (e) {
      err = e;
    }

    assert(String(err).match(/inputQueueName must be set/));
    mkdirp.restore();
    mkdirpSync.restore();
    tmpDir.removeCallback();
  });
  /*
    it("should require outputqueue", () => {
	const tmpDir    = tmp.dirSync();
	let client      = clientFactory({
	    inputFolder:  path.join(tmpDir.name, "input"),
	    outputFolder: path.join(tmpDir.name, "output"),
	});

	let autoStartCb = sinon.fake();
	let mkdirp      = sinon.stub(fs, "mkdirp").callsFake((folder, cb) => { cb(); });
	let mkdirpSync  = sinon.stub(fs, "mkdirpSync").callsFake();
	let createWriteStream = sinon.stub(fs, "createWriteStream").callsFake();

	let stub1 = sinon.stub(client.REST, "workflow_instance").callsFake();
	let stub2 = sinon.stub(client, "session").callsFake();

	assert.throws(() => {
	    client.autoConfigure({
		    inputqueue:  "input_queue",
	    }, autoStartCb);
	}, Error);

	stub1.restore();
	stub2.restore();
	mkdirp.restore();
	mkdirpSync.restore();
	createWriteStream.restore();
	tmpDir.removeCallback();
    });

    it("should autoconfigure", () => {
	const tmpDir    = tmp.dirSync();
	let client      = clientFactory({
	    inputFolder:  path.join(tmpDir.name, "input"),
	    outputFolder: path.join(tmpDir.name, "output"),
	});

	let autoStartCb = sinon.fake();
	let mkdirp      = sinon.stub(fs, "mkdirp").callsFake((folder, cb) => { cb(); });
	let mkdirpSync  = sinon.stub(fs, "mkdirpSync").callsFake();
	let createWriteStream = sinon.stub(fs, "createWriteStream").callsFake();

	let stub1 = sinon.stub(client.REST, "workflow_instance").callsFake();
	let stub2 = sinon.stub(client, "loadUploadFiles").callsFake();
	let stub3 = sinon.stub(client, "session").callsFake((cb) => { cb(); });

	assert.doesNotThrow(() => {
	    client.autoConfigure({
		inputqueue:  "input_queue",
		outputqueue: "output_queue",
		id_user:    1234,
		id_workflow_instance: 56789,
	    }, autoStartCb);
	}, Error, "path cannot join nulls");

	stub1.restore();
	stub2.restore();
	stub3.restore();
	mkdirp.restore();
	mkdirpSync.restore();
	createWriteStream.restore();
	tmpDir.removeCallback();
    });
*/
});
