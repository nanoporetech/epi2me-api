/*
 * Copyright (c) 2019 Metrichor Ltd.
 * Authors: rpettett, gvanginkel
 */

import os from 'os';
import { utils } from './utils';
import { Logger } from './Logger';
import { EPI2ME_OPTIONS } from './epi2me-options';
import { AxiosResponse } from 'axios';
import {
  asArray,
  asArrayOf,
  asIndex,
  asOptArrayOf,
  asOptFunction,
  asOptIndex,
  asOptString,
  asDictionary,
  asString,
  Index,
  isArray,
  isFunction,
  isUndefined,
  Dictionary,
  isDefined,
  UnknownFunction,
  isIndexable,
  isDictionary,
} from 'ts-runtime-typecheck';

export type AsyncCallback = (err: unknown, data: unknown) => void;

export class REST {
  options: EPI2ME_OPTIONS;
  log: Logger;
  cachedResponses: Map<
    string,
    {
      etag: string;
      response: Dictionary;
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

  read(entity: string, id: string): Promise<Dictionary> {
    return utils.get(`${entity}/${id}`, this.options);
  }

  async user(): Promise<Dictionary> {
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

  async instanceToken(id: unknown, opts: Partial<EPI2ME_OPTIONS>): Promise<Dictionary> {
    return utils.post(
      'token',
      {
        ...opts,
        id_workflow_instance: id,
      },
      {
        ...this.options,
        legacy_form: true,
      },
    );
  }

  async installToken(id: unknown): Promise<Dictionary> {
    return utils.post(
      'token/install',
      {
        id_workflow: id,
      },
      {
        ...this.options,
        legacy_form: true,
      },
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
  amiImage(first: string | Dictionary, second?: Dictionary): Promise<Dictionary> {
    if (this.options.local) {
      throw new Error('ami_image unsupported in local mode');
    }

    // if we have 2 arguments then preform update
    if (second instanceof Object) {
      return this.updateAmiImage(asString(first), asDictionary(second));
      // if we have 1 object argument then perform create
    } else if (first instanceof Object) {
      return utils.post('ami_image', asDictionary(first), this.options);
      // otherwise we should have 1 string argument
    } else {
      return this.read('ami_image', asString(first));
    }
  }

  updateAmiImage(id: string, obj: Dictionary): Promise<Dictionary> {
    return utils.put('ami_image', id, obj, this.options);
  }

  createAmiImage(obj: Dictionary): Promise<Dictionary> {
    return utils.post('ami_image', obj, this.options);
  }

  readAmiImage(id: string): Promise<Dictionary> {
    return this.read('ami_image', id);
  }

  async workflow(
    first: string | Dictionary,
    second?: Dictionary | UnknownFunction,
    third?: UnknownFunction,
  ): Promise<unknown> {
    if (first && second && third instanceof Function) {
      return this.updateWorkflow(asString(first), asDictionary(second), third);
    } else if (first && second instanceof Object && !(second instanceof Function)) {
      return this.updateWorkflow(asString(first), asDictionary(second));
    } else if (first instanceof Object && second instanceof Function) {
      return this.createWorkflow(asDictionary(first), second);
    } else if (first instanceof Object && !second) {
      return this.createWorkflow(asDictionary(first));
    }

    // read with callback or promise
    const id = asOptString(first);
    const cb = asOptFunction(second);

    // two args: get object: (123, func)

    if (!id) {
      const err = new Error('no workflow id specified');
      return cb ? cb(err) : Promise.reject(err);
    }

    let workflow: Dictionary;
    try {
      workflow = await this.read('workflow', id);
      if (workflow.error) {
        throw new Error(workflow.error + '');
      }
    } catch (err) {
      this.log.error(`${id}: error fetching workflow ${String(err)}`);
      if (cb) {
        cb(err);
        return;
      }
      throw err;
    }

    workflow = {
      params: {},
      ...workflow,
    };

    try {
      const workflowConfig = await utils.get(`workflow/config/${id}`, this.options);
      if (workflowConfig.error) {
        throw new Error(workflowConfig.error + '');
      }
      workflow = {
        ...workflow,
        ...workflowConfig,
      };
    } catch (err) {
      this.log.error(`${id}: error fetching workflow config ${String(err)}`);
      if (cb) {
        cb(err);
        return;
      }
      throw err;
    }

    // NOTE it would appear that params can be either an array or an object, the tests are not consistent
    const params = isArray(workflow.params) ? asArray(workflow.params) : asDictionary(workflow.params);
    // MC-6483 - fetch ajax options for "AJAX drop down widget"

    const toFetch = Object.values(params)
      .map((value: unknown) => asDictionary(value))
      .filter((obj: Dictionary) => obj.widget === 'ajax_dropdown');

    const promises = [
      ...toFetch.map(async (param: Dictionary) => {
        if (isUndefined(param)) {
          // NOTE should be unreachable
          throw new Error('parameter is undefined');
        }

        const values = asDictionary(param.values);
        const items = asDictionary(values.items);
        const uri = asString(values.source)
          .replace('{{EPI2ME_HOST}}', '')
          .replace(/&?apikey=\{\{EPI2ME_API_KEY\}\}/, '');

        let workflowParam: Dictionary;
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
        const dataRoot = isDefined(index) && asOptArrayOf(isIndexable)(workflowParam[index]); // e.g. [{dataset},{dataset}]

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

  async updateWorkflow(id: string, obj: Dictionary, cb?: UnknownFunction): Promise<Dictionary> {
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

  async createWorkflow(obj: Dictionary, cb?: UnknownFunction): Promise<Dictionary> {
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

  async startWorkflow(config: Dictionary): Promise<Dictionary> {
    return utils.post('workflow_instance', config, { ...this.options, legacy_form: true });
  }

  async stopWorkflow(idWorkflowInstance: Index): Promise<Dictionary> {
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

    const data = asArrayOf(isDictionary)(json.data);
    return data.map((o: Dictionary) => ({
      id_workflow_instance: o.id_ins,
      id_workflow: o.id_flo,
      run_id: o.run_id,
      description: o.desc,
      rev: o.rev,
    }));
  }

  async workflowInstance(id: Index): Promise<Dictionary> {
    return this.read('workflow_instance', id + '');
  }

  async workflowConfig(id: string): Promise<Dictionary> {
    return utils.get(`workflow/config/${id}`, this.options);
  }

  async register(code: string, description: unknown): Promise<Dictionary> {
    return utils.put(
      'reg',
      code,
      {
        description: description || `${os.userInfo().username}@${os.hostname()}`,
      },
      {
        ...this.options,
        signing: false,
      },
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
    return asArrayOf(isDictionary)(sets);
  }

  async dataset(id: string): Promise<unknown> {
    if (!this.options.local) {
      return this.read('dataset', id);
    }

    const datasets = asArrayOf(isDictionary)(await this.datasets());

    return datasets.find((o) => o.id_dataset === id);
  }

  async fetchContent(url: string): Promise<Dictionary> {
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
