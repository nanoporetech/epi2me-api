import assert from 'assert';
import sinon from 'sinon';
import tmp from 'tmp';
import { merge } from 'lodash';
import EPI2ME from '../../src/epi2me';

describe('epi2me.stopEverything', () => {
  const clientFactory = opts => {
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
          },
        },
        opts,
      ),
    );

    return client;
  };

  it('should clear download interval', done => {
    let client;
    const clock = sinon.useFakeTimers();

    assert.doesNotThrow(() => {
      client = clientFactory();
      sinon.stub(client.REST, 'stopWorkflow').callsFake();

      client.downloadCheckInterval = setInterval(() => {}, 100);
    });

    assert.doesNotThrow(
      () => {
        client.stopEverything();
      },
      Error,
      'client obtained',
    );

    clock.restore();
    done();
  });

  it('should clear statecheck interval', done => {
    let client;
    const clock = sinon.useFakeTimers();

    assert.doesNotThrow(() => {
      client = clientFactory();
      sinon.stub(client.REST, 'stopWorkflow').callsFake();

      client.stateCheckInterval = setInterval(() => {}, 100);
    });

    assert.doesNotThrow(
      () => {
        client.stopEverything();
      },
      Error,
      'client obtained',
    );

    clock.restore();
    done();
  });

  it('should clear filecheck interval', done => {
    let client;
    const clock = sinon.useFakeTimers();

    assert.doesNotThrow(() => {
      client = clientFactory();
      sinon.stub(client.REST, 'stopWorkflow').callsFake();

      client.downloadCheckInterval = setInterval(() => {}, 100);
      client.stateCheckInterval = setInterval(() => {}, 100);
      client.fileCheckInterval = setInterval(() => {}, 100);
    });

    assert.doesNotThrow(
      () => {
        client.stopEverything();
      },
      Error,
      'client obtained',
    );

    clock.restore();
    done();
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

            client.downloadCheckInterval = setInterval(() => {}, 100);
            client.stateCheckInterval    = setInterval(() => {}, 100);
            client.fileCheckInterval     = setInterval(() => {}, 100);
        });

        assert.doesNotThrow(() => {
            client.stopEverything();
        }, Error, 'client obtained');

        sinon.assert.calledOnce(uploadDrain); // upload drain requested

        clock.restore();
        done();
    });
    */
  it('should drain download worker', done => {
    let client;
    const clock = sinon.useFakeTimers();

    const downloadDrain = sinon.fake();

    assert.doesNotThrow(() => {
      client = clientFactory();
      sinon.stub(client.REST, 'stopWorkflow').callsFake();
      client.downloadWorkerPool = { drain: downloadDrain };

      client.downloadCheckInterval = setInterval(() => {}, 100);
      client.stateCheckInterval = setInterval(() => {}, 100);
      client.fileCheckInterval = setInterval(() => {}, 100);
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

  it('should request stopWorkflow with callback', done => {
    let client;
    const clock = sinon.useFakeTimers();

    let stub1;
    const stub2 = sinon.fake();
    assert.doesNotThrow(() => {
      client = clientFactory({ id_workflow_instance: 12345 });
      stub1 = sinon.stub(client.REST, 'stopWorkflow').callsFake((id, cb) => cb());
    });

    assert.doesNotThrow(
      () => {
        client.stopEverything(stub2);
      },
      Error,
      'client obtained',
    );

    sinon.assert.calledOnce(stub1); // rest call made
    sinon.assert.calledOnce(stub2); // callback fired

    clock.restore();
    done();
  });

  it('should request stopWorkflow without callback', done => {
    let client;
    const clock = sinon.useFakeTimers();

    let stub1;
    assert.doesNotThrow(() => {
      client = clientFactory({ id_workflow_instance: 12345 });
      stub1 = sinon.stub(client.REST, 'stopWorkflow').callsFake((id, cb) => (cb ? cb() : Promise.resolve()));
    });

    assert.doesNotThrow(
      () => {
        client.stopEverything();
      },
      Error,
      'client obtained',
    );

    sinon.assert.calledOnce(stub1); // rest call made

    clock.restore();
    done();
  });

  it('should fire callback', done => {
    let client;
    const clock = sinon.useFakeTimers();

    const stub2 = sinon.fake();
    assert.doesNotThrow(() => {
      client = clientFactory();
    });

    assert.doesNotThrow(
      () => {
        client.stopEverything(stub2);
      },
      Error,
      'client obtained',
    );

    sinon.assert.calledOnce(stub2); // callback fired

    clock.restore();
    done();
  });
});
