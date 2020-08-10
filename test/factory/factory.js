import assert from 'assert';
import sinon from 'sinon';
import EPI2ME from '../../src/epi2me-fs';

const { Factory } = EPI2ME;

describe('Factory', () => {
  let stubs;
  const dummyInstance = { id_workflow_instance: 123456 };

  beforeEach(() => {
    stubs = [];
  });
  afterEach(() => {
    stubs.forEach(s => {
      s.restore();
    });
  });

  it('creates, starts and stores a new instance', async () => {
    const startStub = sinon.stub(EPI2ME.prototype, 'autoStart').resolves(dummyInstance);
    stubs.push(startStub);
    const factory = new Factory(EPI2ME);
    const runningInstance = await factory.startRun({}, {});
    assert.strictEqual(startStub.calledOnce, true);
    assert.deepEqual([...factory.runningInstances.keys()], [dummyInstance.id_workflow_instance]);
    assert.deepEqual(runningInstance, factory.runningInstances.get(dummyInstance.id_workflow_instance));
  });
  it('on error thrown starting, it calls stop everything', async () => {
    const errorStub = sinon.stub(EPI2ME.prototype, 'autoStart').throws();
    const stopStub = sinon.stub(EPI2ME.prototype, 'stopEverything');
    stubs.push(errorStub);
    const factory = new Factory(EPI2ME);
    await factory.startRun({}, {});
    assert.strictEqual(errorStub.calledOnce, true);
    assert.strictEqual(stopStub.calledOnce, true);
    assert.deepEqual(Object.keys(factory.runningInstances), []);
  });
});
