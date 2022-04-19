import sinon from 'sinon';
import { Factory } from './factory';
import { EPI2ME_FS as EPI2ME } from './epi2me-fs';
import { firstValueFrom } from 'rxjs';

describe('Factory', () => {
  let stubs: sinon.SinonStub[];
  const dummyInstanceConfig = { id_workflow_instance: 123456 };

  beforeEach(() => {
    stubs = [];
  });
  afterEach(() => {
    stubs.forEach((s) => {
      s.restore();
    });
  });

  it('creates, starts and stores a new instance', async () => {
    const startStub = sinon.stub(EPI2ME.prototype, 'autoStart').callsFake(function (this: EPI2ME, _variables) {
      this.config.instance = {
        ...this.config.instance,
        id_workflow_instance: dummyInstanceConfig.id_workflow_instance,
      };
      return Promise.resolve(this.config.instance);
    });
    stubs.push(startStub);
    const factory = new Factory(EPI2ME);
    const runningInstance = await factory.startRun(
      {},
      {
        idWorkflow: '1234',
        computeAccountId: '1234',
      },
    );
    expect(startStub.calledOnce).toBeTruthy();

    const instances = await firstValueFrom(factory.runningInstances$);
    expect([...instances.keys()]).toEqual([dummyInstanceConfig.id_workflow_instance]);

    expect(factory.getRunningInstance(dummyInstanceConfig.id_workflow_instance)).toEqual(runningInstance);
  });
  it('on error thrown starting, it calls stop everything', async () => {
    const autoStartStub = sinon.stub(EPI2ME.prototype, 'autoStart').throws('Dummy autostart error');
    const errorLogStub = sinon.stub();
    const stopStub = sinon.stub(EPI2ME.prototype, 'stopEverything');
    stubs.push(autoStartStub, stopStub);
    const factory = new Factory(EPI2ME, {
      log: {
        error: errorLogStub,
        warn: sinon.stub(),
        info: sinon.stub(),
        critical: sinon.stub(),
        debug: sinon.stub(),
      },
    });
    await factory.startRun(
      {},
      {
        idWorkflow: '1234',
        computeAccountId: '1234',
      },
    );
    expect(errorLogStub.calledOnceWith(`Experienced error starting`));
    expect(autoStartStub.calledOnce).toBeTruthy();
    expect(stopStub.calledOnce).toBeTruthy();

    const instances = await firstValueFrom(factory.runningInstances$);
    expect([...instances.values()]).toEqual([]);
  });
});
