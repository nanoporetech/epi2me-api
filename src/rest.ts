/*
 * Copyright (c) 2019 Metrichor Ltd.
 * Authors: rpettett, gvanginkel
 */

import { assign, merge } from 'lodash';
import os from 'os';
import { utils } from './utils';
import { Logger } from './Logger';
import { EPI2ME_OPTIONS } from './epi2me-options';
import { AxiosResponse } from 'axios';
import {
  asArray,
  asRecord,
  asString,
  asArrayRecursive,
  isUndefined,
  isFunction,
  isArray,
  asIndex,
  asIndexable,
  asOptArrayRecursive,
  asOptIndex,
  Index,
  asOptString,
  asOptFunction,
} from './runtime-typecast';

import { ObjectDict } from './ObjectDict';

export type AsyncCallback = (err: unknown, data: unknown) => void;

export class REST {
  options: EPI2ME_OPTIONS;
  log: Logger;
  cachedResponses: Map<
    string,
    {
      etag: string;
      response: ObjectDict;
    }
  > = new Map();

  constructor(options: EPI2ME_OPTIONS) {
    this.options = options;
    this.log = this.options.log;
  }

  async list(entity: string): Promise<unknown[]> {
    const entityName = entity.match(/^[a-z_]+/i); // dataset?foo=bar => dataset
    if (!entityName) {
      throw new Error(`Failed to parse entity identifier`);
    }
    const json = await utils.get(entity, this.options);
    return asArray(json[`${entityName[0]}s`]);
  }

  read(entity: string, id: string): Promise<ObjectDict> {
    return utils.get(`${entity}/${id}`, this.options);
  }

