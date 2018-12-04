import REST from "./rest"; 
import fs   from "fs-extra";
import path from "path";
import utils from "./utils-fs";

export default class REST_FS extends REST {
    constructor(options) {
        super(options);
    }

    workflows(cb) {
        if(!this.options.local) {
            return super.workflows(cb);
        }

        let WORKFLOW_DIR = path.join(this.options.url, "workflows");

        fs
            .readdir(WORKFLOW_DIR)
            .then(data => {
                return data.filter(id => {
                    return fs
                        .statSync(path.join(WORKFLOW_DIR, id)) // ouch
                        .isDirectory();
                });
            })
            .then(data => {
                return data.map(id => {
                    const filename = path.join(
                        WORKFLOW_DIR,
                        id,
                        "workflow.json"
                    );
                    return require(filename); // try...catch?
                });
            })
            .then(data => { return Promise.resolve(cb(null, data)); });
    }

    workflow_instances(cb, query) {
        if(!this.options.local) {
            return super.workflow_instances(cb, query);
        }

        if(query) {
            return cb(new Error("querying of local instances unsupported in local mode"));
        }

        let INSTANCE_DIR = path.join(this.options.url, "instances");
        return fs
            .readdir(INSTANCE_DIR)
            .then(data => {
                return data.filter(id => {
                    return fs
                        .statSync(path.join(INSTANCE_DIR, id))
                        .isDirectory();
                });
            })
            .then(data => {
                return data.map(id => {
                    const filename = path.join(
                        INSTANCE_DIR,
                        id,
                        "workflow.json"
                    );

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
            })
            .then(data => { return Promise.resolve(cb(null, data)); });
    }

    datasets(cb, query) {
        if(!this.options.local) {
            return super.datasets(cb, query);
        }

        if(!query) {
            query = {};
        }

        if(!query.show) {
            query.show = "mine";
        }

        if(query.show !== "mine") {
            return cb(new Error("querying of local datasets unsupported in local mode"));
        }

        let DATASET_DIR = path.join(this.options.url, "datasets");
        fs
            .readdir(DATASET_DIR)
            .then(data => {
                return data.filter(id => {
                    return fs
                        .statSync(path.join(DATASET_DIR, id))
                        .isDirectory();
                });
            })
            .then(data => {
                let id_dataset = 1;
                return data.sort().map(id => {
                    return {
                        is_reference_dataset: true,
                        summary: null,
                        dataset_status: {
                            status_label: "Active",
                            status_value: "active",
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
            })
            .then(data => {
                return Promise.resolve(cb(null, data));
            });
        return;
    }

    bundle_workflow(id_workflow, filepath, cb, progressCb) {
        // clean out target folder?
        // download tarball including workflow json
        // allocate install_token with STS credentials
        // initialise coastguard to perform ECR docker pull
        return utils._pipe(`workflow/bundle/${id_workflow}.tar.gz`, filepath, this.options, cb, progressCb);
    }
}
