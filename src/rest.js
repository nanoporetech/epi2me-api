/*
 * Copyright (c) 2019 Metrichor Ltd.
 * Authors: rpettett, gvanginkel
 */

import { assign, filter, merge } from 'lodash';
import os from 'os';
import { local, signing, url as baseURL, user_agent as userAgent } from './default_options.json';
import utils from './utils';

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
    this.cachedResponses = {};
  }

  async list(entity) {
    const entityName = entity.match(/^[a-z_]+/i)[0]; // dataset?foo=bar => dataset
    return utils.get(entity, this.options).then(json => {
      return json[`${entityName}s`];
    });
  }

  async read(entity, id) {
    return utils.get(`${entity}/${id}`, this.options);
  }

  async user() {
    if (this.options.local) {
      return {
        accounts: [
          {
            id_user_account: 'none',
            number: 'NONE',
            name: 'None',
          },
        ],
      }; // fake user with accounts
    }
    return utils.get('user', this.options);
  }

  async status() {
    return utils.get('status', this.options);
  }

  async jwt() {
    const customJWTHandler = res => {
      return res.headers['x-epi2me-jwt']
        ? Promise.resolve(res.headers['x-epi2me-jwt'])
        : Promise.reject(new Error('failed to fetch JWT'));
    };
    return utils.post(
      'authenticate',
      {},
      merge(
        {
          handler: customJWTHandler,
        },
        this.options,
      ),
    );
  }

  async instanceToken(id, opts) {
    return utils.post(
      'token',
      merge(opts, {
        id_workflow_instance: id,
      }),
      assign({}, this.options, {
        legacy_form: true,
      }),
    );
  }

  async installToken(id) {
    return utils.post(
      'token/install',
      {
        id_workflow: id,
      },
      assign({}, this.options, {
        legacy_form: true,
      }),
    );
  }

  async attributes() {
    return this.list('attribute');
  }

  async workflows() {
    return this.list('workflow');
  }

  async amiImages() {
    if (this.options.local) {
      throw new Error('amiImages unsupported in local mode');
    }

    return this.list('ami_image');
  }

  async amiImage(first, second) {
    let id;
    let obj;
    let action;

    if (first && second instanceof Object) {
      // update with promise
      id = first;
      obj = second;
      action = 'update';
    } else if (first instanceof Object && !second) {
      // create with promise
      obj = first;
      action = 'create';
    } else {
      // read with callback or promise
      action = 'read';
      id = first;
    }

    if (this.options.local) {
      throw new Error('ami_image unsupported in local mode');
    }

    if (action === 'update') {
      return utils.put('ami_image', id, obj, this.options);
    }

    if (action === 'create') {
      return utils.post('ami_image', obj, this.options);
    }

    if (!id) {
      throw new Error('no id_ami_image specified');
    }

    return this.read('ami_image', id);
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

  async startWorkflow(config) {
    console.log('CONFIG: ', config);
    console.log('OPTS: ', this.options);
    return utils.post(
      'workflow_instance',
      config,
      assign({}, this.options, {
        legacy_form: true,
      }),
    );
  }

  async stopWorkflow(idWorkflowInstance) {
    return utils.put(
      'workflow_instance/stop',
      idWorkflowInstance,
      null,
      assign({}, this.options, {
        legacy_form: true,
      }),
    );
  }

  async workflowInstances(query) {
    if (!query || !query.run_id) {
      return this.list('workflow_instance');
    }

    return utils
      .get(
        `workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=${query.run_id};`,
        this.options,
      )
      .then(json => {
        return json.data.map(o => ({
          id_workflow_instance: o.id_ins,
          id_workflow: o.id_flo,
          run_id: o.run_id,
          description: o.desc,
          rev: o.rev,
        }));
      });
  }

  async workflowInstance(id) {
    return this.read('workflow_instance', id);
  }

  async workflowConfig(id) {
    return utils.get(`workflow/config/${id}`, this.options);
  }

  async register(code, description) {
    return utils.put(
      'reg',
      code,
      {
        description: description || `${os.userInfo().username}@${os.hostname()}`,
      },
      assign({}, this.options, {
        signing: false,
      }),
    );
  }

  async datasets(queryIn) {
    let query = queryIn;
    if (!query) {
      query = {};
    }

    if (!query.show) {
      query.show = 'mine';
    }

    return this.list(`dataset?show=${query.show}`);
  }

  async dataset(id) {
    if (!this.options.local) {
      return this.read('dataset', id);
    }

    return this.datasets().then(datasets => {
      return datasets.find(o => o.id_dataset === id);
    });
  }

  async fetchContent(url) {
    const options = assign({}, this.options, {
      skip_url_mangle: true,
      headers: {
        'Content-Type': '',
      },
    });
    const {
      headers: { etag },
    } = await utils.head(url, options);

    if (etag && this.cachedResponses[url] && this.cachedResponses[url].etag === etag) {
      return this.cachedResponses[url].response;
    }
    const response = await utils.get(url, options);
    // cache only if the URLs endpoint supports HEAD requests with etag in the response
    if (etag) {
      this.cachedResponses[url] = {
        etag,
        response,
      };
    }
    return response;
  }
}
