"use strict";
const assert = require("assert");
const sinon  = require("sinon");
const fs     = require("fs-extra");
const tmp    = require("tmp");
const path   = require("path");

import EPI2ME from "../../lib/epi2me";
import REST from "../../lib/rest";

describe("epi2me", () => {
    describe("autoConfigure", () => {

	it("should require inputFolder", () => {
	    const clock     = sinon.useFakeTimers();
	    const tmpDir    = tmp.dirSync();
	    let client      = new EPI2ME({
	    });

	    let autoStartCb = sinon.fake();
	    let mkdirp      = sinon.stub(fs, "mkdirp").callsFake((folder, cb) => { cb(); });
	    let mkdirpSync  = sinon.stub(fs, "mkdirpSync").callsFake();

	    assert.throws(() => {
		client.autoConfigure({}, autoStartCb);
	    }, Error);

	    mkdirp.restore();
	    mkdirpSync.restore();
	    clock.restore();
	    tmpDir.removeCallback();
	});

	it("should require outputFolder", () => {
	    const clock     = sinon.useFakeTimers();
	    const tmpDir    = tmp.dirSync();
	    let client      = new EPI2ME({
		inputFolder:  path.join(tmpDir.name, "input"),
	    });

	    let autoStartCb = sinon.fake();
	    let mkdirp      = sinon.stub(fs, "mkdirp").callsFake((folder, cb) => { cb(); });
	    let mkdirpSync  = sinon.stub(fs, "mkdirpSync").callsFake();

	    assert.throws(() => {
		client.autoConfigure({}, autoStartCb);
	    }, Error);

	    mkdirp.restore();
	    mkdirpSync.restore();
	    clock.restore();
	    tmpDir.removeCallback();
	});

	it("should require inputqueue", () => {
	    const clock     = sinon.useFakeTimers();
	    const tmpDir    = tmp.dirSync();
	    let client      = new EPI2ME({
		inputFolder:  path.join(tmpDir.name, "input"),
		outputFolder: path.join(tmpDir.name, "output"),
	    });

	    let autoStartCb = sinon.fake();
	    let mkdirp      = sinon.stub(fs, "mkdirp").callsFake((folder, cb) => { cb(); });
	    let mkdirpSync  = sinon.stub(fs, "mkdirpSync").callsFake();

	    assert.throws(() => {
		client.autoConfigure({
		}, autoStartCb);
	    }, Error);

	    mkdirp.restore();
	    mkdirpSync.restore();
	    clock.restore();
	    tmpDir.removeCallback();
	});

	it("should require outputqueue", () => {
	    const clock     = sinon.useFakeTimers();
	    const tmpDir    = tmp.dirSync();
	    let client      = new EPI2ME({
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
	    clock.restore();
	    tmpDir.removeCallback();
	});

	it("should autoconfigure", () => {
	    const clock     = sinon.useFakeTimers();
	    const tmpDir    = tmp.dirSync();
	    let client      = new EPI2ME({
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
	    clock.restore();
	    tmpDir.removeCallback();
	});
    });
});
