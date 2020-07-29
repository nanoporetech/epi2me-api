/*
 * Copyright (c) 2019 Metrichor Ltd.
 * Authors: rpettett,gvanginkel
 */
import fs from 'fs-extra';
import path from 'path';
import REST, { AsyncCallback } from './rest';
import utils from './utils-fs';
import { asFunction, asRecord, asOptFunction, asOptRecord } from './runtime-typecast';
import { ObjectDict } from './ObjectDict';
import { isFunction } from 'util';

export default class REST_FS extends REST {
  async workflows(cb?: AsyncCallback): Promise<unknown> {
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
      return cb ? cb(err, null) : Promise.reject(err);
    }
  }

  async workflow(id: unknown, obj: unknown, cb?: AsyncCallback): Promise<unknown> {
    if (!this.options.local || !id || typeof id === 'object' || cb) {
      // yuck. probably wrong.
      return super.workflow(id, obj, cb);
    }

    const WORKFLOW_DIR = path.join(this.options.url, 'workflows');
    const filename = path.join(WORKFLOW_DIR, id + "", 'workflow.json');

    // HACK this is the original behavior, due to the somewhat questionable conditional
    // cb is in fact "never" here, so doesn't work. Commenting this out has not changed
    // the current behavior, but that top conditional is likely not behaving correctly anyway.

    // try {
    //   const json = await fs.readJson(filename);
    //   return cb ? cb(null, json) : Promise.resolve(json);
    // } catch (readWorkflowException) {
    //   return cb ? cb(readWorkflowException) : Promise.reject(readWorkflowException);
    // }

    return fs.readJSON(filename);
  }

  async workflowInstances(first?: ObjectDict | AsyncCallback, second?: ObjectDict): Promise<unknown> {
    if (!this.options.local) {
      if (isFunction(first) || second) {
        throw new Error('Local workflows cannot accept a callback');
      }
      return super.workflowInstances(asOptRecord(first));
    }
    let cb;
    let query;
    if (first && !(first instanceof Function) && second === undefined) {
      // no second argument and first argument is not a callback
      query = first;
    } else {
      cb = asOptFunction(first);
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

  async datasets(first: { show?: string } | AsyncCallback, second?: { show?: string }): Promise<unknown> {
    let cb: AsyncCallback | undefined;
    let query: { show?: string };

    if (first && !(first instanceof Function) && second === undefined) {
      // no second argument and first argument is not a callback
      query = first;
    } else {
      cb = asFunction(first) as AsyncCallback;
      query = second ?? {};
    }

    if (!query.show) {
      query.show = 'mine';
    }

    if (!this.options.local) {
      if (cb) {
        throw new Error('Callback is not supported in local mode');
      }
      return super.datasets(asRecord(first));
    }

    if (query.show !== 'mine') {
      const err = new Error('querying of local datasets unsupported in local mode');
      if (cb) {
        return cb(err, null);
      } else {
        throw err;
      }
    }

    const DATASET_DIR = path.join(this.options.url, 'datasets');
    try {
      const folders = (await fs.readdir(DATASET_DIR))
        .filter((id: string) => fs.statSync(path.join(DATASET_DIR, id)).isDirectory());

      let idDataset = 0;
      const data = folders.sort().map(id => {
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

  async bundleWorkflow(idWorkflow: string, filepath: string, progressCb: (e: unknown) => void): Promise<unknown> {
    // clean out target folder?
    // download tarball including workflow json
    // allocate install_token with STS credentials
    // initialise coastguard to perform ECR docker pull
    return utils.pipe(`workflow/bundle/${idWorkflow}.tar.gz`, filepath, this.options, progressCb);
  }
}
