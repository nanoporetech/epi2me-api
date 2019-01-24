import assert from "assert";
import sinon  from "sinon";
import AWS    from "aws-sdk";
import EPI2ME from "../../src/epi2me";

describe("epi2me.sessionedSQS", () => {

    it("should session", () => {
	let client = new EPI2ME({});

	sinon.stub(client, "session").resolves();

	assert.doesNotThrow(async () => {
	    let sqs = await client.sessionedSQS();
	    assert.ok(sqs instanceof AWS.SQS);
	});
    });
});
