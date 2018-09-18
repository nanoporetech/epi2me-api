"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _utils = require("./utils");

var _utils2 = _interopRequireDefault(_utils);

var _os = require("os");

var _os2 = _interopRequireDefault(_os);

var _fsExtra = require("fs-extra");

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _lodash = require("lodash");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

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
        return _utils2.default._get(entity, this.options, (e, json) => {
            if (e) {
                this.log.error("_list", e.error || e);
                cb(e.error);
                return;
            }

            entity = entity.match(/^[a-z_]+/i)[0]; // dataset?foo=bar => dataset
            cb(null, json[entity + "s"]);
        });
    }

    _read(entity, id, cb) {
        return _utils2.default._get(entity + "/" + id, this.options, cb);
    }

    user(cb) {
        if (this.options.apikey === "local") {
            return cb(null, { "accounts": [{ id_user_account: "none", number: "NONE", name: "None" }] }); // fake user with accounts
        }
        return _utils2.default._get("user", this.options, cb);
    }

    instance_token(id, cb) {
        /* should this be passed a hint at what the token is for? */
        return _utils2.default._post("token", { id_workflow_instance: id }, null, this.options, cb);
    }

    install_token(id, cb) {
        return _utils2.default._post("token/install", { id_workflow: id }, null, this.options, cb);
    }

    attributes(cb) {
        return this._list("attribute", cb);
    }

    workflows(cb) {
        if (this.options.apikey === "local") {
            let WORKFLOW_DIR = _path2.default.join(this.options.url, "workflows");

            return _fsExtra2.default.readdir(WORKFLOW_DIR).then(data => {
                return data.filter(id => {
                    return _fsExtra2.default.statSync(_path2.default.join(WORKFLOW_DIR, id)) // ouch
                    .isDirectory();
                });
            }).then(data => {
                return data.map(id => {
                    const filename = _path2.default.join(WORKFLOW_DIR, id, "workflow.json");
                    const content = _fsExtra2.default.readFileSync(filename); // ouch
                    return JSON.parse(content); // try...catch
                });
            }).then(data => {
                cb(null, data);
            });
        } else {
            return this._list("workflow", cb);
        }
    }

    workflow(id, obj, cb) {
        if (cb) {
            // three args: update object
            return _utils2.default._post("workflow", id, obj, this.options, cb);
        }

        // two args: get object
        const callback = obj;

        if (!id) {
            return callback(null, null);
        }

        if (this.options.apikey === "local") {
            let WORKFLOW_DIR = _path2.default.join(this.options.url, "workflows");
            let filename = _path2.default.join(WORKFLOW_DIR, id, "workflow.json");
            let workflow;
            try {
                workflow = JSON.parse(_fsExtra2.default.readFileSync(filename));
            } catch (readWorkflowException) {
                return cb(readWorkflowException);
            }
            return callback(null, workflow);
        }

        this._read("workflow", id, (err, details) => {
            if (!details) {
                details = {};
            }

            if (!details.params) {
                details.params = {};
            }

            let promises = [];
            promises.push(new Promise((resolve, reject) => {
                const uri = "workflow/config/" + id;
                _utils2.default._get(uri, this.options, (err, resp) => {
                    if (err) {
                        this.log.error("failed to fetch " + uri);
                        reject(err);
                        return;
                    }

                    (0, _lodash.merge)(details, resp);
                    resolve();
                });
            }));

            // MC-6483 - fetch ajax options for "AJAX drop down widget"
            let toFetch = (0, _lodash.filter)(details.params, { widget: "ajax_dropdown" });
            promises.unshift(...toFetch.map(param => {
                return new Promise((resolve, reject) => {

                    const uri = param.values.source.replace("{{EPI2ME_HOST}}", "");

                    _utils2.default._get(uri, this.options, (err, resp) => {
                        if (err) {
                            this.log.error("failed to fetch " + uri);
                            reject(err);
                            return;
                        }

                        const data_root = resp[param.values.data_root];
                        if (data_root) {
                            param.values = data_root.map(o => {
                                return {
                                    label: o[param.values.items.label_key],
                                    value: o[param.values.items.value_key]
                                };
                            });
                        }
                        resolve();
                    });
                });
            }));

            Promise.all(promises).then(() => {
                callback(null, details);
            }).catch(err => {
                this.log.error(`${id}: error fetching config and parameters (${err.error || err})`);
                callback(err);
            });
        });

        return;
    }

    bundle_workflow(id_workflow, filepath, cb, progressCb) {
        // clean out target folder?
        // download tarball including workflow json
        // allocate install_token with STS credentials
        // initialise coastguard to perform ECR docker pull
        return _utils2.default._pipe(`workflow/bundle/${id_workflow}.tar.gz`, filepath, this.options, cb, progressCb);
    }

    start_workflow(config, cb) {
        return _utils2.default._post("workflow_instance", null, config, this.options, cb);
    }

    stop_workflow(instance_id, cb) {
        return _utils2.default._put("workflow_instance/stop", instance_id, null, this.options, cb);
    }

    workflow_instances(cb, query) {
        if (this.options.apikey === "local") {
            if (query) {
                this.log.error("querying of local instances is not yet available");
                return;
            }

            let INSTANCE_DIR = _path2.default.join(this.options.url, "instances");
            return _fsExtra2.default.readdir(INSTANCE_DIR).then(data => {
                return data.filter(id => {
                    return _fsExtra2.default.statSync(_path2.default.join(INSTANCE_DIR, id)).isDirectory();
                });
            }).then(data => {
                return data.map(id => {
                    const filename = _path2.default.join(INSTANCE_DIR, id, "workflow.json");

                    let workflow;
                    try {
                        workflow = JSON.parse(_fsExtra2.default.readFileSync(filename));
                    } catch (ignore) {
                        workflow = {
                            id_workflow: "-",
                            description: "-",
                            rev: "0.0"
                        };
                    }

                    workflow.id_workflow_instance = id;
                    workflow.filename = filename;
                    return workflow;
                });
            }).then(data => {
                cb(null, data);
            });
        }

        if (query && query.run_id) {
            return _utils2.default._get("workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=" + query.run_id + ";", this.options, (e, json) => {
                let mapped = json.data.map(o => {
                    return {
                        id_workflow_instance: o.id_ins,
                        id_workflow: o.id_flo,
                        run_id: o.run_id,
                        description: o.desc,
                        rev: o.rev
                    };
                });
                return cb(null, mapped);
            });
        }

        return this._list("workflow_instance", cb);
    }

    workflow_instance(id, cb) {
        return this._read("workflow_instance", id, cb);
    }

    workflow_config(id, cb) {
        return _utils2.default._get("workflow/config/" + id, this.options, cb);
    }

    register(code, cb) {
        return _utils2.default._post("reg", code, {
            description: _os2.default.userInfo().username + "@" + _os2.default.hostname(),
            _signing: false
        }, this.options, cb);
    }

    datasets(cb, query) {
        if (!query) {
            query = {};
        }
        if (!query.show) {
            query.show = "mine";
        }
        return this._list(`dataset?show=${query.show}`, cb);
    }

    dataset(id, cb) {
        return this._read("dataset", id, cb);
    }

    fetchContent(url, cb) {
        let options = (0, _lodash.merge)({ skip_url_mangle: true }, this.options);
        _utils2.default._get(url, options, cb);
    }
}
exports.default = REST;