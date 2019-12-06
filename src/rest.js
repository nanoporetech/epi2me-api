/*
 * Copyright (c) 2019 Metrichor Ltd.
 * Authors: rpettett, gvanginkel
 */

import os from 'os';
import { merge, filter, assign } from 'lodash';
import utils from './utils';
import { local, url as baseURL, user_agent as userAgent, signing } from './default_options.json';

export default class REST {
  constructor(options) {
    // {log, ...options}) {
    this.options = assign(
      {
        agent_version: utils.version,
        local,
        url: baseURL,
        user_agent: userAgent,
        signing,
      },
      options,
    );

    this.log = this.options.log;
  }

  async list(entity) {
    try {
      const json = await utils.get(entity, this.options);
      const entityName = entity.match(/^[a-z_]+/i)[0]; // dataset?foo=bar => dataset
      return Promise.resolve(json[`${entityName}s`]);
    } catch (err) {
      this.log.error(`list error ${String(err)}`);
      return Promise.reject(err);
    }
  }

  async read(entity, id) {
    try {
      const json = await utils.get(`${entity}/${id}`, this.options);
      return Promise.resolve(json);
    } catch (e) {
      this.log.error('read', e);
      return Promise.reject(e);
    }
  }

  async user(cb) {
    let data;

    if (this.options.local) {
      data = {
        accounts: [
          {
            id_user_account: 'none',
            number: 'NONE',
            name: 'None',
          },
        ],
      }; // fake user with accounts
    } else {
      try {
        data = await utils.get('user', this.options);
      } catch (err) {
        return cb ? cb(err) : Promise.reject(err);
      }
    }
    return cb ? cb(null, data) : Promise.resolve(data);
  }

