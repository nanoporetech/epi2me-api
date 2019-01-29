/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2019
 */

'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var os = _interopDefault(require('os'));
var lodash = require('lodash');
var axios = _interopDefault(require('axios'));
var crypto = _interopDefault(require('crypto'));

/*
 * Copyright (c) 2018 Metrichor Ltd.
 * Author: ahurst
 * When: 2016-05-17
 *
 */

const VERSION = require('../package.json').version;

axios.defaults.validateStatus = status => status <= 504; // Reject only if the status code is greater than or equal to 500

const utils = (function magic() {
  const internal = {
    sign: (req, options) => {
      // common headers required for everything
      if (!req.headers) {
        req.headers = {};
      }

      if (!options) {
        options = {};
      }

      if (!options.apikey) {
        // cannot sign without apikey
        return;
      }
      req.headers['X-EPI2ME-ApiKey'] = options.apikey; // better than a logged CGI parameter

      if (!options.apisecret) {
        // cannot sign without apisecret
        return;
      }

      // timestamp mitigates replay attack outside a tolerance window determined by the server
      req.headers['X-EPI2ME-SignatureDate'] = new Date().toISOString();

      if (req.uri.match(/^https:/)) {
        // MC-6412 - signing generated with https://...:443 but validated with https://...
        req.uri = req.uri.replace(/:443/, '');
      }

      if (req.uri.match(/^http:/)) {
        // MC-6412 - signing generated with https://...:443 but validated with https://...
        req.uri = req.uri.replace(/:80/, '');
      }

      const message = [
        req.uri,

        Object.keys(req.headers)
          .sort()
          .filter(o => o.match(/^x-epi2me/i))
          .map(o => `${o}:${req.headers[o]}`)
          .join('\n'),
      ].join('\n');

      const digest = crypto
        .createHmac('sha1', options.apisecret)
        .update(message)
        .digest('hex');
      req.headers['X-EPI2ME-SignatureV0'] = digest;
    },
    responseHandler: async r => {
      const json = r ? r.data : null;

      if (!json) {
        return Promise.reject(new Error('unexpected non-json response'));
      }

      if (r && r.status >= 400) {
        let msg = `Network error ${r.status}`;
        if (json.error) {
          msg = json.error;
        }

        if (r.status === 504) {
          // always override 504 with something custom
          msg = 'Please check your network connection and try again.';
        }

        return Promise.reject(new Error(msg));
      }

      if (json.error) {
        return Promise.reject(new Error(json.error));
      }

      return Promise.resolve(json);
    },
  };

  return {
    version: () => VERSION,
    headers: (req, options) => {
      // common headers required for everything
      if (!options) {
        options = {};
      }

      req.headers = Object.assign(
        {},
        {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-EPI2ME-Client': options.user_agent || 'api', // new world order
          'X-EPI2ME-Version': options.agent_version || utils.version(), // new world order
        },
        req.headers,
      );

      if (options._signing !== false) {
        internal.sign(req, options);
      }
    },

    get: async (uri, options) => {
      // do something to get/set data in epi2me
      let call;

      let srv = options.url;

      if (!options.skip_url_mangle) {
        uri = `/${uri}`; // + ".json";
        srv = srv.replace(/\/+$/, ''); // clip trailing slashes
        uri = uri.replace(/\/+/g, '/'); // clip multiple slashes
        call = srv + uri;
      } else {
        call = uri;
      }

      const req = { uri: call, gzip: true };

      utils.headers(req, options);

      if (options.proxy) {
        req.proxy = options.proxy;
      }

      let res;
      try {
        res = await axios.get(req.uri, req);
      } catch (err) {
        return Promise.reject(err);
      }
      return internal.responseHandler(res, options);
    },

    post: async (uri, obj, options) => {
      let srv = options.url;
      srv = srv.replace(/\/+$/, ''); // clip trailing slashes
      uri = uri.replace(/\/+/g, '/'); // clip multiple slashes
      const call = `${srv}/${uri}`;

      const req = {
        uri: call,
        gzip: true,
        body: obj ? JSON.stringify(obj) : {},
      };

      if (options.legacy_form) {
        // include legacy form parameters
        const form = {};
        form.json = JSON.stringify(obj);

        if (obj && typeof obj === 'object') {
          Object.keys(obj).forEach(attr => {
            form[attr] = obj[attr];
          });
        } // garbage

        req.form = form;
      }

      utils.headers(req, options);

      if (options.proxy) {
        req.proxy = options.proxy;
      }

      let res;
      try {
        res = await axios.post(req.uri, req);
      } catch (err) {
        return Promise.reject(err);
      }
      return internal.responseHandler(res, options);
    },

    put: async (uri, id, obj, options) => {
      let srv = options.url;
      srv = srv.replace(/\/+$/, ''); // clip trailing slashes
      uri = uri.replace(/\/+/g, '/'); // clip multiple slashes
      const call = `${srv}/${uri}/${id}`;
      const req = {
        uri: call,
        gzip: true,
        body: obj ? JSON.stringify(obj) : {},
      };

      if (options.legacy_form) {
        // include legacy form parameters
        req.form = { json: JSON.stringify(obj) };
      }

      utils.headers(req, options);

      if (options.proxy) {
        req.proxy = options.proxy;
      }

      let res;
      try {
        res = await axios.put(req.uri, req);
      } catch (err) {
        return Promise.reject(err);
      }
      return internal.responseHandler(res, options);
    },
  };
})();

