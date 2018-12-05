"use strict";
const assert = require("assert");
const sinon  = require("sinon");
const AWS    = require("aws-sdk");

import EPI2ME from "../../lib/epi2me";
import REST from "../../lib/rest";

describe("epi2me.sessionedS3", () => {

    it("should session", () => {
	let client = new EPI2ME({});

	sinon.stub(client, "session").callsFake();

	assert.doesNotThrow(() => {
	    let s3 = client.sessionedS3();
	    assert.ok(s3 instanceof AWS.S3);
	});
    });
});