  async user(): Promise<ObjectDict> {
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

  async status(): Promise<{
    agent_url: string;
    agent_version: string;
    db_version: string;
    minimum_agent: string;
    portal_version: string;
    remote_addr: string;
    server_time: string;
  }> {
    const res = await utils.get('status', this.options);
    return {
      agent_url: asString(res.agent_url),
      agent_version: asString(res.agent_version),
      db_version: asString(res.db_version),
      minimum_agent: asString(res.minimum_agent),
      portal_version: asString(res.portal_version),
      remote_addr: asString(res.remote_addr),
      server_time: asString(res.server_time),
    };
  }

  async jwt(): Promise<string> {
    const customJWTHandler = async (res: AxiosResponse): Promise<string> => {
      if (res.headers['x-epi2me-jwt']) {
        return res.headers['x-epi2me-jwt'];
      }
      throw new Error('failed to fetch JWT');
    };
    const result = await utils.post('authenticate', {}, { ...this.options, handler: customJWTHandler });
    return asString(result);
  }

  async instanceToken(id: unknown, opts: {}): Promise<ObjectDict> {
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

  async installToken(id: unknown): Promise<ObjectDict> {
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

  attributes(): Promise<unknown> {
    return this.list('attribute');
  }

  async workflows(cb?: (err: unknown, data: unknown) => void): Promise<unknown> {
    const promise = this.list('workflow');
    // NOTE this callback format is likely not used. however, the child class
    // rest_fs does take an optional callback argument. hence this is to ensure
    // interface compatibility between the 2 of them
    if (cb) {
      try {
        const data = await promise;
        cb(null, data);
      } catch (err) {
        cb(err, null);
      }
    }
    return promise;
  }

  amiImages(): Promise<unknown> {
    if (this.options.local) {
      throw new Error('amiImages unsupported in local mode');
    }

    return this.list('ami_image');
  }

  /**
   * @deprecated
   * Use the more specific updateAmiImage/createAmiImage/readAmiImage calls
   */
  amiImage(first: string | ObjectDict, second?: ObjectDict): Promise<ObjectDict> {
    if (this.options.local) {
      throw new Error('ami_image unsupported in local mode');
    }

    // if we have 2 arguments then preform update
    if (second instanceof Object) {
      return this.updateAmiImage(asString(first), asRecord(second));
      // if we have 1 object argument then perform create
    } else if (first instanceof Object) {
      return utils.post('ami_image', asRecord(first), this.options);
      // otherwise we should have 1 string argument
    } else {
      return this.read('ami_image', asString(first));
    }
  }

  updateAmiImage(id: string, obj: ObjectDict): Promise<ObjectDict> {
    return utils.put('ami_image', id, obj, this.options);
  }

  createAmiImage(obj: ObjectDict): Promise<ObjectDict> {
    return utils.post('ami_image', obj, this.options);
  }

  readAmiImage(id: string): Promise<ObjectDict> {
    return this.read('ami_image', id);
  }

  async workflow(first: string | ObjectDict, second?: ObjectDict | Function, third?: Function): Promise<unknown> {
    if (first && second && third instanceof Function) {
      return this.updateWorkflow(asString(first), asRecord(second), third);
    } else if (first && second instanceof Object && !(second instanceof Function)) {
      return this.updateWorkflow(asString(first), asRecord(second));
    } else if (first instanceof Object && second instanceof Function) {
      return this.createWorkflow(asRecord(first), second);
    } else if (first instanceof Object && !second) {
      return this.createWorkflow(asRecord(first));
    }

    // read with callback or promise
    const id = asOptString(first);
    const cb = asOptFunction(second);

    // two args: get object: (123, func)

    if (!id) {
      const err = new Error('no workflow id specified');
      return cb ? cb(err) : Promise.reject(err);
    }

    const workflow: ObjectDict = {};
    try {
      const struct = await this.read('workflow', id);
      if (struct.error) {
        throw new Error(struct.error + '');
      }
      merge(workflow, struct);
    } catch (err) {
      this.log.error(`${id}: error fetching workflow ${String(err)}`);
      if (cb) {
        cb(err);
        return;
      }
      throw err;
    }

    // placeholder
    merge(workflow, {
      params: {},
    });

    try {
      const workflowConfig = await utils.get(`workflow/config/${id}`, this.options);
      if (workflowConfig.error) {
        throw new Error(workflowConfig.error + '');
      }
      merge(workflow, workflowConfig);
    } catch (err) {
      this.log.error(`${id}: error fetching workflow config ${String(err)}`);
      if (cb) {
        cb(err);
        return;
      }
      throw err;
    }

    // NOTE it would appear that params can be either an array or an object, the tests are not consistent
    const params = isArray(workflow.params) ? asArray(workflow.params) : asRecord(workflow.params);
    // MC-6483 - fetch ajax options for "AJAX drop down widget"

    const toFetch = Object.values(params)
      .map((value: unknown) => asRecord(value))
      .filter((obj: ObjectDict) => obj.widget === 'ajax_dropdown');

    const promises = [
      ...toFetch.map(async (param: ObjectDict) => {
        if (isUndefined(param)) {
          // NOTE should be unreachable
          throw new Error('parameter is undefined');
        }

        const values = asRecord(param.values);
        const items = asRecord(values.items);
        const uri = asString(values.source)
          .replace('{{EPI2ME_HOST}}', '')
          .replace(/&?apikey=\{\{EPI2ME_API_KEY\}\}/, '');

        let workflowParam;
        try {
          workflowParam = await utils.get(uri, this.options);
        } catch (err) {
          this.log.error(`failed to fetch ${uri}`);
          if (cb) {
            cb(err);
            return;
          }
          throw err;
        }
        // e.g. {datasets:[...]} from the /dataset.json list response
        // NOTE unclear if data_root is number | string

        const index = asOptIndex(values.data_root);
        // NOTE dataRoot appears to be an array of object/arrays
        const dataRoot = asOptArrayRecursive(isUndefined(index) ? index : workflowParam[index], asIndexable); // e.g. [{dataset},{dataset}]

        if (dataRoot) {
          param.values = dataRoot.map((o) => ({
            // does this really end up back in workflow object?
            label: o[asIndex(items.label_key)],
            value: o[asIndex(items.value_key)],
          }));
        }
        // });
      }),
    ];

    try {
      await Promise.all(promises);
      if (cb) {
        cb(null, workflow);
      }
    } catch (err) {
      this.log.error(`${id}: error fetching config and parameters ${String(err)}`);
      if (cb) {
        cb(err);
      } else {
        throw err;
      }
    }
    return workflow;
  }

  async updateWorkflow(id: string, obj: ObjectDict, cb?: Function): Promise<ObjectDict> {
    const promise = utils.put('workflow', id, obj, this.options);
    if (cb) {
      try {
        cb(null, await promise);
      } catch (err) {
        cb(err);
      }
    }
    return promise;
  }

  async createWorkflow(obj: ObjectDict, cb?: Function): Promise<ObjectDict> {
    const promise = utils.post('workflow', obj, this.options);
    if (cb) {
      try {
        cb(null, await promise);
      } catch (err) {
        cb(err);
      }
    }
    return promise;
  }

  async startWorkflow(config: ObjectDict): Promise<ObjectDict> {
    return utils.post('workflow_instance', config, { ...this.options, legacy_form: true });
  }

  async stopWorkflow(idWorkflowInstance: Index): Promise<ObjectDict> {
    return utils.put(
      'workflow_instance/stop',
      idWorkflowInstance.toString(),
      {},
      { ...this.options, legacy_form: true },
    );
  }

  async workflowInstances(query?: { run_id?: string }): Promise<unknown> {
    if (!query || !query.run_id) {
      return this.list('workflow_instance');
    }

    const json = await utils.get(
      `workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=${query.run_id};`,
      this.options,
    );

    const data = asArrayRecursive(json.data, asRecord);
    return data.map((o: ObjectDict) => ({
      id_workflow_instance: o.id_ins,
      id_workflow: o.id_flo,
      run_id: o.run_id,
      description: o.desc,
      rev: o.rev,
    }));
  }

  async workflowInstance(id: Index): Promise<ObjectDict> {
    return this.read('workflow_instance', id + '');
  }

  async workflowConfig(id: string): Promise<ObjectDict> {
    return utils.get(`workflow/config/${id}`, this.options);
  }

  async register(code: string, description: unknown): Promise<ObjectDict> {
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

  // HACK the signature of datasets does not match that of it's inherited class
  // hence to unify them 2 modifications had to be made. Firstly this may now
  // accept a function ( although it will throw an error at runtime ) and secondly
  // the return type has been made into Promise<unknown>, as the inherited class
  // can return any type.
  async datasets(query: { show?: string } | AsyncCallback = {}): Promise<unknown> {
    if (isFunction(query)) {
      throw new Error('Unexpected callback instead of query');
    }
    // TODO this has side effects, do we rely on them?
    if (!query.show) {
      query.show = 'mine';
    }

    const sets = await this.list(`dataset?show=${query.show}`);
    return asArrayRecursive(sets, asRecord);
  }

  async dataset(id: string): Promise<unknown> {
    if (!this.options.local) {
      return this.read('dataset', id);
    }

    const datasets = asArrayRecursive(await this.datasets(), asRecord);

    return datasets.find((o) => o.id_dataset === id);
  }

  async fetchContent(url: string): Promise<ObjectDict> {
    const options = {
      ...this.options,
      skip_url_mangle: true,
      headers: {
        'Content-Type': '',
      },
    };

    let etag;
    try {
      const head = await utils.head(url, options);
      etag = head.headers.etag;

      const cachedRes = this.cachedResponses.get(url);
      if (etag && cachedRes && cachedRes.etag === etag) {
        return cachedRes.response;
      }
    } catch (headException) {
      this.log.warn(`Failed to HEAD request ${url}: ${String(headException)}`);
    }

    const response = await utils.get(url, options);
    // cache only if the URLs endpoint supports HEAD requests with etag in the response
    if (etag) {
      this.cachedResponses.set(url, {
        etag,
        response,
      });
    }
    return response;
  }
}
