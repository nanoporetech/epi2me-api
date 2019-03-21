import sinon from 'sinon';
import assert from 'assert';
import bunyan from 'bunyan';
import tmp from 'tmp';
import fs from 'fs-extra';
import path from 'path';
import RESTSuper from '../../src/rest';
import REST from '../../src/rest-fs';

describe('rest-fs.datasets', () => {
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
    const stub = sinon.stub(RESTSuper.prototype, 'datasets').callsFake(cb => {
      cb();
    });
    const fake = sinon.fake();
    assert.doesNotThrow(() => {
      rest.datasets(fake);
    });
    assert.ok(stub.calledOnce, 'super invoked');
    assert.ok(fake.calledOnce, 'callback invoked');
    stub.restore();
  });

  it('must only support query.show=mine', () => {
    const fake = sinon.fake();
    assert.doesNotThrow(() => {
      rest.datasets(fake, { show: 'all' });
    });
    assert.ok(fake.calledOnce, 'callback invoked');
    assert.ok(fake.args[0][0].toString().match('querying of local datasets unsupported'));
  });

  it('must warn on missing folder', async () => {
    const spy = sinon.spy(fs, 'readdir');
    const fake = sinon.fake();
    const datasetdir = path.join(rest.options.url, 'datasets');

    await rest.datasets(fake).then(() => {
      assert.ok(fake.calledOnce, 'callback invoked');
      assert.equal(spy.args[0][0], datasetdir, 'url = local folder');
      assert.ok(JSON.parse(ringbuf.records[0]).msg.match(/ENOENT/), 'datasets folder not present');
      spy.restore();
    });
  });

  it('must not warn on present folder', async () => {
    const spy = sinon.spy(fs, 'readdir');
    const fake = sinon.fake();
    const datasetdir = path.join(rest.options.url, 'datasets');
    fs.mkdirpSync(datasetdir);
    await rest.datasets(fake).then(() => {
      assert.ok(fake.calledOnce, 'callback invoked');
      assert.deepEqual(fake.args[0], [null, []], 'datasets callback args');
      assert.equal(spy.args[0][0], datasetdir, 'url = local folder');
      assert.ok(!ringbuf.records.length, 'no logged warnings');
      spy.restore();
    });
  });

  it('must map local datasets', async () => {
    const spy = sinon.spy(fs, 'readdir');
    const fake = sinon.fake();
    const datasetdir = path.join(rest.options.url, 'datasets');
    fs.mkdirpSync(datasetdir);
    fs.mkdirpSync(path.join(datasetdir, '2019-01-16T01-01-01'));

    await rest.datasets(fake).then(() => {
      assert.ok(fake.calledOnce, 'callback invoked');
      assert.deepEqual(
        fake.args[0],
        [
          null,
          [
            {
              attributes: null,
              component_id: null,
              created: null,
              data_fields: null,
              dataset_status: {
                status_label: 'Active',
                status_value: 'active',
              },
              id_account: null,
              id_dataset: 1,
              id_user: null,
              id_workflow_instance: null,
              is_consented_human: null,
              is_reference_dataset: true,
              is_shared: false,
              last_modified: null,
              name: '2019-01-16T01-01-01',
              prefix: '2019-01-16T01-01-01',
              size: 0,
              source: '2019-01-16T01-01-01',
              summary: null,
              uuid: '2019-01-16T01-01-01',
            },
          ],
        ],
        'datasets callback args',
      );
      assert.equal(spy.args[0][0], datasetdir, 'url = local folder');
      assert.ok(!ringbuf.records.length, 'no logged warnings');
      spy.restore();
    });
  });
});
