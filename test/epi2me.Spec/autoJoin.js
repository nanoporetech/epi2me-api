import EPI2ME from "../../lib/epi2me";

const assert = require("assert");
const sinon  = require("sinon");
const bunyan = require("bunyan");

describe('epi2me-api', () => {

    let stubs = [];

    function newApi(error, instance) {

        let client = new EPI2ME();
	stubs.forEach((s) => { s.restore(); });

        stubs.push(sinon.stub(client.REST, "workflow_instance").callsFake((id, cb) => {
            cb(error, instance);
        }));

        stubs.push(sinon.stub(client, "autoConfigure").callsFake((id, cb) => {
            cb();
        }));

        sinon.stub(client.log, "warn");

        return client;
    }

    it('should join an existing workflow instance', (done) => {
        let client = newApi(null, {
            id_workflow_instance: 10,
            id_user: "user",
            outputqueue: "queue"
        });

	assert.doesNotThrow(() => {
            client.autoJoin(111, () => {
		assert(client.REST.workflow_instance.calledOnce);
		assert(client.autoConfigure.calledOnce);

		let args = client.autoConfigure.args[0][0];
		assert.equal(args.id_workflow_instance, 10);
		assert.equal(args.id_user, 'user');
		assert.equal(args.outputqueue, 'queue');
            });
	});
	done();
    });

    it('should handle workflow_instance errors', (done) => {
        let client = newApi(
            {
                error: "Message"
            },
            {
                state: "stopped"
            });

	assert.doesNotThrow(() => {
            client.autoJoin(111, () => {
		assert(client.REST.workflow_instance.calledOnce);
		assert(client.log.warn.calledOnce);
		assert(client.log.warn.calledWith("Failed to join workflow instance: Message"));
		assert(client.autoConfigure.notCalled);
            });
	});
	done();
    });

    it('should not join an instance where state === stopped', (done) => {
        let client = newApi({
            state: "stopped"
        });

	assert.doesNotThrow(() => {
            client.autoJoin(111, () => {
		assert(client.REST.workflow_instance.calledOnce);
		assert(client.autoConfigure.notCalled);
		//assert(client.log.warn.calledWith("workflow 111 is already stopped"));
            });
	});
	done();
    });
});
