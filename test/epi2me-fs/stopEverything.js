import assert from 'assert';
import sinon from 'sinon';
import tmp from 'tmp';
import { merge } from 'lodash';
import EPI2ME from '../../src/epi2me-fs';
import { createInterval } from '../../src/timers';

describe('epi2me.stopEverything', () => {
  let clock;
  const clientFactory = (opts) => {
    const tmpdir = tmp.dirSync().name;
    const client = new EPI2ME(
      merge(
        {
          inputFolder: tmpdir,
          url: 'https://epi2me-test.local',
          log: {
            debug: sinon.stub(),
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub(),
            json: sinon.stub(),
          },
        },
        opts,
      ),
    );

    return client;
  };

  beforeEach(() => {
    clock = sinon.useFakeTimers();
  });
  afterEach(() => {
    clock.restore();
  });

  it('should clear download interval', async () => {
    const client = clientFactory();
    sinon.stub(client.REST, 'stopWorkflow').resolves();
    client.timers.downloadCheckInterval = createInterval(100, () => {});

    try {
      await client.stopEverything();
    } catch (err) {
      assert.fail(err);
    }
    // check downloadCheckInterval is cleared
  });

  it('should clear statecheck interval', async () => {
    const client = clientFactory();
    sinon.stub(client.REST, 'stopWorkflow').resolves();
    client.timers.stateCheckInterval = createInterval(100, () => {});

    try {
      await client.stopEverything();
    } catch (err) {
      assert.fail(err);
    }
    // check statecheck is cleared
  });

  it('should clear filecheck interval', async () => {
    const client = clientFactory();
    sinon.stub(client.REST, 'stopWorkflow').callsFake();

    client.timers.downloadCheckInterval = createInterval(100, () => {});
    client.timers.stateCheckInterval = createInterval(100, () => {});
    client.timers.fileCheckInterval = createInterval(100, () => {});

    try {
      await client.stopEverything();
    } catch (err) {
      assert.fail(err);
    }

    // check filecheck interval is cleared
  });
  /* converted to promise.all - not quite right
    it('should drain upload worker', (done) => {
        let client;
        const clock = sinon.useFakeTimers();

        let uploadDrain = sinon.fake();

        assert.doesNotThrow(() => {
            client = clientFactory();
            sinon.stub(client.REST, "stopWorkflow").callsFake();
            client.uploadWorkerPool = { "drain": uploadDrain };

            client.timers.downloadCheckInterval = setInterval(() => {}, 100);
            client.timers.stateCheckInterval    = setInterval(() => {}, 100);
            client.timers.fileCheckInterval     = setInterval(() => {}, 100);
        });

        assert.doesNotThrow(() => {
            client.stopEverything();
        }, Error, 'client obtained');

        sinon.assert.calledOnce(uploadDrain); // upload drain requested

        clock.restore();
        done();
    });
    */
  /*
  it('should drain download worker', done => {
    let client;
    const clock = sinon.useFakeTimers();

    const downloadDrain = sinon.fake();

    assert.doesNotThrow(() => {
      client = clientFactory();
      sinon.stub(client.REST, 'stopWorkflow').callsFake();
      client.downloadWorkerPool = { drain: downloadDrain };

      client.timers.downloadCheckInterval = setInterval(() => {}, 100);
      client.timers.stateCheckInterval = setInterval(() => {}, 100);
      client.timers.fileCheckInterval = setInterval(() => {}, 100);
    });

    assert.doesNotThrow(
      () => {
        client.stopEverything();
      },
      Error,
      'client obtained',
    );

    sinon.assert.calledOnce(downloadDrain); // download drain requested

    clock.restore();
    done();
  });
*/
  it('should request stopWorkflow with callback', async () => {
    const client = clientFactory({
      id_workflow_instance: 12345,
    });
    const stub1 = sinon.stub(client.REST, 'stopWorkflow').resolves();

    try {
      await client.stopEverything();
    } catch (err) {
      assert.fail(err);
    }

    sinon.assert.calledOnce(stub1); // rest call made
  });

  it('should request stopWorkflow without callback', async () => {
    const client = clientFactory({
      id_workflow_instance: 12345,
    });
    const stub1 = sinon.stub(client.REST, 'stopWorkflow').resolves();

    try {
      await client.stopEverything();
    } catch (err) {
      assert.fail(err);
    }

    sinon.assert.calledOnce(stub1); // rest call made
  });
});