  async status() {
    try {
      const data = await utils.get('status', this.options);
      return Promise.resolve(data);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async jwt() {
    try {
      const customJWTHandler = res => {
        return res.headers['x-epi2me-jwt']
          ? Promise.resolve(res.headers['x-epi2me-jwt'])
          : Promise.reject(new Error('failed to fetch JWT'));
      };
      const data = await utils.post('authenticate', {}, merge({ handler: customJWTHandler }, this.options));
      return Promise.resolve(data);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async instanceToken(id, opts) {
    try {
      const data = await utils.post(
        'token',
        merge(opts, {
          id_workflow_instance: id,
        }),
        assign({}, this.options, {
          legacy_form: true,
        }),
      );
      return Promise.resolve(data);
    } catch (err) {
      return Promise.reject(err);
    }
  }

  async installToken(id, cb) {
    try {
      const data = await utils.post(
        'token/install',
        {
          id_workflow: id,
        },
        assign({}, this.options, {
          legacy_form: true,
        }),
      );
      return cb ? cb(null, data) : Promise.resolve(data);
    } catch (err) {
      return cb ? cb(err) : Promise.reject(err);
    }
  }

  async attributes(cb) {
    try {
      const data = await this.list('attribute');
      return cb ? cb(null, data) : Promise.resolve(data);
    } catch (err) {
      return cb ? cb(err) : Promise.reject(err);
    }
  }

  async workflows(cb) {
    try {
      const data = await this.list('workflow');
      return cb ? cb(null, data) : Promise.resolve(data);
    } catch (err) {
      return cb ? cb(err) : Promise.reject(err);
    }
  }

  async amiImages(cb) {
    if (this.options.local) {
      const err = new Error('amiImages unsupported in local mode');
      return cb ? cb(err) : Promise.reject(err);
    }

    try {
      const data = this.list('ami_image');
      return cb ? cb(null, data) : Promise.resolve(data);
    } catch (err) {
      return cb ? cb(err) : Promise.reject(err);
    }
  }

  async amiImage(first, second, third) {
    let id;
    let obj;
    let cb;
    let action;
    if (first && second && third instanceof Function) {
      // update with callback
      id = first;
      obj = second;
      cb = third;
      action = 'update';
    } else if (first && second instanceof Object && !(second instanceof Function)) {
      // update with promise
      id = first;
      obj = second;
      action = 'update';
    } else if (first instanceof Object && second instanceof Function) {
      // create with callback
      obj = first;
      cb = second;
      action = 'create';
    } else if (first instanceof Object && !second) {
      // create with promise
      obj = first;
      action = 'create';
    } else {
      // read with callback or promise
      action = 'read';
      id = first;
      cb = second instanceof Function ? second : null;
    }

    if (this.options.local) {
      const err = new Error('ami_image unsupported in local mode');
      return cb ? cb(err) : Promise.reject(err);
    }

    if (action === 'update') {
      // three args: update object
      try {
        const update = await utils.put('ami_image', id, obj, this.options);
        return cb ? cb(null, update) : Promise.resolve(update);
      } catch (err) {
        return cb ? cb(err) : Promise.reject(err);
      }
    }

    if (action === 'create') {
      // two args: create
      try {
        const create = await utils.post('ami_image', obj, this.options);
        return cb ? cb(null, create) : Promise.resolve(create);
      } catch (err) {
        return cb ? cb(err) : Promise.reject(err);
      }
    }

    if (!id) {
      const err = new Error('no id_ami_image specified');
      return cb ? cb(err) : Promise.reject(err);
    }

    try {
      const image = await this.read('ami_image', id);
      return cb ? cb(null, image) : Promise.resolve(image);
    } catch (err) {
      return cb ? cb(err) : Promise.reject(err);
    }
  }

  async workflow(first, second, third) {
    let id;
    let obj;
    let cb;
    let action;
    if (first && second && third instanceof Function) {
      // update with callback
      id = first;
      obj = second;
      cb = third;
      action = 'update';
    } else if (first && second instanceof Object && !(second instanceof Function)) {
      // update with promise
      id = first;
      obj = second;
      action = 'update';
    } else if (first instanceof Object && second instanceof Function) {
      // create with callback
      obj = first;
      cb = second;
      action = 'create';
    } else if (first instanceof Object && !second) {
      // create with promise
      obj = first;
      action = 'create';
    } else {
      // read with callback or promise
      action = 'read';
      id = first;
      cb = second instanceof Function ? second : null;
    }

    if (action === 'update') {
      // three args: update object: (123, {...}, func)
      try {
        const update = await utils.put('workflow', id, obj, this.options);
        return cb ? cb(null, update) : Promise.resolve(update);
      } catch (err) {
        return cb ? cb(err) : Promise.reject(err);
      }
    }

    if (action === 'create') {
      // two args: create object: ({...}, func)

      try {
        const create = await utils.post('workflow', obj, this.options);
        return cb ? cb(null, create) : Promise.resolve(create);
      } catch (err) {
        return cb ? cb(err) : Promise.reject(err);
      }
    }

    // two args: get object: (123, func)

    if (!id) {
      const err = new Error('no workflow id specified');
      return cb ? cb(err) : Promise.reject(err);
    }

    const workflow = {};
    try {
      const struct = await this.read('workflow', id);
      if (struct.error) {
        throw new Error(struct.error);
      }
      merge(workflow, struct);
    } catch (err) {
      this.log.error(`${id}: error fetching workflow ${String(err)}`);
      return cb ? cb(err) : Promise.reject(err);
    }

    // placeholder
    merge(workflow, {
      params: {},
    });

    try {
      const workflowConfig = await utils.get(`workflow/config/${id}`, this.options);
      if (workflowConfig.error) {
        throw new Error(workflowConfig.error);
      }
      merge(workflow, workflowConfig);
    } catch (err) {
      this.log.error(`${id}: error fetching workflow config ${String(err)}`);
      return cb ? cb(err) : Promise.reject(err);
    }

    // MC-6483 - fetch ajax options for "AJAX drop down widget"
    const toFetch = filter(workflow.params, {
      widget: 'ajax_dropdown',
    });

    const promises = [
      ...toFetch.map((iterObj, i) => {
        const param = toFetch[i]; // so we can explicitly reassign to the iterator without eslint complaints
        return new Promise((resolve, reject) => {
          const uri = param.values.source.replace('{{EPI2ME_HOST}}', '').replace(/&?apikey=\{\{EPI2ME_API_KEY\}\}/, '');

          utils
            .get(uri, this.options) // e.g. {datasets:[...]} from the /dataset.json list response
            .then(workflowParam => {
              const dataRoot = workflowParam[param.values.data_root]; // e.g. [{dataset},{dataset}]

              if (dataRoot) {
                param.values = dataRoot.map(o => ({
                  // does this really end up back in workflow object?
                  label: o[param.values.items.label_key],
                  value: o[param.values.items.value_key],
                }));
              }
              return resolve();
            })

            .catch(err => {
              this.log.error(`failed to fetch ${uri}`);
              return reject(err);
            });
        });
      }),
    ];

    try {
      await Promise.all(promises);
      return cb ? cb(null, workflow) : Promise.resolve(workflow);
    } catch (err) {
      this.log.error(`${id}: error fetching config and parameters ${String(err)}`);
      return cb ? cb(err) : Promise.reject(err);
    }
  }

  async startWorkflow(config, cb) {
    return utils.post(
      'workflow_instance',
      config,
      assign({}, this.options, {
        legacy_form: true,
      }),
      cb,
    );
  }

  stopWorkflow(idWorkflowInstance, cb) {
    return utils.put(
      'workflow_instance/stop',
      idWorkflowInstance,
      null,
      assign({}, this.options, {
        legacy_form: true,
      }),
      cb,
    );
  }

  async workflowInstances(first, second) {
    let cb;
    let query;

    if (first && !(first instanceof Function) && second === undefined) {
      // no second argument and first argument is not a callback
      query = first;
    } else {
      cb = first;
      query = second;
    }

    if (query && query.run_id) {
      try {
        const json = await utils.get(
          `workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=${query.run_id};`,
          this.options,
        );
        const mapped = json.data.map(o => ({
          id_workflow_instance: o.id_ins,
          id_workflow: o.id_flo,
          run_id: o.run_id,
          description: o.desc,
          rev: o.rev,
        }));
        return cb ? cb(null, mapped) : Promise.resolve(mapped);
      } catch (err) {
        return cb ? cb(err) : Promise.reject(err);
      }
    }

    try {
      const data = await this.list('workflow_instance');
      return cb ? cb(null, data) : Promise.resolve(data);
    } catch (err) {
      return cb ? cb(err) : Promise.reject(err);
    }
  }

  async workflowInstance(id, cb) {
    try {
      const workflowInstance = await this.read('workflow_instance', id);
      return cb ? cb(null, workflowInstance) : Promise.resolve(workflowInstance);
    } catch (err) {
      return cb ? cb(err) : Promise.reject(err);
    }
  }

  workflowConfig(id, cb) {
    return utils.get(`workflow/config/${id}`, this.options, cb);
  }

  async register(code, second, third) {
    let description;
    let cb;

    if (second && second instanceof Function) {
      cb = second;
    } else {
      description = second;
      cb = third;
    }

    try {
      const obj = await utils.put(
        'reg',
        code,
        {
          description: description || `${os.userInfo().username}@${os.hostname()}`,
        },
        assign({}, this.options, {
          signing: false,
        }),
      );
      return cb ? cb(null, obj) : Promise.resolve(obj);
    } catch (err) {
      return cb ? cb(err) : Promise.reject(err);
    }
  }

  async datasets(first, second) {
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

    try {
      const obj = await this.list(`dataset?show=${query.show}`);
      return cb ? cb(null, obj) : Promise.resolve(obj);
    } catch (err) {
      return cb ? cb(err) : Promise.reject(err);
    }
  }

  async dataset(id, cb) {
    if (!this.options.local) {
      try {
        const dataset = await this.read('dataset', id);
        return cb ? cb(null, dataset) : Promise.resolve(dataset);
      } catch (err) {
        return cb ? cb(err) : Promise.reject(err);
      }
    }

    try {
      const datasets = await this.datasets();
      const dataset = datasets.find(o => o.id_dataset === id);
      return cb ? cb(null, dataset) : Promise.resolve(dataset);
    } catch (err) {
      return cb ? cb(err) : Promise.reject(err);
    }
  }

  async fetchContent(url, cb) {
    const options = assign({}, this.options, {
      skip_url_mangle: true,
      headers: {
        'Content-Type': '',
      },
    });
    try {
      const result = await utils.get(url, options);
      return cb ? cb(null, result) : Promise.resolve(result);
    } catch (err) {
      return cb ? cb(err) : Promise.reject(err);
    }
  }
}
