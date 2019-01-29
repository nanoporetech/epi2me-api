import sinon from 'sinon';
import assert from 'assert';
import tmp from 'tmp';
import path from 'path';
import fs from 'fs-extra';
import bunyan from 'bunyan';
import { merge } from 'lodash';
import REST from '../../src/rest';
import utils from '../../src/utils';

describe('rest.workflow', () => {
  const restFactory = opts => {
    const ringbuf = new bunyan.RingBuffer({ limit: 100 });
    const log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    return new REST(merge({ log }, opts));
  };

  it('must invoke put with options', () => {
    const fake = sinon.fake();
    const rest = restFactory({ url: 'http://metrichor.local:8080' });
    const stub = sinon.stub(utils, '_put').callsFake((uri, id, obj, options, cb) => {
      assert.deepEqual(id, '12345', 'id passed');
      assert.deepEqual(obj, { description: 'a workflow', rev: '1.0' }, 'object passed');
      assert.deepEqual(
        options,
        { log: rest.log, url: 'http://metrichor.local:8080', legacy_form: true },
        'options passed',
      );
      assert.equal(uri, 'workflow', 'url passed');
      cb();
    });

    assert.doesNotThrow(() => {
      rest.workflow('12345', { description: 'a workflow', rev: '1.0' }, fake);
    });
    assert(fake.calledOnce, 'callback invoked');
    stub.restore();
  });

  it('must invoke post with options', () => {
    const fake = sinon.fake();
    const rest = restFactory({ url: 'http://metrichor.local:8080' });
    const stub = sinon.stub(utils, '_post').callsFake((uri, obj, options, cb) => {
      assert.deepEqual(obj, { description: 'a workflow', rev: '1.0' }, 'object passed');
      assert.deepEqual(
        options,
        { log: rest.log, url: 'http://metrichor.local:8080', legacy_form: true },
        'options passed',
      );
      assert.equal(uri, 'workflow', 'url passed');
      cb();
    });

    assert.doesNotThrow(() => {
      rest.workflow({ description: 'a workflow', rev: '1.0' }, fake);
    });
    assert(fake.calledOnce, 'callback invoked');
    stub.restore();
  });

  it('must throw if missing id', () => {
    const stub = sinon.stub(utils, '_put').callsFake((uri, id, obj, options, cb) => {
      cb();
    });

    const fake = sinon.fake();
    const rest = restFactory({ url: 'http://metrichor.local:8080' });
    assert.doesNotThrow(() => {
      rest.workflow(null, fake);
    });
    assert(fake.calledOnce, 'callback invoked');
    assert(fake.firstCall.args[0] instanceof Error);
    stub.restore();
  });

  it('must invoke read workflow from filesystem', () => {
    const dir = tmp.dirSync({ unsafeCleanup: true }).name;

    fs.mkdirpSync(path.join(dir, 'workflows', '12345'));
    fs.writeFileSync(
      path.join(dir, 'workflows', '12345', 'workflow.json'),
      JSON.stringify({ id_workflow: 12345, name: 'test', description: 'test workflow 12345' }),
    );

    const fake = sinon.fake();
    const rest = restFactory({ url: dir, local: true });
    assert.doesNotThrow(() => {
      rest.workflow('12345', fake);
    });
    assert(fake.calledOnce, 'callback invoked');
    sinon.assert.calledWith(fake, null, { id_workflow: 12345, name: 'test', description: 'test workflow 12345' });
  });

  it('must catch a read-workflow exception from filesystem', () => {
    const stub = sinon.stub(fs, 'readFileSync').callsFake(filename => {
      throw new Error('no such file or directory');
    });

    const fake = sinon.fake();
    const rest = restFactory({ url: '/path/to/', local: true });

    assert.doesNotThrow(() => {
      rest.workflow('12345', fake);
    });
    assert(fake.calledOnce, 'callback invoked');
    assert(fake.firstCall.args[0] instanceof Error);
    stub.restore();
  });

  it('must invoke get then fetch config with workflow missing params', () => {
    const stub1 = sinon.stub(REST.prototype, '_read').callsFake((uri, id, cb) => {
      assert.deepEqual(id, '12345', 'id passed');
      assert.equal(uri, 'workflow', 'url passed');
      cb(null, { id_workflow: 12345, description: 'a workflow' });
    });

    const stub2 = sinon.stub(utils, '_get').callsFake((uri, options, cb) => {
      if (uri === 'workflow/config/12345') {
        return cb(null, {});
      }
      throw new Error(`unhandled test url${uri}`);
    });

    const fake = sinon.fake();
    const rest = restFactory({ url: 'http://metrichor.local:8080' });

    new Promise((accept, reject) => {
      rest.workflow('12345', (err, data) => {
        if (err) reject(fake(err));
        accept(fake(null, data));
      });
    }).then(() => {
      assert(fake.calledOnce, 'callback invoked');
      sinon.assert.calledWith(fake, null, { description: 'a workflow', id_workflow: 12345, params: {} });
    });

    stub1.restore();
    stub2.restore();
  });

  it('must invoke get then fetch config with null workflow', () => {
    const stub1 = sinon.stub(REST.prototype, '_read').callsFake((uri, id, cb) => {
      assert.deepEqual(id, '12345', 'id passed');
      assert.equal(uri, 'workflow', 'url passed');
      cb(null, null); // null workflow
    });

    const stub2 = sinon.stub(utils, '_get').callsFake((uri, options, cb) => {
      if (uri === 'workflow/config/12345') {
        return cb(null, {});
      }
      throw new Error(`unhandled test url${uri}`);
    });

    const fake = sinon.fake();
    const rest = restFactory({ url: 'http://metrichor.local:8080' });

    new Promise((accept, reject) => {
      rest.workflow('12345', (err, data) => {
        if (err) reject(fake(err));
        accept(fake(null, data));
      });
    }).then(() => {
      assert(fake.calledOnce, 'callback invoked');
      sinon.assert.calledWith(fake, null, { params: {} });
    }); // catch block after this seems ineffective - even asserting(false) doesn't make the test fail

    stub1.restore();
    stub2.restore();
  });

  it('must invoke get then fetch config with workflow including params', () => {
    const stub1 = sinon.stub(REST.prototype, '_read').callsFake((uri, id, cb) => {
      assert.deepEqual(id, '12345', 'id passed');
      assert.equal(uri, 'workflow', 'url passed');
      cb(null, {
        id_workflow: 12345,
        description: 'a workflow',
        params: [
          {
            widget: 'ajax_dropdown',
            values: {
              data_root: 'data_root',
              source: 'test_params',
              items: { label_key: 'label_key', value_key: 'value_key' },
            },
          },
        ],
      });
    });

    const stub2 = sinon.stub(utils, '_get').callsFake((uri, options, cb) => {
      if (uri === 'workflow/config/12345') {
        return cb(null, {});
      }
      if (uri === 'test_params') {
        return cb(null, {
          data_root: [
            { label_key: 'foo', value_key: 1 },
            { label_key: 'bar', value_key: 2 },
            { label_key: 'baz', value_key: 3 },
          ],
        });
      }

      throw new Error(`unhandled test url${uri}`);
    });

    const fake = sinon.fake();
    const rest = restFactory({ url: 'http://metrichor.local:8080' });

    new Promise((accept, reject) => {
      rest.workflow('12345', (err, data) => {
        if (err) reject(fake(err));
        accept(fake(null, data));
      });
    }).then(() => {
      assert(fake.calledOnce, 'callback invoked');
      sinon.assert.calledWith(fake, null, {
        description: 'a workflow',
        id_workflow: 12345,
        params: [
          {
            values: [{ label: 'foo', value: 1 }, { label: 'bar', value: 2 }, { label: 'baz', value: 3 }],
            widget: 'ajax_dropdown',
          },
        ],
      });
    });

    stub1.restore();
    stub2.restore();
  });

  it('must invoke get then fetch config with workflow including params and skip handling of data_root', () => {
    const stub1 = sinon.stub(REST.prototype, '_read').callsFake((uri, id, cb) => {
      assert.deepEqual(id, '12345', 'id passed');
      assert.equal(uri, 'workflow', 'url passed');
      cb(null, {
        id_workflow: 12345,
        description: 'a workflow',
        params: [
          {
            widget: 'ajax_dropdown',
            values: { source: 'test_params', items: { label_key: 'label_key', value_key: 'value_key' } },
          },
        ],
      });
    });

    const stub2 = sinon.stub(utils, '_get').callsFake((uri, options, cb) => {
      if (uri === 'workflow/config/12345') {
        return cb(null, {});
      }
      if (uri === 'test_params') {
        return cb(null, {
          data_root: [
            { label_key: 'foo', value_key: 1 },
            { label_key: 'bar', value_key: 2 },
            { label_key: 'baz', value_key: 3 },
          ],
        });
      }

      throw new Error(`unhandled test url${uri}`);
    });

    const fake = sinon.fake();
    const rest = restFactory({ url: 'http://metrichor.local:8080' });

    new Promise((accept, reject) => {
      rest.workflow('12345', (err, data) => {
        if (err) reject(fake(err));
        accept(fake(null, data));
      });
    }).then(() => {
      assert(fake.calledOnce, 'callback invoked');
      sinon.assert.calledWith(fake, null, {
        description: 'a workflow',
        id_workflow: 12345,
        params: [
          {
            values: {
              items: { label_key: 'label_key', value_key: 'value_key' },
              source: 'test_params',
            },
            widget: 'ajax_dropdown',
          },
        ],
      });
    });

    stub1.restore();
    stub2.restore();
  });

  it('must handle failure during config fetch', async () => {
    const stub1 = sinon.stub(REST.prototype, '_read').callsFake((uri, id, cb) => {
      assert.deepEqual(id, '12345', 'id passed');
      assert.equal(uri, 'workflow', 'url passed');
      cb(null, {
        id_workflow: 12345,
        description: 'a workflow',
        params: [
          {
            widget: 'ajax_dropdown',
            values: {
              data_root: 'data_root',
              source: 'test_params',
              items: { label_key: 'label_key', value_key: 'value_key' },
            },
          },
        ],
      });
    });

    const stub2 = sinon.stub(utils, '_get').callsFake((uri, options, cb) => {
      if (uri === 'workflow/config/12345') {
        return cb({ error: 'forbidden' });
      }
      if (uri === 'test_params') {
        return cb(null, {
          data_root: [
            { label_key: 'foo', value_key: 1 },
            { label_key: 'bar', value_key: 2 },
            { label_key: 'baz', value_key: 3 },
          ],
        });
      }

      throw new Error(`unhandled test url${uri}`);
    });

    const fake = sinon.fake();
    const rest = restFactory({ url: 'http://metrichor.local:8080' });

    const p = new Promise(resolve => {
      rest.workflow('12345', (err, data) => {
        assert.deepEqual(err, { error: 'forbidden' }, 'error message');
        resolve();
      });
    });

    try {
      await p;
    } catch (e) {
      assert.fail(e);
    }

    stub1.restore();
    stub2.restore();
  });

  it('must handle failure during parameter fetch', async () => {
    const stub1 = sinon.stub(REST.prototype, '_read').callsFake((uri, id, cb) => {
      assert.deepEqual(id, '12345', 'id passed');
      assert.equal(uri, 'workflow', 'url passed');
      cb(null, {
        id_workflow: 12345,
        description: 'a workflow',
        params: [
          {
            widget: 'ajax_dropdown',
            values: {
              data_root: 'data_root',
              source: 'test_params',
              items: { label_key: 'label_key', value_key: 'value_key' },
            },
          },
        ],
      });
    });

    const stub2 = sinon.stub(utils, '_get').callsFake((uri, options, cb) => {
      if (uri === 'workflow/config/12345') {
        return cb(null, {});
      }
      if (uri === 'test_params') {
        return cb({ error: 'forbidden' });
      }

      throw new Error(`unhandled test url${uri}`);
    });

    const fake = sinon.fake();
    const rest = restFactory({ url: 'http://metrichor.local:8080' });

    const p = new Promise((resolve, reject) => {
      rest.workflow('12345', (err, data) => {
        assert.deepEqual(err, { error: 'forbidden' });

        resolve();
      });
    });

    try {
      await p;
    } catch (e) {
      assert.fail(e);
    }

    stub1.restore();
    stub2.restore();
  });
});
