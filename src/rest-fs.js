import fs from 'fs-extra';
import path from 'path';
import REST from './rest';
import utils from './utils-fs';
import { deprecatedFunctionWarning } from './utils';

export default class REST_FS extends REST {
  async workflows(cb) {
    if (!this.options.local) {
      return super.workflows(cb);
    }

    const WORKFLOW_DIR = path.join(this.options.url, 'workflows');

    let data;
    let err;
    try {
      const tmp = await fs.readdir(WORKFLOW_DIR);
      data = tmp // ouch
        .filter(id => fs.statSync(path.join(WORKFLOW_DIR, id)).isDirectory())
        .map(id => path.join(WORKFLOW_DIR, id, 'workflow.json'))
        .map(filepath => fs.readJsonSync(filepath));

      return cb ? cb(null, data) : Promise.resolve(data);
    } catch (e) {
      this.log.warn(e);
      return cb ? cb(err) : Promise.reject(err);
    }
  }

  async workflow(id, obj, cb) {
    if (!this.options.local || !id || typeof id === 'object' || cb) {
      // yuck. probably wrong.
      return super.workflow(id, obj, cb);
    }

    const WORKFLOW_DIR = path.join(this.options.url, 'workflows');
    const filename = path.join(WORKFLOW_DIR, id, 'workflow.json');

    try {
      const json = await fs.readJson(filename);
      return cb ? cb(null, json) : Promise.resolve(json);
    } catch (readWorkflowException) {
      return cb ? cb(readWorkflowException) : Promise.reject(readWorkflowException);
    }
  }

  async workflowInstances(first, second) {
    if (!this.options.local) {
      return super.workflowInstances(first, second);
    }
    let cb;
    let query;
    if (first && !(first instanceof Function) && second === undefined) {
      // no second argument and first argument is not a callback
      query = first;
    } else {
      cb = first;
      query = second;
    }

    if (query) {
      const err = new Error('querying of local instances unsupported in local mode');
      return cb ? cb(err) : Promise.reject(err);
    }

    const INSTANCE_DIR = path.join(this.options.url, 'instances');

    try {
      let data = await fs.readdir(INSTANCE_DIR);
      data = data.filter(id => fs.statSync(path.join(INSTANCE_DIR, id)).isDirectory());
      data = data.map(id => {
        const filename = path.join(INSTANCE_DIR, id, 'workflow.json');

        let workflow;
        try {
          workflow = fs.readJsonSync(filename);
        } catch (ignore) {
          workflow = {
            id_workflow: '-',
            description: '-',
            rev: '0.0',
          };
        }

        workflow.id_workflow_instance = id;
        workflow.filename = filename;
        return workflow;
      });
      return cb ? cb(null, data) : Promise.resolve(data);
    } catch (err) {
      return cb ? cb(err) : Promise.reject(err);
    }
  }

  // eslint-disable-next-line camelcase
  async workflow_instances(first, second) {
    deprecatedFunctionWarning('workflow_instances', 'workflowInstances');
    return this.workflowInstances(first, second);
  }

  async datasets(first, second) {
    if (!this.options.local) {
      return super.datasets(first, second);
    }
    let cb;
    let query;

    if (first && !(first instanceof Function) && second === undefined) {
      // no second argument and first argument is not a callback
      query = first;
    } else {
      cb = first;
      query = second;
    }

    if (!query) {
      query = {};
    }

    if (!query.show) {
      query.show = 'mine';
    }

    if (query.show !== 'mine') {
      return cb(new Error('querying of local datasets unsupported in local mode'));
    }

    const DATASET_DIR = path.join(this.options.url, 'datasets');
    try {
      let data = await fs.readdir(DATASET_DIR);
      data = data.filter(id => fs.statSync(path.join(DATASET_DIR, id)).isDirectory());

      let idDataset = 0;
      data = data.sort().map(id => {
        idDataset += 1;
        return {
          is_reference_dataset: true,
          summary: null,
          dataset_status: {
            status_label: 'Active',
            status_value: 'active',
          },
          size: 0,
          prefix: id,
          id_workflow_instance: null,
          id_account: null,
          is_consented_human: null,
          data_fields: null,
          component_id: null,
          uuid: id,
          is_shared: false,
          id_dataset: idDataset,
          id_user: null,
          last_modified: null,
          created: null,
          name: id,
          source: id,
          attributes: null,
        };
      });
      return cb ? cb(null, data) : Promise.resolve(data);
    } catch (err) {
      this.log.warn(err);
      return cb ? cb(null, []) : Promise.resolve([]);
    }
  }

  async bundleWorkflow(idWorkflow, filepath, progressCb) {
    // clean out target folder?
    // download tarball including workflow json
    // allocate install_token with STS credentials
    // initialise coastguard to perform ECR docker pull
    return utils.pipe(
      `workflow/bundle/${idWorkflow}.tar.gz`,
      filepath,
      this.options,
      progressCb,
    );
  }

  // eslint-disable-next-line camelcase
  async bundle_workflow(idWorkflow, filepath, progressCb) {
    deprecatedFunctionWarning('bundle_workflow', 'bundleWorkflow');
    return this.bundleWorkflow(idWorkflow, filepath, progressCb);
  }
}
