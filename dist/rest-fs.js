"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _rest = require("./rest");

var _rest2 = _interopRequireDefault(_rest);

var _fsExtra = require("fs-extra");

var _fsExtra2 = _interopRequireDefault(_fsExtra);

var _path = require("path");

var _path2 = _interopRequireDefault(_path);

var _utilsFs = require("./utils-fs");

var _utilsFs2 = _interopRequireDefault(_utilsFs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

class REST_FS extends _rest2.default {
    constructor(options) {
        super(options);
    }

    async workflows(cb) {
        if (!this.options.local) {
            return super.workflows(cb);
        }

        let WORKFLOW_DIR = _path2.default.join(this.options.url, "workflows");

        await _fsExtra2.default.readdir(WORKFLOW_DIR).then(data => {
            return data.filter(id => {
                return _fsExtra2.default.statSync(_path2.default.join(WORKFLOW_DIR, id)) // ouch
                .isDirectory();
            });
        }).then(data => {
            return data.map(id => {
                const filename = _path2.default.join(WORKFLOW_DIR, id, "workflow.json");
                return require(filename); // try...catch?
            });
        }).then(data => {
            return cb(null, data);
        }).catch(err => {
            this.log.warn(err);
            return cb(null, []);
        });
    }

    workflow_instances(cb, query) {
        if (!this.options.local) {
            return super.workflow_instances(cb, query);
        }

        if (query) {
            return cb(new Error("querying of local instances unsupported in local mode"));
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
                    workflow = require(filename);
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
            return Promise.resolve(cb(null, data));
        });
    }

    async datasets(cb, query) {
        if (!this.options.local) {
            return super.datasets(cb, query);
        }

        if (!query) {
            query = {};
        }

        if (!query.show) {
            query.show = "mine";
        }

        if (query.show !== "mine") {
            return cb(new Error("querying of local datasets unsupported in local mode"));
        }

        let DATASET_DIR = _path2.default.join(this.options.url, "datasets");
        return await _fsExtra2.default.readdir(DATASET_DIR).then(data => {
            return data.filter(id => {
                return _fsExtra2.default.statSync(_path2.default.join(DATASET_DIR, id)).isDirectory();
            });
        }).then(data => {
            let id_dataset = 1;
            return data.sort().map(id => {
                return {
                    is_reference_dataset: true,
                    summary: null,
                    dataset_status: {
                        status_label: "Active",
                        status_value: "active"
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
                    id_dataset: id_dataset++,
                    id_user: null,
                    last_modified: null,
                    created: null,
                    name: id,
                    source: id,
                    attributes: null
                };
            });
        }).then(data => {
            return cb(null, data);
        }).catch(err => {
            this.log.warn(err);
            return cb(null, []);
        });
    }

    bundle_workflow(id_workflow, filepath, cb, progressCb) {
        // clean out target folder?
        // download tarball including workflow json
        // allocate install_token with STS credentials
        // initialise coastguard to perform ECR docker pull
        return _utilsFs2.default._pipe(`workflow/bundle/${id_workflow}.tar.gz`, filepath, this.options, cb, progressCb);
    }
}
exports.default = REST_FS;