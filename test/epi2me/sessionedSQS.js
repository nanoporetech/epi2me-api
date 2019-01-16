"use strict";
const assert = require("assert");
const sinon  = require("sinon");
const AWS    = require("aws-sdk");

import EPI2ME from "../../lib/epi2me";
import REST from "../../lib/rest";

describe("epi2me.sessionedSQS", () => {

    it("should session", () => {
	let client = new EPI2ME({});

	sinon.stub(client, "session").callsFake();

	assert.doesNotThrow(() => {
	    let sqs = client.sessionedSQS();
	    assert.ok(sqs instanceof AWS.SQS);
	});
    });
});
