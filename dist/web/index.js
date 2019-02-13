/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2019
 */

"use strict";function _interopDefault(e){return e&&"object"===typeof e&&"default"in e?e.default:e}var os=_interopDefault(require("os")),lodash=require("lodash"),axios=_interopDefault(require("axios")),crypto=_interopDefault(require("crypto")),version="3.0.0";axios.defaults.validateStatus=(e=>e<=504);const utils=function(){const e=(e,r)=>{e.headers||(e.headers={});let t=r;if(t||(t={}),!t.apikey)return;if(e.headers["X-EPI2ME-ApiKey"]=t.apikey,!t.apisecret)return;e.headers["X-EPI2ME-SignatureDate"]=(new Date).toISOString(),e.url.match(/^https:/)&&(e.url=e.url.replace(/:443/,"")),e.url.match(/^http:/)&&(e.url=e.url.replace(/:80/,""));const o=[e.url,Object.keys(e.headers).sort().filter(e=>e.match(/^x-epi2me/i)).map(r=>`${r}:${e.headers[r]}`).join("\n")].join("\n"),s=crypto.createHmac("sha1",t.apisecret).update(o).digest("hex");e.headers["X-EPI2ME-SignatureV0"]=s},r=async e=>{const r=e?e.data:null;if(!r)return Promise.reject(new Error("unexpected non-json response"));if(e&&e.status>=400){let t=`Network error ${e.status}`;return r.error&&(t=r.error),504===e.status&&(t="Please check your network connection and try again."),Promise.reject(new Error(t))}return r.error?Promise.reject(new Error(r.error)):Promise.resolve(r)};return{version:version,headers:(r,t)=>{let o=t;o||(o={}),r.headers=lodash.merge({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-Client":o.user_agent||"api","X-EPI2ME-Version":o.agent_version||utils.version},r.headers),"signing"in o&&!o.signing||e(r,o),o.proxy&&(r.proxy=o.proxy)},get:async(e,t)=>{let o,s=t.url,n=e;t.skip_url_mangle?o=n:(n=`/${n}`,o=(s=s.replace(/\/+$/,""))+(n=n.replace(/\/+/g,"/")));const i={url:o,gzip:!0};let a;utils.headers(i,t);try{a=await axios.get(i.url,i)}catch(c){return Promise.reject(c)}return r(a,t)},post:async(e,t,o)=>{let s=o.url;const n={url:`${s=s.replace(/\/+$/,"")}/${e.replace(/\/+/g,"/")}`,gzip:!0,data:t,headers:{}};if(o.legacy_form){const e=[],r=lodash.merge({json:JSON.stringify(t)},t);Object.keys(r).sort().forEach(t=>{e.push(`${t}=${escape(r[t])}`)}),n.data=e.join("&"),n.headers["Content-Type"]="application/x-www-form-urlencoded"}utils.headers(n,o);const{data:i}=n;let a;delete n.data;try{a=await axios.post(n.url,i,n)}catch(c){return Promise.reject(c)}return r(a,o)},put:async(e,t,o,s)=>{let n=s.url;const i={url:`${n=n.replace(/\/+$/,"")}/${e.replace(/\/+/g,"/")}/${t}`,gzip:!0,data:o,headers:{}};if(s.legacy_form){const e=[],r=lodash.merge({json:JSON.stringify(o)},o);Object.keys(r).sort().forEach(t=>{e.push(`${t}=${escape(r[t])}`)}),i.data=e.join("&"),i.headers["Content-Type"]="application/x-www-form-urlencoded"}utils.headers(i,s);const{data:a}=i;let c;delete i.data;try{c=await axios.put(i.url,a,i)}catch(l){return Promise.reject(l)}return r(c,s)}}}();var local=!1,url="https://epi2me.nanoporetech.com",user_agent="EPI2ME API",signing=!0;class REST{constructor(e){this.options=lodash.assign({agent_version:utils.version,local:local,url:url,user_agent:user_agent,signing:signing},e);const{log:r}=this.options;if(r){if(!lodash.every([r.info,r.warn,r.error],lodash.isFunction))throw new Error('expected log object to have "error", "debug", "info" and "warn" methods');this.log=r}else this.log={info:e=>{console.info(`[${(new Date).toISOString()}] INFO: ${e}`)},debug:e=>{console.debug(`[${(new Date).toISOString()}] DEBUG: ${e}`)},warn:e=>{console.warn(`[${(new Date).toISOString()}] WARN: ${e}`)},error:e=>{console.error(`[${(new Date).toISOString()}] ERROR: ${e}`)}}}async list(e){try{const t=await utils.get(e,this.options),o=e.match(/^[a-z_]+/i)[0];return Promise.resolve(t[`${o}s`])}catch(r){return this.log.error(`list error ${String(r)}`),Promise.reject(r)}}async read(e,r){try{const o=await utils.get(`${e}/${r}`,this.options);return Promise.resolve(o)}catch(t){return this.log.error("read",t),Promise.reject(t)}}async user(e){let r;if(this.options.local)r={accounts:[{id_user_account:"none",number:"NONE",name:"None"}]};else try{r=await utils.get("user",this.options)}catch(t){return e?e(t):Promise.reject(t)}return e?e(null,r):Promise.resolve(r)}async instanceToken(e,r){try{const o=await utils.post("token",{id_workflow_instance:e},lodash.assign({},this.options,{legacy_form:!0}));return r?r(null,o):Promise.resolve(o)}catch(t){return r?r(t):Promise.reject(t)}}async installToken(e,r){try{const o=await utils.post("token/install",{id_workflow:e},lodash.assign({},this.options,{legacy_form:!0}));return r?r(null,o):Promise.resolve(o)}catch(t){return r?r(t):Promise.reject(t)}}async attributes(e){try{const t=await this.list("attribute");return e?e(null,t):Promise.resolve(t)}catch(r){return e?e(r):Promise.reject(r)}}async workflows(e){try{const t=await this.list("workflow");return e?e(null,t):Promise.resolve(t)}catch(r){return e?e(r):Promise.reject(r)}}async amiImages(e){if(this.options.local){const r=new Error("amiImages unsupported in local mode");return e?e(r):Promise.reject(r)}try{const t=this.list("ami_image");return e?e(null,t):Promise.resolve(t)}catch(r){return e?e(r):Promise.reject(r)}}async amiImage(e,r,t){let o,s,n,i;if(e&&r&&t instanceof Function?(o=e,s=r,n=t,i="update"):e&&r instanceof Object&&!(r instanceof Function)?(o=e,s=r,i="update"):e instanceof Object&&r instanceof Function?(s=e,n=r,i="create"):e instanceof Object&&!r?(s=e,i="create"):(i="read",o=e,n=r instanceof Function?r:null),this.options.local){const e=new Error("ami_image unsupported in local mode");return n?n(e):Promise.reject(e)}if("update"===i)try{const e=await utils.put("ami_image",o,s,this.options);return n?n(null,e):Promise.resolve(e)}catch(a){return n?n(a):Promise.reject(a)}if("create"===i)try{const e=await utils.post("ami_image",s,this.options);return n?n(null,e):Promise.resolve(e)}catch(a){return n?n(a):Promise.reject(a)}if(!o){const e=new Error("no id_ami_image specified");return n?n(e):Promise.reject(e)}try{const e=await this.read("ami_image",o);return n?n(null,e):Promise.resolve(e)}catch(a){return n?n(a):Promise.reject(a)}}async workflow(e,r,t){let o,s,n,i;if(e&&r&&t instanceof Function?(o=e,s=r,n=t,i="update"):e&&r instanceof Object&&!(r instanceof Function)?(o=e,s=r,i="update"):e instanceof Object&&r instanceof Function?(s=e,n=r,i="create"):e instanceof Object&&!r?(s=e,i="create"):(i="read",o=e,n=r instanceof Function?r:null),"update"===i)try{const e=await utils.put("workflow",o,s,lodash.assign({},this.options,{legacy_form:!0}));return n?n(null,e):Promise.resolve(e)}catch(u){return n?n(u):Promise.reject(u)}if("create"===i)try{const e=await utils.post("workflow",s,lodash.assign({},this.options,{legacy_form:!0}));return n?n(null,e):Promise.resolve(e)}catch(u){return n?n(u):Promise.reject(u)}if(!o){const e=new Error("no workflow id specified");return n?n(e):Promise.reject(e)}const a={};try{const e=await this.read("workflow",o);if(e.error)throw new Error(e.error);lodash.merge(a,e)}catch(u){return this.log.error(`${o}: error fetching workflow ${String(u)}`),n?n(u):Promise.reject(u)}lodash.merge(a,{params:{}});try{const e=await utils.get(`workflow/config/${o}`,this.options);if(e.error)throw new Error(e.error);lodash.merge(a,e)}catch(u){return this.log.error(`${o}: error fetching workflow config ${String(u)}`),n?n(u):Promise.reject(u)}const c=lodash.filter(a.params,{widget:"ajax_dropdown"}),l=[...c.map((e,r)=>{const t=c[r];return new Promise(async(e,r)=>{const o=t.values.source.replace("{{EPI2ME_HOST}}","");try{const s=(await utils.get(o,this.options))[t.values.data_root];return s&&(t.values=s.map(e=>({label:e[t.values.items.label_key],value:e[t.values.items.value_key]}))),e()}catch(u){return this.log.error(`failed to fetch ${o}`),r(u)}})})];try{return await Promise.all(l),n?n(null,a):Promise.resolve(a)}catch(u){return this.log.error(`${o}: error fetching config and parameters ${String(u)}`),n?n(u):Promise.reject(u)}}async startWorkflow(e,r){return utils.post("workflow_instance",e,lodash.assign({},this.options,{legacy_form:!0}),r)}stopWorkflow(e,r){return utils.put("workflow_instance/stop",e,null,lodash.assign({},this.options,{legacy_form:!0}),r)}async workflowInstances(e,r){let t,o;if(!e||e instanceof Function||void 0!==r?(t=e,o=r):o=e,o&&o.run_id)try{const e=(await utils.get(`workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=${o.run_id};`,this.options)).data.map(e=>({id_workflow_instance:e.id_ins,id_workflow:e.id_flo,run_id:e.run_id,description:e.desc,rev:e.rev}));return t?t(null,e):Promise.resolve(e)}catch(s){return t?t(s):Promise.reject(s)}try{const e=await this.list("workflow_instance");return t?t(null,e):Promise.resolve(e)}catch(s){return t?t(s):Promise.reject(s)}}async workflowInstance(e,r){try{const o=await this.read("workflow_instance",e);return r?r(null,o):Promise.resolve(o)}catch(t){return r?r(t):Promise.reject(t)}}workflowConfig(e,r){return utils.get(`workflow/config/${e}`,this.options,r)}async register(e,r,t){let o,s;r&&r instanceof Function?s=r:(o=r,s=t);try{const r=await utils.put("reg",e,{description:o||`${os.userInfo().username}@${os.hostname()}`},lodash.assign({},this.options,{signing:!1}));return s?s(null,r):Promise.resolve(r)}catch(n){return s?s(n):Promise.reject(n)}}async datasets(e,r){let t,o;!e||e instanceof Function||void 0!==r?(t=e,o=r):o=e,o||(o={}),o.show||(o.show="mine");try{const e=await this.list(`dataset?show=${o.show}`);return t?t(null,e):Promise.resolve(e)}catch(s){return t?t(s):Promise.reject(s)}}async dataset(e,r){if(!this.options.local)try{const o=await this.read("dataset",e);return r?r(null,o):Promise.resolve(o)}catch(t){return r?r(t):Promise.reject(t)}try{const o=(await this.datasets()).find(r=>r.id_dataset===e);return r?r(null,o):Promise.resolve(o)}catch(t){return r?r(t):Promise.reject(t)}}async fetchContent(e,r){const t=lodash.assign({},this.options,{skip_url_mangle:!0});try{const s=await utils.get(e,t);return r?r(null,s):Promise.resolve(s)}catch(o){return r?r(o):Promise.reject(o)}}}module.exports=REST;
