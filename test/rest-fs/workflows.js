import sinon from 'sinon';
import assert from 'assert';
import bunyan from 'bunyan';
import tmp from 'tmp';
import fs from 'fs-extra';
import path from 'path';
import { REST as RESTSuper } from '../../src/rest';
import { REST_FS as REST } from '../../src/rest-fs';

describe('rest-fs.workflows', () => {
  let rest;
  let log;
  let ringbuf;

  beforeEach(() => {
    ringbuf = new bunyan.RingBuffer({ limit: 100 });
    log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    rest = new REST({
      log,
      local: true,
      url: tmp.dirSync().name,
    });
  });

  it('must pass through to super if not local', () => {
    rest = new REST({ log });
    const stub = sinon.stub(RESTSuper.prototype, 'workflows').callsFake((cb) => {
      cb();
    });
    const fake = sinon.fake();
    assert.doesNotThrow(() => {
      rest.workflows(fake);
    });
    assert.ok(stub.calledOnce, 'super invoked');
    assert.ok(fake.calledOnce, 'callback invoked');
    stub.restore();
  });

  it('must warn on missing folder', async () => {
    const spy = sinon.spy(fs, 'readdir');
    const fake = sinon.fake();
    const workflowdir = path.join(rest.options.url, 'workflows');

    await rest.workflows(fake).then(() => {
      assert.ok(fake.calledOnce, 'callback invoked');
      assert.equal(spy.args[0][0], workflowdir, 'url = local folder');
      assert.ok(JSON.parse(ringbuf.records[0]).msg.match(/ENOENT/), 'workflows folder not present');
      spy.restore();
    });
  });

  it('must not warn on present folder', async () => {
    const spy = sinon.spy(fs, 'readdir');
    const fake = sinon.fake();
    const workflowdir = path.join(rest.options.url, 'workflows');
    fs.mkdirpSync(workflowdir);
    await rest.workflows(fake).then(() => {
      assert.ok(fake.calledOnce, 'callback invoked');
      assert.deepEqual(fake.args[0], [null, []], 'workflows callback args');
      assert.equal(spy.args[0][0], workflowdir, 'url = local folder');
      assert.ok(!ringbuf.records.length, 'no logged warnings');
      spy.restore();
    });
  });

  it('must map local workflows', async () => {
    const spy = sinon.spy(fs, 'readdir');
    const fake = sinon.fake();
    const workflowdir = path.join(rest.options.url, 'workflows');
    fs.mkdirpSync(path.join(workflowdir, '12345'));
    fs.mkdirpSync(path.join(workflowdir, '34567'));

    fs.writeFileSync(path.join(workflowdir, '12345', 'workflow.json'), JSON.stringify({ id_workflow: 12345 }));
    fs.writeFileSync(path.join(workflowdir, '34567', 'workflow.json'), JSON.stringify({ id_workflow: 34567 }));

    await rest.workflows(fake).then(() => {
      assert.ok(fake.calledOnce, 'callback invoked');
      assert.deepEqual(
        fake.args[0],
        [null, [{ id_workflow: 12345 }, { id_workflow: 34567 }]],
        'workflows callback args',
      );
      assert.equal(spy.args[0][0], workflowdir, 'url = local folder');
      assert.ok(!ringbuf.records.length, 'no logged warnings');
      spy.restore();
    });
  });
});
