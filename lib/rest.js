import utils from "./utils";
import os    from "os";
import fs    from "fs-extra";
import path  from "path";
import _     from "lodash";

export default class REST {
    constructor (options) {
        this.options = options;
    }

    _list(entity, cb) {
        return utils._get(entity, this.options, (e, json) => {
            if (e) {
                this.log.error("_list", e.error || e);
                cb(e.error);
            } else if (cb) {
                cb(null, json[entity + "s"]);
            }
        });
    }

    _read(entity, id, cb) {
        return utils._get(entity + "/" + id, this.options, cb);
    }

    user (cb) {
        if(this.options.apikey === "local") {
            return cb(null, {"accounts": [{ id_user_account: "none", number: "NONE", name: "None"}]}); // fake user with accounts
        }
        return utils._get("user", this.options, cb);
    }

    instance_token(id, cb) { /* should this be passed a hint at what the token is for? */
        return utils._post("token", { id_workflow_instance: id }, null, this.options, cb);
    }

    install_token(id, cb) {
        return utils._post("token/install", { id_workflow: id }, null, this.options, cb);
    }

    attributes(cb) {
        return this._list("attribute", cb);
    }

    workflows(cb) {
        if(this.options.apikey === "local") {
            let WORKFLOW_DIR = path.join(this.options.url, "workflows");

            return fs
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
                        const content = fs.readFileSync(filename); // ouch
                        return JSON.parse(content); // try...catch
                    });
                })
                .then(data => { cb(null, data); });
        } else {
            return this._list("workflow", cb);
        }
    }
    workflow(id, obj, cb) {
        if (cb) {
            // three args: update object
            return utils._post("workflow", id, obj, this.options, cb);
        }

        // two args: get object
        const callback = obj, that = this;

        if(!id) {
            return callback(null, null);
        }

        if(this.options.apikey === "local") {
            let WORKFLOW_DIR = path.join(this.options.url, "workflows");
            let filename = path.join(
                WORKFLOW_DIR,
                id,
                "workflow.json"
            );
            let workflow;
            try {
                workflow = JSON.parse(fs.readFileSync(filename));
            } catch (readWorkflowException) {
                return cb(readWorkflowException);
            }
            return callback(null, workflow);
        }

        this._read("workflow", id, (err, details) => {
            if(!details) {
                details = {};
            }

            if(!details.params) {
                details.params = {};
            }

            let promises = [];
            promises.push(new Promise((resolve, reject) => {
                const uri = "workflow/config/" + id;
                utils._get(uri, that.config.options, (err, resp) => {
                    if (err) {
                        this.log.error("failed to fetch " + uri);
                        reject(err);
                    } else {
                        _.merge(details, resp);
                        resolve();
                    }
                });
            }));
      
            // MC-6483 - fetch ajax options for "AJAX drop down widget"
            let toFetch = _.filter(details.params, { widget: "ajax_dropdown" });
            promises.unshift(... toFetch.map(param => {
                return new Promise((resolve, reject) => {

                    const uri = param.values.source
                        .replace("{{EPI2ME_HOST}}", "");

                    utils._get(uri, this.options, (err, resp) => {
                        if (err) {
                            this.log.error("failed to fetch " + uri);
                            reject(err);
                        } else {
                            const data_root = resp[param.values.data_root];
                            if(data_root) {
                                param.values = data_root.map(o => {
                                    return {
                                        label: o[param.values.items.label_key],
                                        value: o[param.values.items.value_key]
                                    };
                                });
                            }
                            resolve();
                        }
                    });
                });
            }));

            Promise.all(promises)
                .then(() => {
                    callback(null, details);
                })
                .catch((err) => {
                    this.log.error(`${id}: error fetching config and parameters (${err.error||err})`);
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
        return utils._pipe(`workflow/bundle/${id_workflow}.tar.gz`, filepath, this.options, cb, progressCb);
    }

    start_workflow(config, cb) {
        return utils._post("workflow_instance", null, config, this.options, cb);
    }

    stop_workflow(instance_id, cb) {
        return utils._put("workflow_instance/stop", instance_id, null, this.options, cb);
    }

    workflow_instances(cb, query) {
        if(this.options.apikey === "local") {
            if(query) {
                this.log.error("querying of local instances is not yet available");
                return;
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
                            workflow = JSON.parse(fs.readFileSync(filename));
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
                .then(data => { cb(null, data); });
        }

        if(query && query.run_id) {
            return utils._get("workflow_instance/wi.json?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]="+query.run_id+";", this.options, (e, json) => {
                let mapped = json.data.map(
                    (o) => {
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
        return utils._get("workflow/config/" + id, this.options, cb);
    }

    register(code, cb) {
        return utils._post("reg", code, {
            description: os.userInfo().username + "@" + os.hostname(),
            _signing: false
        }, this.options, cb);
    }

    fetchContent(url, cb) {
        let options = JSON.parse(JSON.stringify(this.options));
        options.skip_url_mangle = true;
        utils._get(url, options, cb);
    }
}