class REST {
  constructor(options) {
    // {log, ...options}) {
    if (options.log) {
      this.log = options.log;
      //            delete options.log;
    }
    this.options = options;
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
      data = { accounts: [{ id_user_account: 'none', number: 'NONE', name: 'None' }] }; // fake user with accounts
    } else {
      try {
        data = await utils.get('user', this.options);
      } catch (err) {
        return cb ? cb(err) : Promise.reject(err);
      }
    }
    return cb ? cb(null, data) : Promise.resolve(data);
  }

  async instance_token(id, cb) {
    try {
      const data = await utils.post('token', { id_workflow_instance: id }, lodash.merge({ legacy_form: true }, this.options));
      return cb ? cb(null, data) : Promise.resolve(data);
    } catch (err) {
      return cb ? cb(err) : Promise.reject(err);
    }
  }

  async install_token(id, cb) {
    try {
      const data = await utils.post('token/install', { id_workflow: id }, lodash.merge({ legacy_form: true }, this.options));
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
      this.log.info(data);
      return cb ? cb(null, data) : Promise.resolve(data);
    } catch (err) {
      return cb ? cb(err) : Promise.reject(err);
    }
  }

  async ami_images(cb) {
    if (this.options.local) {
      return cb(new Error('ami_images unsupported in local mode'));
    }

    try {
      const data = this.list('ami_image');
      return cb ? cb(null, data) : Promise.resolve(data);
    } catch (err) {
      return cb ? cb(err) : Promise.reject(err);
    }
  }

  async ami_image(id, obj, cb) {
    if (this.options.local) {
      return cb(new Error('ami_image unsupported in local mode'));
    }

    if (cb) {
      // three args: update object
      try {
        const update = await utils.put('ami_image', id, obj, this.options);
        return cb ? cb(null, update) : Promise.resolve(update);
      } catch (err) {
        return cb ? cb(err) : Promise.reject(err);
      }
    }

    if (id && typeof id === 'object') {
      // two args: create
      cb = obj;
      obj = id;
      try {
        const create = await utils.post('ami_image', obj, this.options);
        return cb ? cb(null, create) : Promise.resolve(create);
      } catch (err) {
        return cb ? cb(err) : Promise.reject(err);
      }
    }

    // two args: get object
    cb = obj;

    if (!id) {
      return cb(new Error('no id_ami_image specified'));
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
        const update = await utils.put('workflow', id, obj, lodash.merge({ legacy_form: true }, this.options));
        return cb ? cb(null, update) : Promise.resolve(update);
      } catch (err) {
        return cb ? cb(err) : Promise.reject(err);
      }
    }

    if (action === 'create') {
      // two args: create object: ({...}, func)

      try {
        const create = await utils.post('workflow', obj, lodash.merge({ legacy_form: true }, this.options));
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
      lodash.merge(workflow, struct);
    } catch (err) {
      this.log.error(`${id}: error fetching workflow ${String(err)}`);
      return cb ? cb(err) : Promise.reject(err);
    }

    // placeholder
    lodash.merge(workflow, { params: {} });

    try {
      const workflowConfig = await utils.get(`workflow/config/${id}`, this.options);
      if (workflowConfig.error) {
        throw new Error(workflowConfig.error);
      }
      lodash.merge(workflow, workflowConfig);
    } catch (err) {
      this.log.error(`${id}: error fetching workflow config ${String(err)}`);
      return cb ? cb(err) : Promise.reject(err);
    }

    // MC-6483 - fetch ajax options for "AJAX drop down widget"
    const toFetch = lodash.filter(workflow.params, { widget: 'ajax_dropdown' });

    const promises = [
      ...toFetch.map(
        param =>
          new Promise(async (resolve, reject) => {
            const uri = param.values.source.replace('{{EPI2ME_HOST}}', '');

            try {
              const workflowParam = await utils.get(uri, this.options); // e.g. {datasets:[...]} from the /dataset.json list response
              const dataRoot = workflowParam[param.values.data_root]; // e.g. [{dataset},{dataset}]

              if (dataRoot) {
                param.values = dataRoot.map(o => ({
                  // does this really end up back in workflow object?
                  label: o[param.values.items.label_key],
                  value: o[param.values.items.value_key],
                }));
              }
              return resolve();
            } catch (err) {
              this.log.error(`failed to fetch ${uri}`);
              return reject(err);
            }
          }),
      ),
    ];

    try {
      await Promise.all(promises);
      return cb ? cb(null, workflow) : Promise.resolve(workflow);
    } catch (err) {
      this.log.error(`${id}: error fetching config and parameters ${String(err)}`);
      return cb ? cb(err) : Promise.reject(err);
    }
  }

  start_workflow(config, cb) {
    return utils.post('workflow_instance', config, lodash.merge({ legacy_form: true }, this.options), cb);
  }

  stop_workflow(instance_id, cb) {
    return utils.put('workflow_instance/stop', instance_id, null, lodash.merge({ legacy_form: true }, this.options), cb);
  }

  async workflow_instances(cb, query) {
    if (cb && !(cb instanceof Function) && query === undefined) {
      // no second argument and first argument is not a callback
      query = cb;
      cb = null;
    }

    if (query && query.run_id) {
      try {
        const json = await utils.get(
          `workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=${
            query.run_id
          };`,
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

  async workflow_instance(id, cb) {
    try {
      const workflowInstance = await this.read('workflow_instance', id);
      return cb ? cb(null, workflowInstance) : Promise.resolve(workflowInstance);
    } catch (err) {
      return cb ? cb(err) : Promise.reject(err);
    }
  }

  workflow_config(id, cb) {
    return utils.get(`workflow/config/${id}`, this.options, cb);
  }

  async register(code, cb) {
    try {
      const obj = await utils.put(
        'reg',
        code,
        {
          description: `${os.userInfo().username}@${os.hostname()}`,
        },
        lodash.merge({ _signing: false, legacy_form: true }, this.options),
      );
      return cb ? cb(null, obj) : Promise.resolve(obj);
    } catch (err) {
      return cb ? cb(err) : Promise.reject(err);
    }
  }

  async datasets(cb, query) {
    if (cb && !(cb instanceof Function) && query === undefined) {
      // no second argument and first argument is not a callback
      query = cb;
      cb = null;
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
    const options = lodash.merge({ skip_url_mangle: true }, this.options);
    try {
      const result = await utils.get(url, options);
      return cb ? cb(null, result) : Promise.resolve(result);
    } catch (err) {
      return cb ? cb(err) : Promise.reject(err);
    }
  }
}

module.exports = REST;
