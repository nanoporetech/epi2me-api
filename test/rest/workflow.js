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
  let stubs;
  beforeEach(() => {
    stubs = [];
  });
  afterEach(() => {
    stubs.forEach(s => {
      s.restore();
    });
  });
  const restFactory = opts => {
    const ringbuf = new bunyan.RingBuffer({ limit: 100 });
    const log = bunyan.createLogger({ name: 'log', stream: ringbuf });
    return new REST(merge({ log }, opts));
  };

  it('must invoke put with options and callback', async () => {
    const fake = sinon.fake();
    const rest = restFactory({ url: 'http://metrichor.local:8080' });
    const stub = sinon.stub(utils, 'put').resolves();
    stubs.push(stub);

    try {
      await rest.workflow('12345', { description: 'a workflow', rev: '1.0' }, fake);
    } catch (err) {
      console.log('ERR', err);
      assert.fail(err);
    }
    assert(fake.calledOnce, 'callback invoked');
  });

  it('must invoke post with options', async () => {
    const fake = sinon.fake();
    const rest = restFactory({ url: 'http://metrichor.local:8080' });
    const stub = sinon.stub(utils, 'post').resolves();
    stubs.push(stub);

    try {
      await rest.workflow({ description: 'a workflow', rev: '1.0' }, fake);
    } catch (err) {
      assert.fail(err);
    }
    assert(fake.calledOnce, 'callback invoked');
  });

  it('must throw if missing id', async () => {
    const stub = sinon.stub(utils, 'put').resolves();
    stubs.push(stub);

    const fake = sinon.fake();
    const rest = restFactory({ url: 'http://metrichor.local:8080' });

    try {
      await rest.workflow(null, fake);
    } catch (err) {
      assert.fail(err);
    }
    assert(fake.calledOnce, 'callback invoked');
    assert(fake.firstCall.args[0] instanceof Error);
  });

  it('must invoke get then fetch config with workflow missing params and callback', async () => {
    const fake = sinon.fake((err, data) => {
      assert.deepEqual(data, { description: 'a workflow', id_workflow: 12345, params: {} });
    });
    const rest = restFactory({ url: 'http://metrichor.local:8080' });
    const stub1 = sinon.stub(rest, 'read').resolves({ id_workflow: 12345, description: 'a workflow' });
    const stub2 = sinon.stub(utils, 'get').resolves({});
    stubs.push(stub1);
    stubs.push(stub2);

    try {
      await rest.workflow('12345', fake);
    } catch (err) {
      assert.fail(err);
    }
    assert(fake.calledOnce, 'callback invoked');
  });

  it('must invoke get then fetch config with workflow missing params and promise', async () => {
    const rest = restFactory({ url: 'http://metrichor.local:8080' });
    const stub1 = sinon.stub(rest, 'read').resolves({ id_workflow: 12345, description: 'a workflow' });
    const stub2 = sinon.stub(utils, 'get').resolves({});
    stubs.push(stub1);
    stubs.push(stub2);

    try {
      let data = await rest.workflow('12345');
      assert.deepEqual(data, { description: 'a workflow', id_workflow: 12345, params: {} });
    } catch (err) {
      assert.fail(err);
    }
  });

  it('must invoke get then fetch config with null workflow', async () => {
    const fake = sinon.fake();
    const rest = restFactory({ url: 'http://metrichor.local:8080' });
    const stub1 = sinon.stub(rest, 'read').resolves({});
    const stub2 = sinon.stub(utils, 'get').resolves({});
    stubs.push(stub1);
    stubs.push(stub2);

    try {
      const data = await rest.workflow('12345');
      assert.deepEqual(data, { params: {} });
    } catch (err) {
      assert.fail(err);
    }
  });

  it('must invoke get then fetch config with workflow including params', async () => {
    const fake = sinon.fake();
    const rest = restFactory({ url: 'http://metrichor.local:8080' });

    const stub1 = sinon.stub(rest, 'read').callsFake((uri, id) => {
      assert.deepEqual(id, '12345', 'id passed');
      assert.equal(uri, 'workflow', 'url passed');
      return Promise.resolve({
        id_workflow: 12345,
        description: 'a workflow',
        params: [
          {
            widget: 'ajax_dropdown',
            values: {
              data_root: 'datasets',
              source: '{{EPI2ME_HOST}}/dataset.json?reference_only=1&apikey={{EPI2ME_API_KEY}}',
              items: { label_key: 'name', value_key: 'prefix' },
            },
          },
        ],
      });
    });

    const stub2 = sinon.stub(utils, 'get').callsFake((uri, options) => {
      if (uri === 'workflow/config/12345') {
        return Promise.resolve({});
      }
      if (uri === '/dataset.json?reference_only=1&apikey={{EPI2ME_API_KEY}}') {
        return Promise.resolve({
          datasets: [
            {
              name: 'gB2_AD169',
              uuid: '9A470148-23C6-11E9-BAE2-A6A75D9A848C',
              is_shared: true,
              id_account: '358529159',
              component_id: '1',
              is_reference_dataset: true,
              id_workflow_instance: '190127',
              last_modified: '2019-01-29 13:05:51',
              id_user: '8630',
              prefix: '5525461A-23C6-11E9-8C3C-B2A75D9A848C/8630/190127/component-1',
              source: '5525461A-23C6-11E9-8C3C-B2A75D9A848C/8630/190127/component-0/gB2_AD169.fasta',
              id_dataset: '13970',
              data_fields: 'epi2me:category,epi2me:max_files,epi2me:max_size,project',
              id_dataset_status: '1',
              size: '134493',
              created: '2019-01-29 13:05:51',
              attributes: {
                'epi2me:max_files': [
                  {
                    value: '1',
                    id_attribute_value: '48077',
                  },
                ],
                'epi2me:max_size': [
                  {
                    id_attribute_value: '48080',
                    value: '2000000000',
                  },
                ],
                'epi2me:category': [
                  {
                    value: 'reference',
                    id_attribute_value: '48078',
                  },
                  {
                    id_attribute_value: '48079',
                    value: 'storage',
                  },
                ],
              },
              dataset_status: {
                status_label: 'Active',
                status_value: 'active',
              },
              summary: null,
              is_consented_human: null,
            },
            {
              id_dataset: '13953',
              data_fields: 'epi2me:category,epi2me:max_files,epi2me:max_size,project',
              id_dataset_status: '1',
              size: '155876',
              created: '2019-01-25 14:55:21',
              attributes: {
                'epi2me:category': [
                  {
                    value: 'reference',
                    id_attribute_value: '47916',
                  },
                  {
                    value: 'storage',
                    id_attribute_value: '47917',
                  },
                ],
                'epi2me:max_files': [
                  {
                    value: '1',
                    id_attribute_value: '47914',
                  },
                ],
                'epi2me:max_size': [
                  {
                    value: '2000000000',
                    id_attribute_value: '47915',
                  },
                ],
              },
              dataset_status: {
                status_value: 'active',
                status_label: 'Active',
              },
              summary: null,
              is_consented_human: null,
              name: 'mRNA_refU_seq_5023_A',
              is_shared: true,
              uuid: '3D19787E-20B1-11E9-9E0E-CF0C4630A969',
              id_account: '358529672',
              component_id: '1',
              is_reference_dataset: true,
              last_modified: '2019-01-25 14:55:21',
              id_workflow_instance: '189956',
              id_user: '9454',
              prefix: '0B56A078-20B1-11E9-A2B6-B2699F7EF595/9454/189956/component-1',
              source: '0B56A078-20B1-11E9-A2B6-B2699F7EF595/9454/189956/component-0/5023_A.fasta',
            },
          ],
        });
      }

      throw new Error(`unhandled test url${uri}`);
    });

    stubs.push(stub1);
    stubs.push(stub2);

    try {
      const data = await rest.workflow('12345');
      assert.deepEqual(data, {
        description: 'a workflow',
        id_workflow: 12345,
        params: [
          {
            values: [
              {
                label: 'gB2_AD169',
                value: '5525461A-23C6-11E9-8C3C-B2A75D9A848C/8630/190127/component-1',
              },
              {
                label: 'mRNA_refU_seq_5023_A',
                value: '0B56A078-20B1-11E9-A2B6-B2699F7EF595/9454/189956/component-1',
              },
            ],

            widget: 'ajax_dropdown',
          },
        ],
      });
    } catch (err) {
      assert.fail(err);
    }
  });

  it('must invoke get then fetch config with workflow including params and skip handling of data_root', async () => {
    const fake = sinon.fake();
    const rest = restFactory({ url: 'http://metrichor.local:8080' });

    const stub1 = sinon.stub(REST.prototype, 'read').callsFake((uri, id) => {
      assert.deepEqual(id, '12345', 'id passed');
      assert.equal(uri, 'workflow', 'url passed');
      return Promise.resolve({
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

    const stub2 = sinon.stub(utils, 'get').callsFake((uri, options) => {
      if (uri === 'workflow/config/12345') {
        return Promise.resolve({});
      }
      if (uri === 'test_params') {
        return Promise.resolve({
          data_root: [
            { label_key: 'foo', value_key: 1 },
            { label_key: 'bar', value_key: 2 },
            { label_key: 'baz', value_key: 3 },
          ],
        });
      }

      throw new Error(`unhandled test url${uri}`);
    });
    stubs.push(stub1);
    stubs.push(stub2);

    try {
      let data = await rest.workflow('12345');
      assert.deepEqual(data, {
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
    } catch (err) {
      assert.fail(err);
    }
  });

  it('must handle failure during config fetch', async () => {
    const fake = sinon.fake();
    const rest = restFactory({ url: 'http://metrichor.local:8080' });

    const stub1 = sinon.stub(rest, 'read').callsFake((uri, id) => {
      assert.deepEqual(id, '12345', 'id passed');
      assert.equal(uri, 'workflow', 'url passed');
      return Promise.resolve({
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

    const stub2 = sinon.stub(utils, 'get').callsFake((uri, options) => {
      if (uri === 'workflow/config/12345') {
        return Promise.reject(new Error('forbidden'));
      }
      if (uri === 'test_params') {
        return Promise.resolve({
          data_root: [
            { label_key: 'foo', value_key: 1 },
            { label_key: 'bar', value_key: 2 },
            { label_key: 'baz', value_key: 3 },
          ],
        });
      }

      throw new Error(`unhandled test url${uri}`);
    });
    stubs.push(stub1);
    stubs.push(stub2);

    try {
      await rest.workflow('12345');
      assert.fail('unexpected success');
    } catch (err) {
      assert(String(err).match('forbidden'));
    }
  });

  it('must handle failure during parameter fetch', async () => {
    const fake = sinon.fake();
    const rest = restFactory({ url: 'http://metrichor.local:8080' });

    const stub1 = sinon.stub(rest, 'read').callsFake((uri, id) => {
      assert.deepEqual(id, '12345', 'id passed');
      assert.equal(uri, 'workflow', 'url passed');
      return Promise.resolve({
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

    const stub2 = sinon.stub(utils, 'get').callsFake((uri, options) => {
      if (uri === 'workflow/config/12345') {
        return Promise.resolve({});
      }
      if (uri === 'test_params') {
        return Promise.reject(new Error('forbidden'));
      }

      throw new Error(`unhandled test url${uri}`);
    });
    stubs.push(stub1);
    stubs.push(stub2);

    try {
      let data = await rest.workflow('12345');
      assert.fail('unexpected success');
    } catch (err) {
      assert(String(err).match(/forbidden/));
    }
  });
});
