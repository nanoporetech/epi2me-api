/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2019
 */

'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var lodash = require('lodash');
var AWS = _interopDefault(require('aws-sdk'));
var fs = _interopDefault(require('fs-extra'));
var os = require('os');
var os__default = _interopDefault(os);
var path = _interopDefault(require('path'));
var proxy = _interopDefault(require('proxy-agent'));
var axios = _interopDefault(require('axios'));
var crypto = _interopDefault(require('crypto'));

var version = "2.58.1";

/*
 * Copyright (c) 2018 Metrichor Ltd.
 * Author: ahurst
 * When: 2016-05-17
 *
 */

axios.defaults.validateStatus = status => status <= 504; // Reject only if the status code is greater than or equal to 500

const utils = (function magic() {
  const internal = {
    sign: (req, optionsIn) => {
      // common headers required for everything
      if (!req.headers) {
        req.headers = {};
      }
      let options = optionsIn;
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
    version: version,
    headers: (req, optionsIn) => {
      // common headers required for everything
      let options = optionsIn;
      if (!options) {
        options = {};
      }

      req.headers = lodash.merge(
        {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'X-EPI2ME-Client': options.user_agent || 'api', // new world order
          'X-EPI2ME-Version': options.agent_version || utils.version, // new world order
        },
        req.headers,
      );

      if (!('signing' in options) || options.signing) {
        // if not present: sign
        // if present and true: sign
        internal.sign(req, options);
      }
    },

    get: async (uriIn, options) => {
      // do something to get/set data in epi2me
      let call;

      let srv = options.url;
      let uri = uriIn;
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

    post: async (uriIn, obj, options) => {
      let srv = options.url;
      srv = srv.replace(/\/+$/, ''); // clip trailing slashes
      const uri = uriIn.replace(/\/+/g, '/'); // clip multiple slashes
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

    put: async (uriIn, id, obj, options) => {
      let srv = options.url;
      srv = srv.replace(/\/+$/, ''); // clip trailing slashes
      const uri = uriIn.replace(/\/+/g, '/'); // clip multiple slashes
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

/*
 * Copyright (c) 2018 Metrichor Ltd.
 * Author: ahurst
 * When: 2016-05-17
 *
 */

const targetBatchSize = 4000;

utils.pipe = async (uriIn, filepath, options, progressCb) => {
  let srv = options.url;
  let uri = `/${uriIn}`; // note no forced extension for piped requests
  srv = srv.replace(/\/+$/, ''); // clip trailing slashes
  uri = uri.replace(/\/+/g, '/'); // clip multiple slashes
  const call = srv + uri;
  const req = {
    uri: call,
    gzip: true,
    headers: {
      'Accept-Encoding': 'gzip',
      Accept: 'application/gzip',
    },
  };

  utils.headers(req, options);

  if (options.proxy) {
    req.proxy = options.proxy;
  }

  if (progressCb) {
    req.onUploadProgress = progressCb;
  }
  req.responseType = 'stream';

  const p = new Promise(async (resolve, reject) => {
    try {
      const writer = fs.createWriteStream(filepath);
      const res = await axios.get(req.uri, req);
      res.data.pipe(writer);

      writer.on('finish', resolve(filepath));
      writer.on('error', reject(new Error('writer failed')));
    } catch (err) {
      reject(err);
    }
  });

  return p;
};

utils.countFileReads = filePath =>
  new Promise((resolve, reject) => {
    const linesPerRead = 4;
    let lineCount = 1;
    let idx;
    fs.createReadStream(filePath)
      .on('data', buffer => {
        idx = -1;
        lineCount -= 1;
        do {
          idx = buffer.indexOf(10, idx + 1);
          lineCount += 1;
        } while (idx !== -1);
      })
      .on('end', () => resolve(Math.floor(lineCount / linesPerRead)))
      .on('error', reject);
  });

// this isn't good... wtf:
// make async!
utils.findSuitableBatchIn = async folder => {
  // For downloads without the folder split
  // Look inside `folder` and return any batch with a free slot.
  // if no suitable batches, create one and return that.
  await fs.mkdirp(folder);
  const prefix = 'batch_';
  const createBatch = async () => {
    const batchName = `${prefix}${Date.now()}`;
    const newBatchPath = path.join(folder, batchName);
    return fs.mkdirp(newBatchPath);
  };

  let batches = await fs.readdir(folder);
  batches = batches.filter(d => d.slice(0, prefix.length) === prefix);

  if (!batches || !batches.length) {
    return createBatch();
  }

  const latestBatch = path.join(folder, batches.pop());
  if (fs.readdirSync(latestBatch).length < targetBatchSize) {
    return latestBatch;
  }
  return createBatch();
};

let IdCounter = 0;
utils.getFileID = () => {
  IdCounter += 1;
  return `FILE_${IdCounter}`;
};

utils.lsFolder = (dir, ignore, filetype, rootDir = '') =>
  fs.readdir(dir).then(filesIn => {
    let ls = filesIn;
    if (ignore) {
      ls = ls.filter(ignore);
    }

    let folders = [];
    const files = [];
    const promises = ls.map(entry =>
      fs.stat(path.join(dir, entry)).then(stats => {
        if (stats.isDirectory()) {
          folders.push(path.join(dir, entry));
          return Promise.resolve();
        }

        if (stats.isFile() && (!filetype || path.extname(entry) === filetype)) {
          /** For each file, construct a file object: */
          const parsed = path.parse(entry);

          const fileObject = {
            name: parsed.base,
            path: path.join(dir, entry),
            size: stats.size,
            id: utils.getFileID(),
          };

          const batch = dir
            .replace(rootDir, '')
            .replace('\\', '')
            .replace('/', '');
          if (lodash.isString(batch) && batch.length) fileObject.batch = batch;
          files.push(fileObject);
          return Promise.resolve();
        }

        return Promise.resolve(); // unhandled type. ignore? reject?
      }),
    );

    return Promise.all(promises)
      .then(() => {
        folders = folders.sort();
        /**
         * // It's important to load the batch folders alphabetically
         * 1, then 2, etc.
         */
        return Promise.resolve({ files, folders });
      })
      .catch(err => Promise.reject(new Error(`error listing folder ${err}`)));
  });

utils.loadInputFiles = ({ inputFolder, outputFolder, uploadedFolder, filetype }, uploaded = []) =>
  /**
   * Entry point for new .fast5 / .fastq files.
   *  - Scan the input folder files
   *      fs.readdir is resource-intensive if there are a large number of files
   *      It should only be triggered when needed
   *  - Push list of new files into uploadWorkerPool (that.enqueueFiles)
   */

  new Promise((resolve, reject) => {
    // function used to filter the readdir results in utils.lsFolder
    // exclude all files and folders meet any of these criteria:
    const inputFilter = file => {
      const basename = path.basename(file);
      return !(
        basename === 'downloads' ||
        basename === 'uploaded' ||
        basename === 'skip' ||
        basename === 'fail' ||
        (uploadedFolder && basename === path.basename(uploadedFolder)) ||
        (outputFolder && basename === path.basename(outputFolder)) ||
        basename === 'tmp' ||
        (lodash.isArray(uploaded) && uploaded.indexOf(path.posix.basename(file)) > -1)
      );
    };

    // iterate through folders
    let batchFolders = [inputFolder];

    const next = () => {
      if (!batchFolders || !batchFolders.length) {
        return;
      }

      utils
        .lsFolder(batchFolders.splice(0, 1)[0], inputFilter, filetype, inputFolder)
        .then(({ files, folders }) => {
          // Keep iterating though batch folders until one with files is found
          if (files && files.length) {
            resolve(files); // Done. Resolve promise with new files
            return;
          }
          batchFolders = [...folders, ...batchFolders];
          if (batchFolders.length) {
            next(); // iterate
          } else {
            resolve(); // Done. No new files were found
          }
        })
        .catch(err => {
          reject(new Error(`Failed to check for new files: ${err.message}`));
        });
    };

    next(); // start first iteration
  });

var local = false;
var url = "https://epi2me.nanoporetech.com";
var user_agent = "EPI2ME API";
var region = "eu-west-1";
var retention = "on";
var sessionGrace = 5;
var sortInputFiles = false;
var uploadTimeout = 1200;
var downloadTimeout = 1200;
var fileCheckInterval = 5;
var downloadCheckInterval = 3;
var stateCheckInterval = 60;
var inFlightDelay = 600;
var waitTimeSeconds = 20;
var waitTokenError = 30;
var downloadPoolSize = 1;
var filter = "on";
var filterByChannel = "off";
var downloadMode = "data+telemetry";
var deleteOnComplete = "off";
var filetype = ".fastq";
var signing = true;
var DEFAULTS = {
	local: local,
	url: url,
	user_agent: user_agent,
	region: region,
	retention: retention,
	sessionGrace: sessionGrace,
	sortInputFiles: sortInputFiles,
	uploadTimeout: uploadTimeout,
	downloadTimeout: downloadTimeout,
	fileCheckInterval: fileCheckInterval,
	downloadCheckInterval: downloadCheckInterval,
	stateCheckInterval: stateCheckInterval,
	inFlightDelay: inFlightDelay,
	waitTimeSeconds: waitTimeSeconds,
	waitTokenError: waitTokenError,
	downloadPoolSize: downloadPoolSize,
	filter: filter,
	filterByChannel: filterByChannel,
	downloadMode: downloadMode,
	deleteOnComplete: deleteOnComplete,
	filetype: filetype,
	signing: signing
};

class REST {
  constructor(options) {
    // {log, ...options}) {
    this.options = lodash.assign({ agent_version: utils.version, local, url, user_agent, signing }, options);
    const { log } = this.options;
    if (log) {
      if (lodash.every([log.info, log.warn, log.error], lodash.isFunction)) {
        this.log = log;
      } else {
        throw new Error('expected log object to have "error", "debug", "info" and "warn" methods');
      }
    } else {
      this.log = {
        info: msg => {
          console.info(`[${new Date().toISOString()}] INFO: ${msg}`);
        },
        debug: msg => {
          // eslint-disable-next-line
          console.debug(`[${new Date().toISOString()}] DEBUG: ${msg}`);
        },
        warn: msg => {
          console.warn(`[${new Date().toISOString()}] WARN: ${msg}`);
        },
        error: msg => {
          console.error(`[${new Date().toISOString()}] ERROR: ${msg}`);
        },
      };
    }
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
      const data = await utils.post(
        'token',
        { id_workflow_instance: id },
        lodash.assign({}, this.options, { legacy_form: true }),
      );
      return cb ? cb(null, data) : Promise.resolve(data);
    } catch (err) {
      return cb ? cb(err) : Promise.reject(err);
    }
  }

  async install_token(id, cb) {
    try {
      const data = await utils.post(
        'token/install',
        { id_workflow: id },
        lodash.assign({}, this.options, { legacy_form: true }),
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

  async ami_images(cb) {
    if (this.options.local) {
      const err = new Error('ami_images unsupported in local mode');
      return cb ? cb(err) : Promise.reject(err);
    }

    try {
      const data = this.list('ami_image');
      return cb ? cb(null, data) : Promise.resolve(data);
    } catch (err) {
      return cb ? cb(err) : Promise.reject(err);
    }
  }

  async ami_image(first, second, third) {
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
        const update = await utils.put('workflow', id, obj, lodash.assign({}, this.options, { legacy_form: true }));
        return cb ? cb(null, update) : Promise.resolve(update);
      } catch (err) {
        return cb ? cb(err) : Promise.reject(err);
      }
    }

    if (action === 'create') {
      // two args: create object: ({...}, func)

      try {
        const create = await utils.post('workflow', obj, lodash.assign({}, this.options, { legacy_form: true }));
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
      ...toFetch.map((iterObj, i) => {
        const param = toFetch[i]; // so we can explicitly reassign to the iterator without eslint complaints
        return new Promise(async (resolve, reject) => {
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

  start_workflow(config, cb) {
    return utils.post('workflow_instance', config, lodash.assign({}, this.options, { legacy_form: true }), cb);
  }

  stop_workflow(idWorkflowInstance, cb) {
    return utils.put(
      'workflow_instance/stop',
      idWorkflowInstance,
      null,
      lodash.assign({}, this.options, { legacy_form: true }),
      cb,
    );
  }

  async workflow_instances(first, second) {
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
          description: `${os__default.userInfo().username}@${os__default.hostname()}`,
        },
        lodash.assign({}, this.options, { signing: false, legacy_form: true }),
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

  async fetchContent(url$$1, cb) {
    const options = lodash.assign({}, this.options, { skip_url_mangle: true });
    try {
      const result = await utils.get(url$$1, options);
      return cb ? cb(null, result) : Promise.resolve(result);
    } catch (err) {
      return cb ? cb(err) : Promise.reject(err);
    }
  }
}

class REST_FS extends REST {
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
        .map(filepath => fs.readFileSync(filepath))
        .map(str => JSON.parse(str));

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
      const workflow = await fs.readFile(filename);
      const json = JSON.parse(workflow);
      return cb ? cb(null, json) : Promise.resolve(json);
    } catch (readWorkflowException) {
      return cb ? cb(readWorkflowException) : Promise.reject(readWorkflowException);
    }
  }

  async workflow_instances(first, second) {
    if (!this.options.local) {
      return super.workflow_instances(first, second);
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
          workflow = JSON.parse(fs.readFileSync(filename));
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

  async bundle_workflow(idWorkflow, filepath, progressCb) {
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
}

/*
 * Copyright (c) 2018 Metrichor Ltd.
 * Author: rpettett
 * When: A long time ago, in a galaxy far, far away
 *
 */

class EPI2ME {
  constructor(OptString) {
    let opts;
    if (typeof OptString === 'string' || (typeof OptString === 'object' && OptString.constructor === String)) {
      opts = JSON.parse(OptString);
    } else {
      opts = OptString || {};
    }

    if (opts.log) {
      if (lodash.every([opts.log.info, opts.log.warn, opts.log.error], lodash.isFunction)) {
        this.log = opts.log;
      } else {
        throw new Error('expected log object to have "error", "debug", "info" and "warn" methods');
      }
    } else {
      this.log = {
        info: msg => {
          console.info(`[${new Date().toISOString()}] INFO: ${msg}`);
        },
        debug: msg => {
          // eslint-disable-next-line
          console.debug(`[${new Date().toISOString()}] DEBUG: ${msg}`);
        },
        warn: msg => {
          console.warn(`[${new Date().toISOString()}] WARN: ${msg}`);
        },
        error: msg => {
          console.error(`[${new Date().toISOString()}] ERROR: ${msg}`);
        },
      };
    }

    this.states = {
      upload: {
        success: 0,
        failure: {},
        queueLength: 0,
        enqueued: 0,
        totalSize: 0,
      },
      download: {
        success: 0,
        fail: 0,
        failure: {},
        queueLength: 0,
        totalSize: 0,
      },
      warnings: [],
    };

    // if (opts.filter === 'on') defaults.downloadPoolSize = 5;

    this.config = {
      options: lodash.defaults(opts, DEFAULTS),
      instance: {
        id_workflow_instance: opts.id_workflow_instance,
        inputQueueName: null,
        outputQueueName: null,
        outputQueueURL: null,
        discoverQueueCache: {},
        bucket: null,
        bucketFolder: null,
        remote_addr: null,
        chain: null,
        key_id: null,
      },
    };

    this.config.instance.awssettings = {
      region: this.config.options.region,
    };

    if (this.config.options.inputFolder) {
      if (this.config.options.uploadedFolder && this.config.options.uploadedFolder !== '+uploaded') {
        this.uploadTo = this.config.options.uploadedFolder;
      } else {
        this.uploadTo = path.join(this.config.options.inputFolder, 'uploaded');
      }
      this.skipTo = path.join(this.config.options.inputFolder, 'skip');
    }

    this.REST = new REST_FS(lodash.merge({}, { log: this.log }, this.config.options));
  }

  async stop_everything(cb) {
    this.log.debug('stopping watchers');

    if (this.downloadCheckInterval) {
      this.log.debug('clearing downloadCheckInterval interval');
      clearInterval(this.downloadCheckInterval);
      this.downloadCheckInterval = null;
    }

    if (this.stateCheckInterval) {
      this.log.debug('clearing stateCheckInterval interval');
      clearInterval(this.stateCheckInterval);
      this.stateCheckInterval = null;
    }

    if (this.fileCheckInterval) {
      this.log.debug('clearing fileCheckInterval interval');
      clearInterval(this.fileCheckInterval);
      this.fileCheckInterval = null;
    }

    if (this.uploadWorkerPool) {
      this.log.debug('clearing uploadWorkerPool');
      await Promise.all(this.uploadWorkerPool);
      this.uploadWorkerPool = null;
    }

    if (this.downloadWorkerPool) {
      this.log.debug('clearing downloadWorkerPool');
      this.downloadWorkerPool.drain();
      this.downloadWorkerPool = null;
    }

    const { id_workflow_instance: idWorkflowInstance } = this.config.instance;
    if (idWorkflowInstance) {
      this.REST.stop_workflow(idWorkflowInstance, () => {
        this.log.info(`workflow instance ${idWorkflowInstance} stopped`);
        if (cb) cb(this);
      });
    } else if (cb) cb(this);
  }

  async session() {
    /* MC-1848 all session requests are serialised through that.sessionQueue to avoid multiple overlapping requests */
    if (this.sessioning) {
      return Promise.resolve(); // resolve or reject? Throttle to n=1: bail out if there's already a job queued
    }

    if (!this.states.sts_expiration || (this.states.sts_expiration && this.states.sts_expiration <= Date.now())) {
      /* Ignore if session is still valid */

      /* queue a request for a new session token and hope it comes back in under this.config.options.sessionGrace time */
      this.sessioning = true;

      try {
        await this.fetchInstanceToken();
        this.sessioning = false;
      } catch (err) {
        this.sessioning = false;
        this.log.error(`session error ${String(err)}`);
        return Promise.reject(err);
      }
    }

    return Promise.resolve();
  }

  async fetchInstanceToken() {
    if (!this.config.instance.id_workflow_instance) {
      return Promise.reject(new Error('must specify id_workflow_instance'));
    }

    if (this.states.sts_expiration && this.states.sts_expiration > Date.now()) {
      /* escape if session is still valid */
      return Promise.resolve();
    }

    this.log.debug('new instance token needed');

    try {
      const token = await this.REST.instance_token(this.config.instance.id_workflow_instance);
      this.log.debug(`allocated new instance token expiring at ${token.expiration}`);
      this.states.sts_expiration = new Date(token.expiration).getTime() - 60 * this.config.options.sessionGrace; // refresh token x mins before it expires
      // "classic" token mode no longer supported

      if (this.config.options.proxy) {
        AWS.config.update({
          httpOptions: { agent: proxy(this.config.options.proxy, true) },
        });
      }

      // MC-5418 - This needs to be done before the process starts uploading messages!
      AWS.config.update(this.config.instance.awssettings);
      AWS.config.update(token);
    } catch (err) {
      this.log.warn(`failed to fetch instance token: ${String(err)}`);

      /* todo: delay promise resolution so we don't hammer the website */
    }
    return Promise.resolve();
  }

  async sessionedS3() {
    await this.session();
    return new AWS.S3({
      useAccelerateEndpoint: this.config.options.awsAcceleration === 'on',
    });
  }

  async sessionedSQS() {
    await this.session();
    return new AWS.SQS();
  }

  autoStart(workflow_config, cb) {
    this.REST.start_workflow(workflow_config, async (workflowError, instance) => {
      if (workflowError) {
        const msg = `Failed to start workflow: ${
          workflowError && workflowError.error ? workflowError.error : workflowError
        }`;
        this.log.warn(msg);
        if (cb) cb(msg);
        return;
      }
      this.config.workflow = JSON.parse(JSON.stringify(workflow_config));
      await this.autoConfigure(instance, cb);
    });
  }

  autoJoin(id, cb) {
    this.config.instance.id_workflow_instance = id;

    this.REST.workflow_instance(id, async (instanceError, instance) => {
      if (instanceError) {
        const msg = `Failed to join workflow instance: ${
          instanceError && instanceError.error ? instanceError.error : instanceError
        }`;
        this.log.warn(msg);
        if (cb) cb(msg);
        return;
      }

      if (instance.state === 'stopped') {
        this.log.warn(`workflow ${id} is already stopped`);
        if (cb) cb('could not join workflow');
        return;
      }

      /* it could be useful to populate this as autoStart does */
      this.config.workflow = this.config.workflow || {};

      await this.autoConfigure(instance, cb);
    });
  }

  async autoConfigure(instance, autoStartCb) {
    /* region
     * id_workflow_instance
     * inputqueue
     * outputqueue
     * bucket
     * remote_addr
     * description (workflow)
     * chain
     */
    this.config.instance.id_workflow_instance = instance.id_workflow_instance;
    this.config.instance.id_workflow = instance.id_workflow;
    this.config.instance.remote_addr = instance.remote_addr;
    this.config.instance.key_id = instance.key_id;
    this.config.instance.bucket = instance.bucket;
    this.config.instance.inputQueueName = instance.inputqueue;
    this.config.instance.outputQueueName = instance.outputqueue;
    this.config.instance.awssettings.region = instance.region || this.config.options.region;
    this.config.instance.bucketFolder = `${instance.outputqueue}/${instance.id_user}/${instance.id_workflow_instance}`;
    this.config.instance.user_defined = instance.user_defined; // MC-2387 - parameterisation

    if (instance.chain) {
      if (typeof instance.chain === 'object') {
        // already parsed
        this.config.instance.chain = instance.chain;
      } else {
        try {
          this.config.instance.chain = JSON.parse(instance.chain);
        } catch (jsonException) {
          throw new Error(`exception parsing chain JSON ${String(jsonException)}`);
        }
      }
    }

    if (!this.config.options.inputFolder) throw new Error('must set inputFolder');
    if (!this.config.options.outputFolder) throw new Error('must set outputFolder');
    if (!this.config.instance.bucketFolder) throw new Error('bucketFolder must be set');
    if (!this.config.instance.inputQueueName) throw new Error('inputQueueName must be set');
    if (!this.config.instance.outputQueueName) throw new Error('outputQueueName must be set');

    fs.mkdirpSync(this.config.options.outputFolder);

    // MC-1828 - include instance id in telemetry file name
    const fileName = this.config.instance.id_workflow_instance
      ? `telemetry-${this.config.instance.id_workflow_instance}.log`
      : 'telemetry.log';
    const telemetryLogFolder = path.join(this.config.options.outputFolder, 'epi2me-logs');
    const telemetryLogPath = path.join(telemetryLogFolder, fileName);

    fs.mkdirp(telemetryLogFolder, mkdirException => {
      if (mkdirException && !String(mkdirException).match(/EEXIST/)) {
        this.log.error(`error opening telemetry log stream: mkdirpException:${String(mkdirException)}`);
      } else {
        try {
          this.telemetryLogStream = fs.createWriteStream(telemetryLogPath, { flags: 'a' });
          this.log.info(`logging telemetry to ${telemetryLogPath}`);
        } catch (telemetryLogStreamErr) {
          this.log.error(`error opening telemetry log stream: ${String(telemetryLogStreamErr)}`);
        }
      }
    });

    this.uploadedFiles = []; // container for files that have been successfully uploaded, but failed to move
    if (autoStartCb) autoStartCb(null, this.config.instance);

    // MC-2068 - Don't use an interval.
    this.downloadCheckInterval = setInterval(
      this.loadAvailableDownloadMessages.bind(this),
      this.config.options.downloadCheckInterval * 1000,
    );

    // MC-1795 - stop workflow when instance has been stopped remotely
    this.stateCheckInterval = setInterval(() => {
      this.REST.workflow_instance(this.config.instance.id_workflow_instance, (instanceError, instanceObj) => {
        if (instanceError) {
          this.log.warn(
            `failed to check instance state: ${
              instanceError && instanceError.error ? instanceError.error : instanceError
            }`,
          );
        } else if (instanceObj.state === 'stopped') {
          this.log.warn(`instance was stopped remotely at ${instanceObj.stop_date}. shutting down the workflow.`);
          this.stop_everything(that => {
            if (typeof that.config.options.remoteShutdownCb === 'function') {
              that.config.options.remoteShutdownCb(`instance was stopped remotely at ${instanceObj.stop_date}`);
            }
          });
        }
      });
    }, this.config.options.stateCheckInterval * 1000);

    /* Request session token */
    await this.session();

    // MC-5418: ensure that the session has been established before starting the upload
    this.loadUploadFiles(); // Trigger once at workflow instance start
    this.fileCheckInterval = setInterval(this.loadUploadFiles.bind(this), this.config.options.fileCheckInterval * 1000);
    return Promise.resolve();
  }

  async loadAvailableDownloadMessages() {
    try {
      const queueURL = await this.discoverQueue(this.config.instance.outputQueueName);
      const len = await this.queueLength(queueURL);

      if (len !== undefined && len !== null) {
        this.states.download.queueLength = len;

        if (len > 0) {
          /* only process downloads if there are downloads to process */
          this.log.debug(`downloads available: ${len}`);
          return this.downloadAvailable();
        }
      }

      this.log.debug('no downloads available');
    } catch (err) {
      this.log.warn(err);
      if (!this.states.download.failure) this.states.download.failure = {};
      this.states.download.failure[err] = this.states.download.failure[err] ? this.states.download.failure[err] + 1 : 1;
    }

    return Promise.resolve();
  }

  async downloadAvailable() {
    const downloadWorkerPoolRemaining = this.downloadWorkerPool ? this.downloadWorkerPool.remaining : 0;

    if (downloadWorkerPoolRemaining >= this.config.options.downloadPoolSize * 5) {
      /* ensure downloadPool is limited but fully utilised */
      this.log.debug(`${downloadWorkerPoolRemaining} downloads already queued`);
      return Promise.resolve();
    }

    let receiveMessageSet;
    try {
      const queueURL = await this.discoverQueue(this.config.instance.outputQueueName);
      this.log.debug('fetching messages');

      const sqs = this.sessionedSQS();
      receiveMessageSet = await sqs
        .receiveMessage({
          AttributeNames: ['All'], // to check if the same message is received multiple times
          QueueUrl: queueURL,
          VisibilityTimeout: this.config.options.inFlightDelay, // approximate time taken to pass/fail job before resubbing
          MaxNumberOfMessages: this.config.options.downloadPoolSize, // MC-505 - download multiple threads simultaneously
          WaitTimeSeconds: this.config.options.waitTimeSeconds, // long-poll
        })
        .promise();
    } catch (receiveMessageException) {
      this.log.error(`receiveMessage exception: ${String(receiveMessageException)}`);
      this.states.download.failure[receiveMessageException] = this.states.download.failure[receiveMessageException]
        ? this.states.download.failure[receiveMessageException] + 1
        : 1;
      return Promise.reject(receiveMessageException);
    }

    return this.receiveMessages(receiveMessageSet);
  }

  loadUploadFiles() {
    /**
     * Entry point for new .fast5 files. Triggered on an interval
     *  - Scan the input folder files
     *      fs.readdir is resource-intensive if there are a large number of files
     *      It should only be triggered when needed
     *  - Push list of new files into uploadWorkerPool (that.enqueueFiles)
     */

    // const fileExp = new RegExp('\\.' + this.config.options.inputFormat + '$');   // only consider files with the specified extension
    const remaining = this.inputBatchQueue ? this.inputBatchQueue.remaining : 0;

    // if remaining > 0, there are still files in the inputBatchQueue
    if (!this.dirScanInProgress && remaining === 0) {
      this.log.debug(`loadUploadFiles: ${remaining} batches in the inputBatchQueue`);
      this.dirScanInProgress = true;
      this.log.debug('scanning input folder for new files');
      utils
        .loadInputFiles(this.config.options, this.log)
        .then(async files => {
          this.dirScanInProgress = false;
          await this.enqueueUploadFiles(files);
        })
        .catch(err => {
          this.dirScanInProgress = false;
          this.log.error(err);
        });
    }
  }

  async enqueueUploadFiles(files) {
    let maxFiles = 0;
    let maxFileSize = 0;
    let settings = {};
    let msg;

    if (!lodash.isArray(files) || !files.length) return;

    if ('workflow' in this.config) {
      if ('workflow_attributes' in this.config.workflow) {
        // started from GUI agent
        settings = this.config.workflow.workflow_attributes;
      } else if ('attributes' in this.config.workflow) {
        // started from CLI
        const { attributes: attrs } = this.config.workflow.attributes;

        if ('epi2me:max_size' in attrs) {
          settings.max_size = parseInt(attrs['epi2me:max_size'], 10);
        }

        if ('epi2me:max_files' in attrs) {
          settings.max_files = parseInt(attrs['epi2me:max_files'], 10);
        }

        if ('epi2me:category' in attrs) {
          const epi2me_category = attrs['epi2me:category'];
          if (epi2me_category.includes('storage')) {
            settings.requires_storage = true;
          }
        }
      }
    }
    if ('requires_storage' in settings) {
      if (settings.requires_storage) {
        if (!('storage_account' in this.config.workflow)) {
          msg = 'ERROR: Workflow requires storage enabled. Please provide a valid storage account [ --storage ].';
          this.log.error(msg);
          this.states.warnings.push(msg);
          return;
        }
      }
    }

    if ('max_size' in settings) {
      maxFileSize = parseInt(settings.max_size, 10);
    }

    if ('max_files' in settings) {
      maxFiles = parseInt(settings.max_files, 10);
      if (files.length > maxFiles) {
        msg = `ERROR: ${
          files.length
        } files found. Workflow can only accept ${maxFiles}. Please move the extra files away.`;
        this.log.error(msg);
        this.states.warnings.push(msg);
        return;
      }
    }

    this.log.info(`enqueueUploadFiles: ${files.length} new files`);
    this.inputBatchQueue = [];
    this.inputBatchQueue.remaining = 0;

    this.states.upload.filesCount = this.states.upload.filesCount
      ? this.states.upload.filesCount + files.length
      : files.length;

    if (this.config.options.filetype === '.fastq' || this.config.options.filetype === '.fq') {
      this.inputBatchQueue.push(async () => {
        const uploadWorkerPool = [];
        const statP = [];
        this.log.debug('enqueueUploadFiles.countFileReads: counting FASTQ reads per file');

        files.forEach(fileIn => {
          const file = fileIn;

          if (maxFiles && this.states.upload.filesCount > maxFiles) {
            msg = `Maximum ${maxFiles} file(s) already uploaded. Moving ${file.name} into skip folder`;
            this.log.error(msg);
            this.states.warnings.push(msg);
            this.states.upload.filesCount -= 1;
            file.skip = 'SKIP_TOO_MANY';
            uploadWorkerPool.push(this.uploadJob(file));
            return;
          }

          if (maxFileSize && file.size > maxFileSize) {
            msg = `${file.name} is over ${maxFileSize
              .toString()
              .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}. Moving into skip folder`;
            file.skip = 'SKIP_TOO_BIG';
            this.states.upload.filesCount -= 1;

            this.log.error(msg);
            this.states.warnings.push(msg);
            uploadWorkerPool.push(this.uploadJob(file));
            return;
          }

          statP.push(
            utils
              .countFileReads(file.path)
              .then(count => {
                file.readCount = count;
                this.states.upload.enqueued += count;
                this.states.upload.readsCount = this.states.upload.readsCount
                  ? this.states.upload.readsCount + count
                  : count;
                uploadWorkerPool.push(this.uploadJob(file));
              })
              .catch(err => {
                this.log.error(`statQ, countFileReads ${String(err)}`);
              }),
          );
        });

        await Promise.all(statP).then(async () => {
          this.log.debug(`enqueueUploadFiles.enqueued: ${this.states.upload.enqueued}`);
          await Promise.all(uploadWorkerPool).catch(err => {
            this.log.error(`uploadWorkerPool (fastq) exception ${String(err)}`);
          });
        });
        this.inputBatchQueue.remaining -= 1;
      });
      this.inputBatchQueue.remaining += 1;
    } else {
      this.states.upload.enqueued += files.length;
      this.inputBatchQueue = files.map(itemIn => {
        const item = itemIn;

        if (maxFiles && this.states.upload.filesCount > maxFiles) {
          msg = `Maximum ${maxFiles} file(s) already uploaded. Moving ${item.name} into skip folder`;
          this.log.error(msg);
          this.states.warnings.push(msg);
          this.states.upload.filesCount -= 1;
          item.skip = 'SKIP_TOO_MANY';
        } else if (maxFileSize && item.size > maxFileSize) {
          msg = `${item.name} is over ${maxFileSize
            .toString()
            .replace(/\B(?=(\d{3})+(?!\d))/g, ',')}. Moving into skip folder`;
          this.log.error(msg);
          this.states.warnings.push(msg);
          this.states.upload.filesCount -= 1;
          item.skip = 'SKIP_TOO_BIG';
        }

        return this.uploadJob(item).then(() => {
          this.inputBatchQueue.remaining -= 1;
        }); // Promise
      });
      this.inputBatchQueue.remaining += 1;
    }

    // should this await Promise.all() ?
    try {
      await Promise.all(this.inputBatchQueue);
      this.log.info('inputBatchQueue slot released. trigger loadUploadFiles');
      this.loadUploadFiles(); // immediately load more files
    } catch (err) {
      this.log.error(`enqueueUploadFiles exception ${String(err)}`);
    }
  }

  async uploadJob(file) {
    // Initiate file upload to S3
    try {
      this.log.info(JSON.stringify(file));
    } catch (e) {
      this.log.error(`${file.id} could not stringify fileObject!`);
    } // ignore

    if ('skip' in file) {
      const readCount = file.readCount || 1;
      this.states.upload.enqueued = this.states.upload.enqueued - readCount;
      this.states.upload.queueLength = this.states.upload.queueLength ? this.states.upload.queueLength - readCount : 0;
      try {
        await this.moveFile(file, 'skip');
      } catch (e) {
        return Promise.reject(e);
      }
      return Promise.resolve();
    }

    const p = new Promise(resolve => {
      this.uploadHandler(file, (errorMsg, file2) => {
        if (errorMsg) {
          this.log.info(`${file2.id} done, but failed: ${String(errorMsg)}`);
        } else {
          this.log.info(`${file2.id} completely done. releasing uploadWorkerPool queue slot`);
        }

        resolve(); // Release uploadWorkerPool queue slot

        const readCount = file2.readCount || 1;
        this.states.upload.enqueued = this.states.upload.enqueued - readCount;

        if (errorMsg) {
          this.log.error(`uploadHandler ${errorMsg}`);
          if (!this.states.upload.failure) {
            this.states.upload.failure = {};
          }

          this.states.upload.failure[errorMsg] = this.states.upload.failure[errorMsg]
            ? this.states.upload.failure[errorMsg] + 1
            : 1;
        } else {
          this.states.upload.queueLength = this.states.upload.queueLength
            ? this.states.upload.queueLength - readCount
            : 0;
          this.states.upload.success = this.states.upload.success ? this.states.upload.success + readCount : readCount;
        }
      });
    });

    return p; // how about "await p" here? file-by-file?
  }

  async receiveMessages(receiveMessages) {
    if (!receiveMessages || !receiveMessages.Messages || !receiveMessages.Messages.length) {
      /* no work to do */
      this.log.info('complete (empty)');

      return Promise.resolve();
    }

    if (!this.downloadWorkerPool) {
      this.downloadWorkerPool = [];
      this.downloadWorkerPool.remaining = 0;
    }

    receiveMessages.Messages.forEach(message => {
      const p = new Promise((resolve, reject) => {
        // timeout to ensure this queueCb *always* gets called

        const timeoutHandle = setTimeout(() => {
          clearTimeout(timeoutHandle);
          this.log.error(`this.downloadWorkerPool timeoutHandle. Clearing queue slot for message: ${message.Body}`);
          this.downloadWorkerPool.remaining -= 1;
          reject();
        }, (60 + this.config.options.downloadTimeout) * 1000);

        this.processMessage(message, () => {
          this.downloadWorkerPool.remaining -= 1;
          clearTimeout(timeoutHandle);
          resolve();
        });
      });

      this.downloadWorkerPool.remaining += 1;
      this.downloadWorkerPool.push(p);
    });

    this.log.info(`downloader queued ${receiveMessages.Messages.length} files for download`);
    return Promise.all(this.downloadWorkerPool); // does awaiting here control parallelism better?
  }

  async deleteMessage(message) {
    try {
      const queueURL = await this.discoverQueue(this.config.instance.outputQueueName);
      const sqs = this.sessionedSQS();
      await sqs
        .deleteMessage({
          QueueUrl: queueURL,
          ReceiptHandle: message.ReceiptHandle,
        })
        .promise();
    } catch (error) {
      this.log.error(`deleteMessage exception: ${String(error)}`);
      this.states.download.failure[error] = this.states.download.failure[error]
        ? this.states.download.failure[error] + 1
        : 1;
    }
  }

  async processMessage(message, completeCb) {
    let messageBody;
    let folder;
    let s3;
    const that = this;

    const writeTelemetry = telemetry => {
      try {
        this.telemetryLogStream.write(JSON.stringify(telemetry) + os.EOL);
      } catch (telemetryWriteErr) {
        this.log.error(`error writing telemetry: ${telemetryWriteErr}`);
      }
      if (that.config.options.telemetryCb) {
        this.config.options.telemetryCb(telemetry);
      }
    };

    if (!message) {
      this.log.debug('download.processMessage: empty message');
      return completeCb();
    }

    if ('Attributes' in message) {
      if ('ApproximateReceiveCount' in message.Attributes) {
        this.log.info(`download.processMessage: ${message.MessageId} / ${message.Attributes.ApproximateReceiveCount}`);
      } else {
        this.log.info(`download.processMessage: ${message.MessageId} / NA `);
      }
    }

    try {
      messageBody = JSON.parse(message.Body);
    } catch (jsonError) {
      this.log.error(`error parsing JSON message.Body from message: ${JSON.stringify(message)} ${String(jsonError)}`);
      this.deleteMessage(message);
      return completeCb();
    }

    /* MC-405 telemetry log to file */
    if (messageBody.telemetry) {
      const { telemetry } = messageBody;

      if (telemetry.tm_path) {
        try {
          const data = await this.sessionedS3()
            .getObject({
              Bucket: messageBody.bucket,
              Key: telemetry.tm_path,
            })
            .promise();

          telemetry.batch = data.Body.toString('utf-8')
            .split('\n')
            .filter(d => d && d.length > 0)
            .map(row => {
              try {
                return JSON.parse(row);
              } catch (e) {
                this.log.error(`Telemetry Batch JSON Parse error: ${e.message}`);
                return row;
              }
            });
        } catch (err) {
          this.log.error(`Could not fetch telemetry JSON: ${err.message}`);
        }
      }

      writeTelemetry(telemetry);
    }

    if (!messageBody.path) {
      this.log.warn(`invalid message: ${JSON.stringify(messageBody)}`);
      return;
    }

    const match = messageBody.path.match(/[\w\W]*\/([\w\W]*?)$/);
    const fn = match ? match[1] : '';
    folder = this.config.options.outputFolder;

    if (this.config.options.filter === 'on') {
      /* MC-940: use folder hinting if present */
      if (messageBody.telemetry && messageBody.telemetry.hints && messageBody.telemetry.hints.folder) {
        this.log.debug(`using folder hint ${messageBody.telemetry.hints.folder}`);
        // MC-4987 - folder hints may now be nested.
        // eg: HIGH_QUALITY/CLASSIFIED/ALIGNED
        // or: LOW_QUALITY
        const codes = messageBody.telemetry.hints.folder
          .split('/') // hints are always unix-style
          .map(o => o.toUpperCase()); // MC-5612 cross-platform uppercase "pass" folder
        folder = path.join.apply(null, [folder, ...codes]);
      }
    }

    if (this.config.options.filetype === '.fast5') {
      // MC-5240: .fast5 files always need to be batched
      // eg: HIGH_QUALITY/CLASSIFIED/ALIGNED/BATCH-1
      folder = utils.findSuitableBatchIn(folder);
    }

    fs.mkdirpSync(folder);
    const outputFile = path.join(folder, fn);

    if (this.config.options.downloadMode === 'data+telemetry') {
      /* download file from S3 */
      this.log.info(`downloading ${messageBody.path} to ${outputFile}`);

      s3 = this.sessionedS3();
      this.initiateDownloadStream(s3, messageBody, message, outputFile, completeCb);
    } else if (this.config.options.downloadMode === 'telemetry') {
      /* skip download - only interested in telemetry */
      this.deleteMessage(message);

      const readCount =
        messageBody.telemetry.batch_summary && messageBody.telemetry.batch_summary.reads_num
          ? messageBody.telemetry.batch_summary.reads_num
          : 1;

      this.states.download.success = this.states.download.success
        ? this.states.download.success + readCount
        : readCount; // hmm. not exactly "download", these

      /* must signal completion */
      return completeCb();
    }
  }

  initiateDownloadStream(s3, messageBody, message, outputFile, completeCb) {
    let file;
    let transferTimeout;
    let visibilityInterval;
    let rs;

    const deleteFile = () => {
      // cleanup on exception
      if (this.config.options.filter !== 'on') {
        return;
      }

      // don't delete the file if the stream is in append mode
      // ideally the file should be restored to it's original state
      // if the write stream has already written data to disk, the downloaded dataset would be inaccurate
      //
      try {
        // if (file && file.bytesWritten > 0)
        fs.remove(outputFile, err => {
          if (err) {
            this.log.warn(`failed to remove file: ${outputFile}`);
          } else {
            this.log.warn(`removed failed download file: ${outputFile} ${err}`);
          }
        });
      } catch (unlinkException) {
        this.log.warn(`failed to remove file. unlinkException: ${outputFile} ${String(unlinkException)}`);
      }
    };

    const onStreamError = () => {
      if (!file.networkStreamError) {
        try {
          file.networkStreamError = 1; /* MC-1953 - signal the file end of the pipe this the network end of the pipe failed */
          file.close();
          deleteFile();
          if (rs.destroy) {
            // && !rs.destroyed) {
            this.log.error(`destroying readstream for ${outputFile}`);
            rs.destroy();
          }
        } catch (err) {
          this.log.error(`error handling sream error: ${err.message}`);
        }
      }
    };

    try {
      const params = {
        Bucket: messageBody.bucket,
        Key: messageBody.path,
      };

      if (this.config.instance.key_id) ;

      // MC-6270 : disable append to avoid appending the same data
      // file = fs.createWriteStream(outputFile, { "flags": "a" });
      file = fs.createWriteStream(outputFile);
      const req = s3.getObject(params);

      /* track request/response bytes expected
            req.on('httpHeaders', (status, headers, response) => {
                this.states.download.totalBytes += parseInt(headers['content-length']);
            });
            */

      rs = req.createReadStream();
    } catch (getObjectException) {
      this.log.error(`getObject/createReadStream exception: ${String(getObjectException)}`);
      if (completeCb) completeCb();
      return;
    }

    rs.on('error', readStreamError => {
      this.log.error(`error in download readstream ${readStreamError}`); /* e.g. socket hangup */
      try {
        onStreamError();
      } catch (e) {
        this.log.error(`error handling readStreamError: ${e}`);
      }
    });

    file.on('finish', async () => {
      if (!file.networkStreamError) {
        // SUCCESS
        this.log.debug(`downloaded ${outputFile}`);

        const readCount =
          messageBody.telemetry && messageBody.telemetry.batch_summary && messageBody.telemetry.batch_summary.reads_num
            ? messageBody.telemetry.batch_summary.reads_num
            : 1;

        if (!this.states.download.success) {
          this.states.download.success = readCount;
        } else {
          this.states.download.success += readCount;
        }

        // MC-1993 - store total size of downloaded files
        try {
          const stats = await fs.stat(outputFile);
          this.states.download.totalSize += stats.size;
        } catch (err) {
          this.log.warn(`failed to stat file: ${String(err)}`);
        }

        try {
          const logStats = () => {
            this.log.info(`Uploads: ${JSON.stringify(this.states.upload)}`);
            this.log.info(`Downloads: ${JSON.stringify(this.states.download)}`);
          };

          if (this.config.options.filetype === '.fastq' || this.config.options.filetype === '.fq') {
            // files may be appended, so can't increment the totalSize
            if (!this.downloadedFileSizes) this.downloadedFileSizes = {};

            try {
              const stats = await fs.stat(outputFile);
              this.downloadedFileSizes[outputFile] = stats.size || 0;
              this.states.download.totalSize = lodash.chain(this.downloadedFileSizes)
                .values()
                .sum()
                .value();
              logStats();
            } catch (err) {
              this.log.error(`finish, getFileSize (fastq) ${String(err)}`);
            }
          } else {
            try {
              const stats = await utils.getFileSize(outputFile);
              this.states.download.totalSize += stats.size || 0;
              logStats();
            } catch (err) {
              this.log.error(`finish, getFileSize (other) ${String(err)}`);
            }
          }

          // MC-2540 : if there is some postprocessing to do( e.g fastq extraction) - call the dataCallback
          // dataCallback might depend on the exit_status ( e.g. fastq can only be extracted from successful reads )
          const exitStatus =
            messageBody.telemetry && messageBody.telemetry.json ? messageBody.telemetry.json.exit_status : false;
          if (exitStatus && this.config.options.dataCb) {
            this.config.options.dataCb(outputFile, exitStatus);
          }
        } catch (err) {
          this.log.warn(`failed to fs.stat file: ${err}`);
        }

        this.deleteMessage(message); /* MC-1953 - only delete message on condition neither end of the pipe failed */
      }
    });

    file.on('close', writeStreamError => {
      this.log.debug(`closing writeStream ${outputFile}`);
      if (writeStreamError) {
        this.log.error(`error closing writestream ${writeStreamError}`);
        /* should we bail and return completeCb() here? */
      }

      /* must signal completion */
      clearTimeout(transferTimeout);
      clearInterval(visibilityInterval);
      // MC-2143 - check for more jobs
      setTimeout(this.loadAvailableDownloadMessages.bind(this));
      completeCb();
    });

    file.on('error', writeStreamError => {
      this.log.error(`error in download write stream ${writeStreamError}`);
      onStreamError();
    });

    const transferTimeoutFunc = () => {
      this.log.warn('transfer timed out');
      onStreamError();
    };
    transferTimeout = setTimeout(
      transferTimeoutFunc,
      1000 * this.config.options.downloadTimeout,
    ); /* download stream timeout in ms */

    const updateVisibilityFunc = async () => {
      const queueUrl = this.config.instance.outputQueueURL;
      const receiptHandle = message.ReceiptHandle;

      this.log.debug({ message_id: message.MessageId }, 'updateVisibility');

      try {
        await this.sqs
          .changeMessageVisibility({
            QueueUrl: queueUrl,
            ReceiptHandle: receiptHandle,
            VisibilityTimeout: this.config.options.inFlightDelay,
          })
          .promise();
      } catch (err) {
        this.log.error({ message_id: message.MessageId, queue: queueUrl, error: err }, 'Error setting visibility');
        clearInterval(visibilityInterval);
      }
    };
    visibilityInterval = setInterval(
      updateVisibilityFunc,
      900 * this.config.options.inFlightDelay,
    ); /* message in flight timeout in ms, less 10% */

    rs.on('data', () => {
      // bytesLoaded += chunk.length;
      clearTimeout(transferTimeout);
      transferTimeout = setTimeout(
        transferTimeoutFunc,
        1000 * this.config.options.downloadTimeout,
      ); /* download stream timeout in ms */
      //                this.log.debug(`downloaded ${chunk.length} bytes. resetting transferTimeout`);
    }).pipe(file); // initiate download stream
  }

  uploadHandler(file, completeCb) {
    /** open readStream and pipe to S3.upload */
    const s3 = this.sessionedS3();

    let rs;
    const batch = file.batch || '';
    const fileId = path.join(this.config.options.inputFolder, batch, file.name);
    const objectId = `${this.config.instance.bucketFolder}/component-0/${file.name}/${file.name}`;
    let timeoutHandle;
    let completed = false;

    const done = err => {
      if (!completed) {
        completed = true;
        clearTimeout(timeoutHandle);
        completeCb(err, file);
      }
    };

    // timeout to ensure this completeCb *always* gets called
    timeoutHandle = setTimeout(() => {
      if (rs && !rs.closed) rs.close();
      done(`this.uploadWorkerPool timeoutHandle. Clearing queue slot for file: ${file.name}`);
    }, (this.config.options.uploadTimeout + 5) * 1000);

    try {
      rs = fs.createReadStream(fileId);
    } catch (createReadStreamException) {
      return done(`createReadStreamException exception${String(createReadStreamException)}`); // close the queue job
    }

    rs.on('error', readStreamError => {
      rs.close();
      let errstr = 'error in upload readstream';
      if (readStreamError && readStreamError.message) {
        errstr += `: ${readStreamError.message}`;
      }
      done(errstr);
    });

    rs.on('open', () => {
      const params = {
        Bucket: this.config.instance.bucket,
        Key: objectId,
        Body: rs,
      };

      const options = { partSize: 10 * 1024 * 1024, queueSize: 1 };

      if (this.config.instance.key_id) {
        // MC-4996 support (optional, for now) encryption
        params.SSEKMSKeyId = this.config.instance.key_id;
        params.ServerSideEncryption = 'aws:kms';
      }

      if (file.size) {
        params['Content-Length'] = file.size;
      }

      const managedupload = s3.upload(params, options, async uploadStreamErr => {
        if (uploadStreamErr) {
          this.log.warn(`${file.id} uploadStreamError ${uploadStreamErr}`);
          return done(`uploadStreamError ${String(uploadStreamErr)}`); // close the queue job
        }
        this.log.info(`${file.id} S3 upload complete`);
        try {
          await this.uploadComplete(objectId, file);
        } catch (e) {
          done(e);
          return Promise.reject(e);
        }
        done();
        rs.close();
      });

      managedupload.on('httpUploadProgress', progress => {
        // MC-6789 - reset upload timeout
        this.log.debug(`upload progress ${progress.key} ${progress.loaded} / ${progress.total}`);

        clearTimeout(timeoutHandle);
        timeoutHandle = setTimeout(() => {
          if (rs && !rs.closed) rs.close();
          done(`this.uploadWorkerPool timeoutHandle. Clearing queue slot for file: ${file.name}`);
        }, (this.config.options.uploadTimeout + 5) * 1000);
      });
    });

    rs.on('end', rs.close);
    rs.on('close', () => this.log.debug('closing readstream'));
  }

  async discoverQueue(queueName) {
    if (this.config.instance.discoverQueueCache[queueName]) {
      return this.config.instance.discoverQueueCache[queueName];
    }

    this.log.debug(`discovering queue for ${queueName}`);

    try {
      const sqs = this.sessionedSQS();
      const getQueue = await sqs.getQueueUrl({ QueueName: queueName }).promise();

      this.log.debug(`found queue ${getQueue.QueueUrl}`);
      this.config.instance.discoverQueueCache[queueName] = getQueue.QueueUrl;

      return getQueue.QueueUrl;
    } catch (e) {
      this.log.error(`failed to find queue for ${queueName}: ${String(e)}`);
      return Promise.reject(e);
    }
  }

  async uploadComplete(objectId, file) {
    this.log.info(`${file.id} uploaded to S3: ${objectId}`);

    const message = {
      bucket: this.config.instance.bucket,
      outputQueue: this.config.instance.outputQueueName,
      remote_addr: this.config.instance.remote_addr,
      user_defined: this.config.instance.user_defined || null, // MC-2397 - bind paramthis.config to each sqs message
      apikey: this.config.options.apikey,
      id_workflow_instance: this.config.instance.id_workflow_instance,
      id_master: this.config.instance.id_workflow,
      utc: new Date().toISOString(),
      path: objectId,
      prefix: objectId.substring(0, objectId.lastIndexOf('/')),
    };

    if (this.config.instance.chain) {
      try {
        message.components = JSON.parse(JSON.stringify(this.config.instance.chain.components)); // low-frills object clone
        message.targetComponentId = this.config.instance.chain.targetComponentId; // first component to run
      } catch (jsonException) {
        this.log.error(`${file.id} exception parsing components JSON ${String(jsonException)}`);
        return Promise.reject(new Error('json exception')); // close the queue job
      }
    }

    // MC-5943 support (optional, for now) #SSE #crypto!
    if (this.config.instance.key_id) {
      message.key_id = this.config.instance.key_id;
    }

    // MC-1304 - attach geo location and ip
    if (this.config.options.agent_address) {
      try {
        message.agent_address = JSON.parse(this.config.options.agent_address);
      } catch (exception) {
        this.log.error(`${file.id} Could not parse agent_address ${String(exception)}`);
      }
    }

    if (message.components) {
      // optionally populate input + output queues
      Object.keys(message.components).forEach(o => {
        if (message.components[o].inputQueueName === 'uploadMessageQueue') {
          message.components[o].inputQueueName = this.uploadMessageQueue;
        }
        if (message.components[o].inputQueueName === 'downloadMessageQueue') {
          message.components[o].inputQueueName = this.downloadMessageQueue;
        }
      });
    }

    try {
      const inputQueueURL = await this.discoverQueue(this.config.instance.inputQueueName);
      const sqs = this.sessionedSQS();

      this.log.info(`${file.id} sending SQS message to input queue`);
      await sqs
        .sendMessage({
          QueueUrl: inputQueueURL,
          MessageBody: JSON.stringify(message),
        })
        .promise();
    } catch (sendMessageException) {
      this.log.error(`${file.id} exception sending SQS message: ${String(sendMessageException)}`);
      return Promise.reject(new Error('SQS sendmessage exception'));
    }

    this.log.info(`${file.id} SQS message sent. Move to uploaded`);

    try {
      await this.moveFile(file, 'upload');
    } catch (e) {
      return Promise.reject(e);
    }

    // success
  }

  async moveFile(file, type) {
    const moveTo = type === 'upload' ? this.uploadTo : this.skipTo;
    const fileName = file.name;
    const fileBatch = file.batch || '';
    const fileFrom = file.path || path.join(this.config.options.inputFolder, fileBatch, fileName);
    const fileTo = path.join(moveTo, fileBatch, fileName);

    try {
      await fs.mkdirp(path.join(moveTo, fileBatch));
      await fs.move(fileFrom, fileTo);

      this.log.debug(`${file.id}: ${type} and mv done`);

      if (type === 'upload') {
        this.states.upload.totalSize += file.size;
      }
      this.uploadedFiles.push(fileName); // flag as uploaded to prevent multiple uploads
    } catch (moveError) {
      this.log.debug(`${file.id} ${type} move error: ${String(moveError)}`);

      try {
        await fs.remove(fileTo);
      } catch (unlinkError) {
        this.log.warn(`${file.id} ${type} additionally failed to delete ${fileTo}: ${String(unlinkError)}`);
      }

      return Promise.reject(moveError);
    }
  }

  async queueLength(queueURL) {
    if (!queueURL) return Promise.resolve();

    const queueName = queueURL.match(/([\w\-_]+)$/)[0];
    this.log.debug(`querying queue length of ${queueName}`);

    try {
      const attrs = await this.sessionedSQS()
        .getQueueAttributes({
          QueueUrl: queueURL,
          AttributeNames: ['ApproximateNumberOfMessages'],
        })
        .promise();

      if (attrs && attrs.Attributes && 'ApproximateNumberOfMessages' in attrs.Attributes) {
        let len = attrs.Attributes.ApproximateNumberOfMessages;
        len = parseInt(len, 10) || 0;
        return Promise.resolve(len);
      }
    } catch (err) {
      this.log.error(`error in getQueueAttributes ${String(err)}`);
      return Promise.reject(err);
    }
    return Promise.resolve();
  }

  url() {
    return this.config.options.url;
  }

  apikey() {
    return this.config.options.apikey;
  }

  attr(key, value) {
    if (key in this.config.options) {
      if (value) {
        this.config.options[key] = value;
      } else {
        return this.config.options[key];
      }
    } else {
      throw new Error(`config object does not contain property ${key}`);
    }
    return this;
  }

  stats(key) {
    if (this.states[key]) {
      this.states[key].queueLength = parseInt(this.states[key].queueLength, 10) || 0; // a little housekeeping
      // 'total' is the most up-to-date measure of the total number of reads to be uploaded
      if (key === 'upload' && this.uploadedFiles && this.states.upload) {
        this.states.upload.total = this.uploadedFiles.length + this.states.upload.enqueued + this.states.upload.success;
      }
    }
    return this.states[key];
  }
}

EPI2ME.version = utils.version;
EPI2ME.REST = REST_FS;

module.exports = EPI2ME;
