/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2019
 */

'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var os = _interopDefault(require('os'));
var path = _interopDefault(require('path'));
var lodash = require('lodash');
var axios = _interopDefault(require('axios'));
var crypto = _interopDefault(require('crypto'));

/*
 * Copyright (c) 2018 Metrichor Ltd.
 * Author: ahurst
 * When: 2016-05-17
 *
 */

axios.defaults.validateStatus = status => status <= 504; // Reject only if the status code is greater than or equal to 500
let instance;

const utils = (function() {
  return instance !== undefined
    ? instance
    : {
        _sign: (req, options) => {
          // common headers required for everything
          if (!req.headers) {
            req.headers = {};
          }

          if (!options) {
            options = {};
          }

          req.headers['X-EPI2ME-ApiKey'] = options.apikey; // better than a logged CGI parameter

          if (!options.apisecret) {
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

        _headers: (req, options) => {
          // common headers required for everything
          if (!options) {
            options = {};
          }

          req.headers = Object.assign(
            {},
            {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              'X-EPI2ME-Client': options.user_agent || '', // new world order
              'X-EPI2ME-Version': options.agent_version || '0', // new world order
            },
            req.headers,
          );

          if (options._signing !== false) {
            utils._sign(req, options);
          }
        },

        _responsehandler: (r, cb) => {
          let JsonError;
          let { data } = r;
          if (data === undefined) {
            data = { error: 'No response: please check your network connection and try again.' };
          }

          if (typeof data === 'string') {
            try {
              data = data.replace(/[^]*\n\n/, ''); // why doesn't request always parse headers? Content-type with charset?
              data = JSON.parse(data);
            } catch (err) {
              JsonError = err;
            }
          }
          return new Promise((resolve, reject) => {
            if (r && r.status >= 400) {
              let msg = `Network error ${r.status}`;
              if (data && data.error) {
                msg = data.error;
              }

              if (r.status === 504) {
                // always override 504 with something custom
                msg = 'Please check your network connection and try again.';
              }

              // cb({ error: msg });
              reject(new Error(msg));
            }

            if (JsonError) {
              // cb({ error: JsonError }, {});
              reject(new Error(JsonError));
            }

            if (data.error) {
              // cb({ error: data.error }, {});
              reject(new Error(data.error));
            }

            // cb(null, data);
            resolve(data);
          })
            .catch(error => {
              if (cb) {
                cb({ error: error.message }, {});
              }
              return Promise.reject(error);
            })
            .then(data => {
              if (cb) {
                cb(null, data);
              }
              return Promise.resolve(data);
            });
        },

        _get: async (uri, options, cb) => {
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

          utils._headers(req, options);

          if (options.proxy) {
            req.proxy = options.proxy;
          }

          return axios.get(req.uri, req).then(response => utils._responsehandler(response, cb));
        },

        _post: async (uri, obj, options, cb) => {
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

          utils._headers(req, options);

          if (options.proxy) {
            req.proxy = options.proxy;
          }

          return axios.post(req.uri, req).then(response => utils._responsehandler(response, cb));
        },

        _put: async (uri, id, obj, options, cb) => {
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
          utils._headers(req, options);

          if (options.proxy) {
            req.proxy = options.proxy;
          }

          return axios.put(req.uri, req).then(response => utils._responsehandler(response, cb));
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

  _list(entity, cb) {
    return utils._get(entity, this.options, (e, json) => {
      if (e) {
        this.log.error('_list', e.error || e);
        cb(e.error || e);
        return;
      }

      entity = entity.match(/^[a-z_]+/i)[0]; // dataset?foo=bar => dataset
      cb(null, json[`${entity}s`]);
    });
  }

  _read(entity, id, cb) {
    return utils._get(`${entity}/${id}`, this.options, cb);
  }

  user(cb) {
    if (this.options.local) {
      return cb(null, { accounts: [{ id_user_account: 'none', number: 'NONE', name: 'None' }] }); // fake user with accounts
    }
    return utils._get('user', this.options, cb);
  }

  instance_token(id, cb) {
    /* should this be passed a hint at what the token is for? */
    return utils._post('token', { id_workflow_instance: id }, lodash.merge({ legacy_form: true }, this.options), cb);
  }

  install_token(id, cb) {
    return utils._post('token/install', { id_workflow: id }, lodash.merge({ legacy_form: true }, this.options), cb);
  }

  attributes(cb) {
    return this._list('attribute', cb);
  }

  workflows(cb) {
    if (!this.options.local) {
      return this._list('workflow', cb);
    }
  }

  ami_images(cb) {
    if (this.options.local) {
      return cb(new Error('ami_images unsupported in local mode'));
    }

    return this._list('ami_image', cb);
  }

  ami_image(id, obj, cb) {
    if (this.options.local) {
      return cb(new Error('ami_image unsupported in local mode'));
    }

    if (cb) {
      // three args: update object
      return utils._put('ami_image', id, obj, this.options, cb);
    }

    if (id && typeof id === 'object') {
      cb = obj;
      obj = id;
      return utils._post('ami_image', obj, this.options, cb);
    }

    // two args: get object
    cb = obj;

    if (!id) {
      return cb(new Error('no id_ami_image specified'), null);
    }

    this._read('ami_image', id, cb);
  }

  workflow(id, obj, cb) {
    if (cb) {
      // three args: update object: (123, {...}, func)
      return utils._put('workflow', id, obj, lodash.merge({ legacy_form: true }, this.options), cb);
    }

    if (id && typeof id === 'object') {
      // two args: create object: ({...}, func)
      cb = obj;
      obj = id;
      return utils._post('workflow', obj, lodash.merge({ legacy_form: true }, this.options), cb);
    }

    // two args: get object: (123, func)
    cb = obj;

    if (!id) {
      return cb(new Error('no workflow id specified'));
    }

    if (this.options.local) {
      const WORKFLOW_DIR = path.join(this.options.url, 'workflows');
      const filename = path.join(WORKFLOW_DIR, id, 'workflow.json');
      let workflow;
      try {
        workflow = require(filename);
      } catch (readWorkflowException) {
        return cb(readWorkflowException);
      }
      return cb(null, workflow);
    }

    this._read('workflow', id, (err, details) => {
      if (!details) {
        details = {};
      }

      if (!details.params) {
        details.params = {};
      }

      const promises = [];
      promises.push(
        new Promise((resolve, reject) => {
          const uri = `workflow/config/${id}`;
          utils._get(uri, this.options, (err, resp) => {
            if (err) {
              this.log.error(`failed to fetch ${uri}`);
              reject(err);
              return;
            }

            lodash.merge(details, resp);
            resolve();
          });
        }),
      );

      // MC-6483 - fetch ajax options for "AJAX drop down widget"
      const toFetch = lodash.filter(details.params, { widget: 'ajax_dropdown' });
      promises.unshift(
        ...toFetch.map(
          param =>
            new Promise((resolve, reject) => {
              const uri = param.values.source.replace('{{EPI2ME_HOST}}', '');

              utils._get(uri, this.options, (err, resp) => {
                if (err) {
                  this.log.error(`failed to fetch ${uri}`);
                  reject(err);
                  return;
                }

                const data_root = resp[param.values.data_root];
                if (data_root) {
                  param.values = data_root.map(o => ({
                    label: o[param.values.items.label_key],
                    value: o[param.values.items.value_key],
                  }));
                }
                resolve();
              });
            }),
        ),
      );

      Promise.all(promises)
        .then(() => cb(null, details))
        .catch(err => {
          this.log.error(`${id}: error fetching config and parameters (${err.error || err})`);
          return cb(err);
        });
    });
  }

  start_workflow(config, cb) {
    return utils._post('workflow_instance', config, lodash.merge({ legacy_form: true }, this.options), cb);
  }

  stop_workflow(instance_id, cb) {
    return utils._put('workflow_instance/stop', instance_id, null, lodash.merge({ legacy_form: true }, this.options), cb);
  }

  workflow_instances(cb, query) {
    if (query && query.run_id) {
      return utils._get(
        `workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=${
          query.run_id
        };`,
        this.options,
        (e, json) => {
          const mapped = json.data.map(o => ({
            id_workflow_instance: o.id_ins,
            id_workflow: o.id_flo,
            run_id: o.run_id,
            description: o.desc,
            rev: o.rev,
          }));
          return cb(null, mapped);
        },
      );
    }

    return this._list('workflow_instance', cb);
  }

  workflow_instance(id, cb) {
    return this._read('workflow_instance', id, cb);
  }

  workflow_config(id, cb) {
    return utils._get(`workflow/config/${id}`, this.options, cb);
  }

  register(code, cb) {
    return utils._put(
      'reg',
      code,
      {
        description: `${os.userInfo().username}@${os.hostname()}`,
      },
      lodash.merge({ _signing: false, legacy_form: true }, this.options),
      cb,
    );
  }

  datasets(cb, query) {
    if (!query) {
      query = {};
    }

    if (!query.show) {
      query.show = 'mine';
    }

    return this._list(`dataset?show=${query.show}`, cb);
  }

  dataset(id, cb) {
    if (!this.options.local) {
      return this._read('dataset', id, cb);
    }

    this.datasets((err, data) =>
      // READ response has the same structure as LIST, so just
      // fish out the matching id
      cb(err, data.find(o => o.id_dataset === id)),
    );
  }

  fetchContent(url, cb) {
    const options = lodash.merge({ skip_url_mangle: true }, this.options);
    utils._get(url, options, cb);
  }
}

module.exports = REST;
