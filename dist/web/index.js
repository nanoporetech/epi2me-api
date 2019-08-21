/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2019
 */

<<<<<<< HEAD
"use strict";function _interopDefault(e){return e&&"object"===typeof e&&"default"in e?e.default:e}var lodash=require("lodash"),AWS=_interopDefault(require("aws-sdk")),proxy=_interopDefault(require("proxy-agent")),Promise$1=_interopDefault(require("core-js/features/promise")),axios=_interopDefault(require("axios")),crypto=_interopDefault(require("crypto")),tunnel=require("tunnel"),os=_interopDefault(require("os")),version="2019.8.21-1556";axios.defaults.validateStatus=e=>e<=504;const UNITS=["","K","M","G","T","P","E","Z"],DIV=1e3,utils=function(){const e=(e,t)=>{e.headers||(e.headers={});let s=t;if(s||(s={}),!s.apikey)return;if(e.headers["X-EPI2ME-ApiKey"]=s.apikey,!s.apisecret)return;e.headers["X-EPI2ME-SignatureDate"]=(new Date).toISOString(),e.url.match(/^https:/)&&(e.url=e.url.replace(/:443/,"")),e.url.match(/^http:/)&&(e.url=e.url.replace(/:80/,""));const r=[e.url,Object.keys(e.headers).sort().filter(e=>e.match(/^x-epi2me/i)).map(t=>`${t}:${e.headers[t]}`).join("\n")].join("\n"),o=crypto.createHmac("sha1",s.apisecret).update(r).digest("hex");e.headers["X-EPI2ME-SignatureV0"]=o},t=async e=>{const t=e?e.data:null;if(!t)return Promise.reject(new Error("unexpected non-json response"));if(e&&e.status>=400){let s=`Network error ${e.status}`;return t.error&&(s=t.error),504===e.status&&(s="Please check your network connection and try again."),Promise.reject(new Error(s))}return t.error?Promise.reject(new Error(t.error)):Promise.resolve(t)};return{version:version,headers:(t,s)=>{const{log:r}=lodash.merge({log:{debug:()=>{}}},s);let o=s;if(o||(o={}),t.headers=lodash.merge({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-Client":o.user_agent||"api","X-EPI2ME-Version":o.agent_version||utils.version},t.headers,o.headers),"signing"in o&&!o.signing||e(t,o),o.proxy){const e=o.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/),s=e[2],i=e[3],n={host:e[4],port:e[5]};s&&i&&(n.proxyAuth=`${s}:${i}`),o.proxy.match(/^https/)?(r.debug("using HTTPS over HTTPS proxy",JSON.stringify(n)),t.httpsAgent=tunnel.httpsOverHttps({proxy:n})):(r.debug("using HTTPS over HTTP proxy",JSON.stringify(n)),t.httpsAgent=tunnel.httpsOverHttp({proxy:n})),t.proxy=!1}},get:async(e,s)=>{const{log:r}=lodash.merge({log:{debug:()=>{}}},s);let o,i=s.url,n=e;s.skip_url_mangle?o=n:(n=`/${n}`,o=(i=i.replace(/\/+$/,""))+(n=n.replace(/\/+/g,"/")));const a={url:o,gzip:!0};let l;utils.headers(a,s);try{r.debug(`GET ${a.url}`),l=await axios.get(a.url,a)}catch(c){return Promise.reject(c)}return t(l,s)},post:async(e,s,r)=>{const{log:o}=lodash.merge({log:{debug:()=>{}}},r);let i=r.url;const n={url:`${i=i.replace(/\/+$/,"")}/${e.replace(/\/+/g,"/")}`,gzip:!0,data:s,headers:{}};if(r.legacy_form){const e=[],t=lodash.merge({json:JSON.stringify(s)},s);Object.keys(t).sort().forEach(s=>{e.push(`${s}=${escape(t[s])}`)}),n.data=e.join("&"),n.headers["Content-Type"]="application/x-www-form-urlencoded"}utils.headers(n,r);const{data:a}=n;let l;delete n.data;try{o.debug(`POST ${n.url}`),l=await axios.post(n.url,a,n)}catch(c){return Promise.reject(c)}return t(l,r)},put:async(e,s,r,o)=>{const{log:i}=lodash.merge({log:{debug:()=>{}}},o);let n=o.url;const a={url:`${n=n.replace(/\/+$/,"")}/${e.replace(/\/+/g,"/")}/${s}`,gzip:!0,data:r,headers:{}};if(o.legacy_form){const e=[],t=lodash.merge({json:JSON.stringify(r)},r);Object.keys(t).sort().forEach(s=>{e.push(`${s}=${escape(t[s])}`)}),a.data=e.join("&"),a.headers["Content-Type"]="application/x-www-form-urlencoded"}utils.headers(a,o);const{data:l}=a;let c;delete a.data;try{i.debug(`PUT ${a.url}`),c=await axios.put(a.url,l,a)}catch(u){return Promise.reject(u)}return t(c,o)},niceSize(e,t){let s=t||0,r=e||0;return r>1e3?(r/=1e3,(s+=1)>=UNITS.length?"???":this.niceSize(r,s)):0===s?`${r}${UNITS[s]}`:`${r.toFixed(1)}${UNITS[s]}`}}}();var local=!1,url="https://epi2me.nanoporetech.com",user_agent="EPI2ME API",region="eu-west-1",sessionGrace=5,uploadTimeout=1200,downloadTimeout=1200,fileCheckInterval=5,downloadCheckInterval=3,stateCheckInterval=60,inFlightDelay=600,waitTimeSeconds=20,waitTokenError=30,transferPoolSize=3,downloadMode="data+telemetry",filetype=".fastq",signing=!0,DEFAULTS={local:local,url:url,user_agent:user_agent,region:region,sessionGrace:sessionGrace,uploadTimeout:uploadTimeout,downloadTimeout:downloadTimeout,fileCheckInterval:fileCheckInterval,downloadCheckInterval:downloadCheckInterval,stateCheckInterval:stateCheckInterval,inFlightDelay:inFlightDelay,waitTimeSeconds:waitTimeSeconds,waitTokenError:waitTokenError,transferPoolSize:transferPoolSize,downloadMode:downloadMode,filetype:filetype,signing:signing};class REST{constructor(e){this.options=lodash.assign({agent_version:utils.version,local:local,url:url,user_agent:user_agent,signing:signing},e),this.log=this.options.log}async list(e){try{const s=await utils.get(e,this.options),r=e.match(/^[a-z_]+/i)[0];return Promise.resolve(s[`${r}s`])}catch(t){return this.log.error(`list error ${String(t)}`),Promise.reject(t)}}async read(e,t){try{const r=await utils.get(`${e}/${t}`,this.options);return Promise.resolve(r)}catch(s){return this.log.error("read",s),Promise.reject(s)}}async user(e){let t;if(this.options.local)t={accounts:[{id_user_account:"none",number:"NONE",name:"None"}]};else try{t=await utils.get("user",this.options)}catch(s){return e?e(s):Promise.reject(s)}return e?e(null,t):Promise.resolve(t)}async status(){try{const t=await utils.get("status",this.options);return Promise.resolve(t)}catch(e){return Promise.reject(e)}}async instanceToken(e,t){try{const r=await utils.post("token",lodash.merge(t,{id_workflow_instance:e}),lodash.assign({},this.options,{legacy_form:!0}));return Promise.resolve(r)}catch(s){return Promise.reject(s)}}async installToken(e,t){try{const r=await utils.post("token/install",{id_workflow:e},lodash.assign({},this.options,{legacy_form:!0}));return t?t(null,r):Promise.resolve(r)}catch(s){return t?t(s):Promise.reject(s)}}async attributes(e){try{const s=await this.list("attribute");return e?e(null,s):Promise.resolve(s)}catch(t){return e?e(t):Promise.reject(t)}}async workflows(e){try{const s=await this.list("workflow");return e?e(null,s):Promise.resolve(s)}catch(t){return e?e(t):Promise.reject(t)}}async amiImages(e){if(this.options.local){const t=new Error("amiImages unsupported in local mode");return e?e(t):Promise.reject(t)}try{const s=this.list("ami_image");return e?e(null,s):Promise.resolve(s)}catch(t){return e?e(t):Promise.reject(t)}}async amiImage(e,t,s){let r,o,i,n;if(e&&t&&s instanceof Function?(r=e,o=t,i=s,n="update"):e&&t instanceof Object&&!(t instanceof Function)?(r=e,o=t,n="update"):e instanceof Object&&t instanceof Function?(o=e,i=t,n="create"):e instanceof Object&&!t?(o=e,n="create"):(n="read",r=e,i=t instanceof Function?t:null),this.options.local){const e=new Error("ami_image unsupported in local mode");return i?i(e):Promise.reject(e)}if("update"===n)try{const e=await utils.put("ami_image",r,o,this.options);return i?i(null,e):Promise.resolve(e)}catch(a){return i?i(a):Promise.reject(a)}if("create"===n)try{const e=await utils.post("ami_image",o,this.options);return i?i(null,e):Promise.resolve(e)}catch(a){return i?i(a):Promise.reject(a)}if(!r){const e=new Error("no id_ami_image specified");return i?i(e):Promise.reject(e)}try{const e=await this.read("ami_image",r);return i?i(null,e):Promise.resolve(e)}catch(a){return i?i(a):Promise.reject(a)}}async workflow(e,t,s){let r,o,i,n;if(e&&t&&s instanceof Function?(r=e,o=t,i=s,n="update"):e&&t instanceof Object&&!(t instanceof Function)?(r=e,o=t,n="update"):e instanceof Object&&t instanceof Function?(o=e,i=t,n="create"):e instanceof Object&&!t?(o=e,n="create"):(n="read",r=e,i=t instanceof Function?t:null),"update"===n)try{const e=await utils.put("workflow",r,o,this.options);return i?i(null,e):Promise.resolve(e)}catch(u){return i?i(u):Promise.reject(u)}if("create"===n)try{const e=await utils.post("workflow",o,this.options);return i?i(null,e):Promise.resolve(e)}catch(u){return i?i(u):Promise.reject(u)}if(!r){const e=new Error("no workflow id specified");return i?i(e):Promise.reject(e)}const a={};try{const e=await this.read("workflow",r);if(e.error)throw new Error(e.error);lodash.merge(a,e)}catch(u){return this.log.error(`${r}: error fetching workflow ${String(u)}`),i?i(u):Promise.reject(u)}lodash.merge(a,{params:{}});try{const e=await utils.get(`workflow/config/${r}`,this.options);if(e.error)throw new Error(e.error);lodash.merge(a,e)}catch(u){return this.log.error(`${r}: error fetching workflow config ${String(u)}`),i?i(u):Promise.reject(u)}const l=lodash.filter(a.params,{widget:"ajax_dropdown"}),c=[...l.map((e,t)=>{const s=l[t];return new Promise(async(e,t)=>{const r=s.values.source.replace("{{EPI2ME_HOST}}","").replace(/&?apikey=\{\{EPI2ME_API_KEY\}\}/,"");try{const o=(await utils.get(r,this.options))[s.values.data_root];return o&&(s.values=o.map(e=>({label:e[s.values.items.label_key],value:e[s.values.items.value_key]}))),e()}catch(u){return this.log.error(`failed to fetch ${r}`),t(u)}})})];try{return await Promise.all(c),i?i(null,a):Promise.resolve(a)}catch(u){return this.log.error(`${r}: error fetching config and parameters ${String(u)}`),i?i(u):Promise.reject(u)}}async startWorkflow(e,t){return utils.post("workflow_instance",e,lodash.assign({},this.options,{legacy_form:!0}),t)}stopWorkflow(e,t){return utils.put("workflow_instance/stop",e,null,lodash.assign({},this.options,{legacy_form:!0}),t)}async workflowInstances(e,t){let s,r;if(!e||e instanceof Function||void 0!==t?(s=e,r=t):r=e,r&&r.run_id)try{const e=(await utils.get(`workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=${r.run_id};`,this.options)).data.map(e=>({id_workflow_instance:e.id_ins,id_workflow:e.id_flo,run_id:e.run_id,description:e.desc,rev:e.rev}));return s?s(null,e):Promise.resolve(e)}catch(o){return s?s(o):Promise.reject(o)}try{const e=await this.list("workflow_instance");return s?s(null,e):Promise.resolve(e)}catch(o){return s?s(o):Promise.reject(o)}}async workflowInstance(e,t){try{const r=await this.read("workflow_instance",e);return t?t(null,r):Promise.resolve(r)}catch(s){return t?t(s):Promise.reject(s)}}workflowConfig(e,t){return utils.get(`workflow/config/${e}`,this.options,t)}async register(e,t,s){let r,o;t&&t instanceof Function?o=t:(r=t,o=s);try{const t=await utils.put("reg",e,{description:r||`${os.userInfo().username}@${os.hostname()}`},lodash.assign({},this.options,{signing:!1}));return o?o(null,t):Promise.resolve(t)}catch(i){return o?o(i):Promise.reject(i)}}async datasets(e,t){let s,r;!e||e instanceof Function||void 0!==t?(s=e,r=t):r=e,r||(r={}),r.show||(r.show="mine");try{const e=await this.list(`dataset?show=${r.show}`);return s?s(null,e):Promise.resolve(e)}catch(o){return s?s(o):Promise.reject(o)}}async dataset(e,t){if(!this.options.local)try{const r=await this.read("dataset",e);return t?t(null,r):Promise.resolve(r)}catch(s){return t?t(s):Promise.reject(s)}try{const r=(await this.datasets()).find(t=>t.id_dataset===e);return t?t(null,r):Promise.resolve(r)}catch(s){return t?t(s):Promise.reject(s)}}async fetchContent(e,t){const s=lodash.assign({},this.options,{skip_url_mangle:!0,headers:{"Content-Type":""}});try{const o=await utils.get(e,s);return t?t(null,o):Promise.resolve(o)}catch(r){return t?t(r):Promise.reject(r)}}}class EPI2ME{constructor(e){let t;if((t="string"===typeof e||"object"===typeof e&&e.constructor===String?JSON.parse(e):e||{}).log){if(!lodash.every([t.log.info,t.log.warn,t.log.error,t.log.debug,t.log.json],lodash.isFunction))throw new Error("expected log object to have error, debug, info, warn and json methods");this.log=t.log}else this.log={info:e=>{console.info(`[${(new Date).toISOString()}] INFO: ${e}`)},debug:e=>{console.debug(`[${(new Date).toISOString()}] DEBUG: ${e}`)},warn:e=>{console.warn(`[${(new Date).toISOString()}] WARN: ${e}`)},error:e=>{console.error(`[${(new Date).toISOString()}] ERROR: ${e}`)},json:e=>{console.log(JSON.stringify(e))}};this.stopped=!0,this.states={upload:{filesCount:0,success:{files:0,bytes:0,reads:0},types:{},niceTypes:"",progress:{bytes:0,total:0}},download:{progress:{},success:{files:0,reads:0,bytes:0},fail:0,types:{},niceTypes:""},warnings:[]},this.config={options:lodash.defaults(t,DEFAULTS),instance:{id_workflow_instance:t.id_workflow_instance,inputQueueName:null,outputQueueName:null,outputQueueURL:null,discoverQueueCache:{},bucket:null,bucketFolder:null,remote_addr:null,chain:null,key_id:null}},this.config.instance.awssettings={region:this.config.options.region},this.REST=new REST(lodash.merge({},{log:this.log},this.config.options)),this.timers={downloadCheckInterval:null,stateCheckInterval:null,fileCheckInterval:null,transferTimeouts:{},visibilityIntervals:{},summaryTelemetryInterval:null}}async stopEverything(){this.stopped=!0,this.log.debug("stopping watchers"),["downloadCheckInterval","stateCheckInterval","fileCheckInterval","summaryTelemetryInterval"].forEach(e=>{this.timers[e]&&(this.log.debug(`clearing ${e} interval`),clearInterval(this.timers[e]),this.timers[e]=null)}),Object.keys(this.timers.transferTimeouts).forEach(e=>{this.log.debug(`clearing transferTimeout for ${e}`),clearTimeout(this.timers.transferTimeouts[e]),delete this.timers.transferTimeouts[e]}),Object.keys(this.timers.visibilityIntervals).forEach(e=>{this.log.debug(`clearing visibilityInterval for ${e}`),clearInterval(this.timers.visibilityIntervals[e]),delete this.timers.visibilityIntervals[e]}),this.downloadWorkerPool&&(this.log.debug("clearing downloadWorkerPool"),await Promise$1.all(Object.values(this.downloadWorkerPool)),this.downloadWorkerPool=null);const{id_workflow_instance:e}=this.config.instance;if(e){try{await this.REST.stopWorkflow(e)}catch(t){return this.log.error(`Error stopping instance: ${String(t)}`),Promise$1.reject(t)}this.log.info(`workflow instance ${e} stopped`)}return Promise$1.resolve()}async session(e,t){let s=!1;if(e&&e.length&&(s=!0),!s){if(this.sessioning)return Promise$1.resolve();if(this.states.sts_expiration&&this.states.sts_expiration>Date.now())return Promise$1.resolve();this.sessioning=!0}let r=null;try{await this.fetchInstanceToken(e,t)}catch(o){r=o,this.log.error(`session error ${String(r)}`)}finally{s||(this.sessioning=!1)}return r?Promise$1.reject(r):Promise$1.resolve()}async fetchInstanceToken(e,t){if(!this.config.instance.id_workflow_instance)return Promise$1.reject(new Error("must specify id_workflow_instance"));this.log.debug("new instance token needed");try{const r=await this.REST.instanceToken(this.config.instance.id_workflow_instance,t);this.log.debug(`allocated new instance token expiring at ${r.expiration}`),this.states.sts_expiration=new Date(r.expiration).getTime()-60*this.config.options.sessionGrace,this.config.options.proxy&&AWS.config.update({httpOptions:{agent:proxy(this.config.options.proxy,!0)}}),AWS.config.update(this.config.instance.awssettings),AWS.config.update(r),e&&e.forEach(e=>{try{e.config.update(r)}catch(t){this.log.warn(`failed to update config on ${String(e)}: ${String(t)}`)}})}catch(s){this.log.warn(`failed to fetch instance token: ${String(s)}`)}return Promise$1.resolve()}async sessionedS3(e){return await this.session(null,e),new AWS.S3({useAccelerateEndpoint:"on"===this.config.options.awsAcceleration})}async sessionedSQS(e){return await this.session(null,e),new AWS.SQS}reportProgress(){const{upload:e,download:t}=this.states;this.log.json({progress:{download:t,upload:e}})}storeState(e,t,s,r){const o=r||{};this.states[e]||(this.states[e]={}),this.states[e][t]||(this.states[e][t]={}),"incr"===s?Object.keys(o).forEach(s=>{this.states[e][t][s]=this.states[e][t][s]?this.states[e][t][s]+parseInt(o[s],10):parseInt(o[s],10)}):Object.keys(o).forEach(s=>{this.states[e][t][s]=this.states[e][t][s]?this.states[e][t][s]-parseInt(o[s],10):-parseInt(o[s],10)});try{this.states[e].success.niceReads=utils.niceSize(this.states[e].success.reads)}catch(n){this.states[e].success.niceReads=0}try{this.states[e].progress.niceSize=utils.niceSize(this.states[e].success.bytes+this.states[e].progress.bytes||0)}catch(n){this.states[e].progress.niceSize=0}try{this.states[e].success.niceSize=utils.niceSize(this.states[e].success.bytes)}catch(n){this.states[e].success.niceSize=0}this.states[e].niceTypes=Object.keys(this.states[e].types||{}).sort().map(t=>`${this.states[e].types[t]} ${t}`).join(", ");const i=Date.now();(!this.stateReportTime||i-this.stateReportTime>2e3)&&(this.stateReportTime=i,this.reportProgress())}uploadState(e,t,s){return this.storeState("upload",e,t,s)}downloadState(e,t,s){return this.storeState("download",e,t,s)}async deleteMessage(e){try{const s=await this.discoverQueue(this.config.instance.outputQueueName);return(await this.sessionedSQS()).deleteMessage({QueueUrl:s,ReceiptHandle:e.ReceiptHandle}).promise()}catch(t){return this.log.error(`deleteMessage exception: ${String(t)}`),this.states.download.failure||(this.states.download.failure={}),this.states.download.failure[t]=this.states.download.failure[t]?this.states.download.failure[t]+1:1,Promise$1.reject(t)}}async discoverQueue(e){if(this.config.instance.discoverQueueCache[e])return Promise$1.resolve(this.config.instance.discoverQueueCache[e]);let t;this.log.debug(`discovering queue for ${e}`);try{const r=await this.sessionedSQS();t=await r.getQueueUrl({QueueName:e}).promise()}catch(s){return this.log.error(`Error: failed to find queue for ${e}: ${String(s)}`),Promise$1.reject(s)}return this.log.debug(`found queue ${t.QueueUrl}`),this.config.instance.discoverQueueCache[e]=t.QueueUrl,Promise$1.resolve(t.QueueUrl)}async queueLength(e){if(!e)return Promise$1.reject(new Error("no queueURL specified"));const t=e.match(/([\w\-_]+)$/)[0];this.log.debug(`querying queue length of ${t}`);try{const t=await this.sessionedSQS(),r=await t.getQueueAttributes({QueueUrl:e,AttributeNames:["ApproximateNumberOfMessages"]}).promise();if(r&&r.Attributes&&"ApproximateNumberOfMessages"in r.Attributes){let e=r.Attributes.ApproximateNumberOfMessages;return e=parseInt(e,10)||0,Promise$1.resolve(e)}return Promise$1.reject(new Error("unexpected response"))}catch(s){return this.log.error(`error in getQueueAttributes ${String(s)}`),Promise$1.reject(s)}}url(){return this.config.options.url}apikey(){return this.config.options.apikey}attr(e,t){if(!(e in this.config.options))throw new Error(`config object does not contain property ${e}`);return t?(this.config.options[e]=t,this):this.config.options[e]}stats(e){return this.states[e]}}EPI2ME.version=utils.version,EPI2ME.REST=REST,EPI2ME.utils=utils,module.exports=EPI2ME;
=======
"use strict";function _interopDefault(e){return e&&"object"===typeof e&&"default"in e?e.default:e}var lodash=require("lodash"),AWS=_interopDefault(require("aws-sdk")),proxy=_interopDefault(require("proxy-agent")),Promise$1=_interopDefault(require("core-js/features/promise")),axios=_interopDefault(require("axios")),crypto=_interopDefault(require("crypto")),tunnel=require("tunnel"),os=_interopDefault(require("os")),version="2019.8.20-1602";axios.defaults.validateStatus=e=>e<=504;const UNITS=["","K","M","G","T","P","E","Z"],DIV=1e3,utils=function(){const e=(e,t)=>{e.headers||(e.headers={});let s=t;if(s||(s={}),!s.apikey)return;if(e.headers["X-EPI2ME-ApiKey"]=s.apikey,!s.apisecret)return;e.headers["X-EPI2ME-SignatureDate"]=(new Date).toISOString(),e.url.match(/^https:/)&&(e.url=e.url.replace(/:443/,"")),e.url.match(/^http:/)&&(e.url=e.url.replace(/:80/,""));const r=[e.url,Object.keys(e.headers).sort().filter(e=>e.match(/^x-epi2me/i)).map(t=>`${t}:${e.headers[t]}`).join("\n")].join("\n"),o=crypto.createHmac("sha1",s.apisecret).update(r).digest("hex");e.headers["X-EPI2ME-SignatureV0"]=o},t=async e=>{const t=e?e.data:null;if(!t)return Promise.reject(new Error("unexpected non-json response"));if(e&&e.status>=400){let s=`Network error ${e.status}`;return t.error&&(s=t.error),504===e.status&&(s="Please check your network connection and try again."),Promise.reject(new Error(s))}return t.error?Promise.reject(new Error(t.error)):Promise.resolve(t)};return{version:version,headers:(t,s)=>{const{log:r}=lodash.merge({log:{debug:()=>{}}},s);let o=s;if(o||(o={}),t.headers=lodash.merge({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-Client":o.user_agent||"api","X-EPI2ME-Version":o.agent_version||utils.version},t.headers,o.headers),"signing"in o&&!o.signing||e(t,o),o.proxy){const e=o.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/),s=e[2],i=e[3],n={host:e[4],port:e[5]};s&&i&&(n.proxyAuth=`${s}:${i}`),o.proxy.match(/^https/)?(r.debug("using HTTPS over HTTPS proxy",JSON.stringify(n)),t.httpsAgent=tunnel.httpsOverHttps({proxy:n})):(r.debug("using HTTPS over HTTP proxy",JSON.stringify(n)),t.httpsAgent=tunnel.httpsOverHttp({proxy:n})),t.proxy=!1}},get:async(e,s)=>{const{log:r}=lodash.merge({log:{debug:()=>{}}},s);let o,i=s.url,n=e;s.skip_url_mangle?o=n:(n=`/${n}`,o=(i=i.replace(/\/+$/,""))+(n=n.replace(/\/+/g,"/")));const a={url:o,gzip:!0};let l;utils.headers(a,s);try{r.debug(`GET ${a.url}`),l=await axios.get(a.url,a)}catch(c){return Promise.reject(c)}return t(l,s)},post:async(e,s,r)=>{const{log:o}=lodash.merge({log:{debug:()=>{}}},r);let i=r.url;const n={url:`${i=i.replace(/\/+$/,"")}/${e.replace(/\/+/g,"/")}`,gzip:!0,data:s,headers:{}};if(r.legacy_form){const e=[],t=lodash.merge({json:JSON.stringify(s)},s);Object.keys(t).sort().forEach(s=>{e.push(`${s}=${escape(t[s])}`)}),n.data=e.join("&"),n.headers["Content-Type"]="application/x-www-form-urlencoded"}utils.headers(n,r);const{data:a}=n;let l;delete n.data;try{o.debug(`POST ${n.url}`),l=await axios.post(n.url,a,n)}catch(c){return Promise.reject(c)}return t(l,r)},put:async(e,s,r,o)=>{const{log:i}=lodash.merge({log:{debug:()=>{}}},o);let n=o.url;const a={url:`${n=n.replace(/\/+$/,"")}/${e.replace(/\/+/g,"/")}/${s}`,gzip:!0,data:r,headers:{}};if(o.legacy_form){const e=[],t=lodash.merge({json:JSON.stringify(r)},r);Object.keys(t).sort().forEach(s=>{e.push(`${s}=${escape(t[s])}`)}),a.data=e.join("&"),a.headers["Content-Type"]="application/x-www-form-urlencoded"}utils.headers(a,o);const{data:l}=a;let c;delete a.data;try{i.debug(`PUT ${a.url}`),c=await axios.put(a.url,l,a)}catch(u){return Promise.reject(u)}return t(c,o)},niceSize(e,t){let s=t||0,r=e||0;return r>1e3?(r/=1e3,(s+=1)>=UNITS.length?"???":this.niceSize(r,s)):0===s?`${r}${UNITS[s]}`:`${r.toFixed(1)}${UNITS[s]}`}}}();var local=!1,url="https://epi2me.nanoporetech.com",user_agent="EPI2ME API",region="eu-west-1",sessionGrace=5,uploadTimeout=1200,downloadTimeout=1200,fileCheckInterval=5,downloadCheckInterval=3,stateCheckInterval=60,inFlightDelay=600,waitTimeSeconds=20,waitTokenError=30,transferPoolSize=3,downloadMode="data+telemetry",filetype=".fastq",signing=!0,DEFAULTS={local:local,url:url,user_agent:user_agent,region:region,sessionGrace:sessionGrace,uploadTimeout:uploadTimeout,downloadTimeout:downloadTimeout,fileCheckInterval:fileCheckInterval,downloadCheckInterval:downloadCheckInterval,stateCheckInterval:stateCheckInterval,inFlightDelay:inFlightDelay,waitTimeSeconds:waitTimeSeconds,waitTokenError:waitTokenError,transferPoolSize:transferPoolSize,downloadMode:downloadMode,filetype:filetype,signing:signing};class REST{constructor(e){this.options=lodash.assign({agent_version:utils.version,local:local,url:url,user_agent:user_agent,signing:signing},e),this.log=this.options.log}async list(e){try{const s=await utils.get(e,this.options),r=e.match(/^[a-z_]+/i)[0];return Promise.resolve(s[`${r}s`])}catch(t){return this.log.error(`list error ${String(t)}`),Promise.reject(t)}}async read(e,t){try{const r=await utils.get(`${e}/${t}`,this.options);return Promise.resolve(r)}catch(s){return this.log.error("read",s),Promise.reject(s)}}async user(e){let t;if(this.options.local)t={accounts:[{id_user_account:"none",number:"NONE",name:"None"}]};else try{t=await utils.get("user",this.options)}catch(s){return e?e(s):Promise.reject(s)}return e?e(null,t):Promise.resolve(t)}async status(){try{const t=await utils.get("status",this.options);return Promise.resolve(t)}catch(e){return Promise.reject(e)}}async instanceToken(e,t){try{const r=await utils.post("token",lodash.merge(t,{id_workflow_instance:e}),lodash.assign({},this.options,{legacy_form:!0}));return Promise.resolve(r)}catch(s){return Promise.reject(s)}}async installToken(e,t){try{const r=await utils.post("token/install",{id_workflow:e},lodash.assign({},this.options,{legacy_form:!0}));return t?t(null,r):Promise.resolve(r)}catch(s){return t?t(s):Promise.reject(s)}}async attributes(e){try{const s=await this.list("attribute");return e?e(null,s):Promise.resolve(s)}catch(t){return e?e(t):Promise.reject(t)}}async workflows(e){try{const s=await this.list("workflow");return e?e(null,s):Promise.resolve(s)}catch(t){return e?e(t):Promise.reject(t)}}async amiImages(e){if(this.options.local){const t=new Error("amiImages unsupported in local mode");return e?e(t):Promise.reject(t)}try{const s=this.list("ami_image");return e?e(null,s):Promise.resolve(s)}catch(t){return e?e(t):Promise.reject(t)}}async amiImage(e,t,s){let r,o,i,n;if(e&&t&&s instanceof Function?(r=e,o=t,i=s,n="update"):e&&t instanceof Object&&!(t instanceof Function)?(r=e,o=t,n="update"):e instanceof Object&&t instanceof Function?(o=e,i=t,n="create"):e instanceof Object&&!t?(o=e,n="create"):(n="read",r=e,i=t instanceof Function?t:null),this.options.local){const e=new Error("ami_image unsupported in local mode");return i?i(e):Promise.reject(e)}if("update"===n)try{const e=await utils.put("ami_image",r,o,this.options);return i?i(null,e):Promise.resolve(e)}catch(a){return i?i(a):Promise.reject(a)}if("create"===n)try{const e=await utils.post("ami_image",o,this.options);return i?i(null,e):Promise.resolve(e)}catch(a){return i?i(a):Promise.reject(a)}if(!r){const e=new Error("no id_ami_image specified");return i?i(e):Promise.reject(e)}try{const e=await this.read("ami_image",r);return i?i(null,e):Promise.resolve(e)}catch(a){return i?i(a):Promise.reject(a)}}async workflow(e,t,s){let r,o,i,n;if(e&&t&&s instanceof Function?(r=e,o=t,i=s,n="update"):e&&t instanceof Object&&!(t instanceof Function)?(r=e,o=t,n="update"):e instanceof Object&&t instanceof Function?(o=e,i=t,n="create"):e instanceof Object&&!t?(o=e,n="create"):(n="read",r=e,i=t instanceof Function?t:null),"update"===n)try{const e=await utils.put("workflow",r,o,this.options);return i?i(null,e):Promise.resolve(e)}catch(u){return i?i(u):Promise.reject(u)}if("create"===n)try{const e=await utils.post("workflow",o,this.options);return i?i(null,e):Promise.resolve(e)}catch(u){return i?i(u):Promise.reject(u)}if(!r){const e=new Error("no workflow id specified");return i?i(e):Promise.reject(e)}const a={};try{const e=await this.read("workflow",r);if(e.error)throw new Error(e.error);lodash.merge(a,e)}catch(u){return this.log.error(`${r}: error fetching workflow ${String(u)}`),i?i(u):Promise.reject(u)}lodash.merge(a,{params:{}});try{const e=await utils.get(`workflow/config/${r}`,this.options);if(e.error)throw new Error(e.error);lodash.merge(a,e)}catch(u){return this.log.error(`${r}: error fetching workflow config ${String(u)}`),i?i(u):Promise.reject(u)}const l=lodash.filter(a.params,{widget:"ajax_dropdown"}),c=[...l.map((e,t)=>{const s=l[t];return new Promise(async(e,t)=>{const r=s.values.source.replace("{{EPI2ME_HOST}}","").replace(/&?apikey=\{\{EPI2ME_API_KEY\}\}/,"");try{const o=(await utils.get(r,this.options))[s.values.data_root];return o&&(s.values=o.map(e=>({label:e[s.values.items.label_key],value:e[s.values.items.value_key]}))),e()}catch(u){return this.log.error(`failed to fetch ${r}`),t(u)}})})];try{return await Promise.all(c),i?i(null,a):Promise.resolve(a)}catch(u){return this.log.error(`${r}: error fetching config and parameters ${String(u)}`),i?i(u):Promise.reject(u)}}async startWorkflow(e,t){return utils.post("workflow_instance",e,lodash.assign({},this.options,{legacy_form:!0}),t)}stopWorkflow(e,t){return utils.put("workflow_instance/stop",e,null,lodash.assign({},this.options,{legacy_form:!0}),t)}async workflowInstances(e,t){let s,r;if(!e||e instanceof Function||void 0!==t?(s=e,r=t):r=e,r&&r.run_id)try{const e=(await utils.get(`workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=${r.run_id};`,this.options)).data.map(e=>({id_workflow_instance:e.id_ins,id_workflow:e.id_flo,run_id:e.run_id,description:e.desc,rev:e.rev}));return s?s(null,e):Promise.resolve(e)}catch(o){return s?s(o):Promise.reject(o)}try{const e=await this.list("workflow_instance");return s?s(null,e):Promise.resolve(e)}catch(o){return s?s(o):Promise.reject(o)}}async workflowInstance(e,t){try{const r=await this.read("workflow_instance",e);return t?t(null,r):Promise.resolve(r)}catch(s){return t?t(s):Promise.reject(s)}}workflowConfig(e,t){return utils.get(`workflow/config/${e}`,this.options,t)}async register(e,t,s){let r,o;t&&t instanceof Function?o=t:(r=t,o=s);try{const t=await utils.put("reg",e,{description:r||`${os.userInfo().username}@${os.hostname()}`},lodash.assign({},this.options,{signing:!1}));return o?o(null,t):Promise.resolve(t)}catch(i){return o?o(i):Promise.reject(i)}}async datasets(e,t){let s,r;!e||e instanceof Function||void 0!==t?(s=e,r=t):r=e,r||(r={}),r.show||(r.show="mine");try{const e=await this.list(`dataset?show=${r.show}`);return s?s(null,e):Promise.resolve(e)}catch(o){return s?s(o):Promise.reject(o)}}async dataset(e,t){if(!this.options.local)try{const r=await this.read("dataset",e);return t?t(null,r):Promise.resolve(r)}catch(s){return t?t(s):Promise.reject(s)}try{const r=(await this.datasets()).find(t=>t.id_dataset===e);return t?t(null,r):Promise.resolve(r)}catch(s){return t?t(s):Promise.reject(s)}}async fetchContent(e,t){const s=lodash.assign({},this.options,{skip_url_mangle:!0,headers:{"Content-Type":""}});try{const o=await utils.get(e,s);return t?t(null,o):Promise.resolve(o)}catch(r){return t?t(r):Promise.reject(r)}}}class EPI2ME{constructor(e){let t;if((t="string"===typeof e||"object"===typeof e&&e.constructor===String?JSON.parse(e):e||{}).log){if(!lodash.every([t.log.info,t.log.warn,t.log.error,t.log.debug],lodash.isFunction))throw new Error('expected log object to have "error", "debug", "info" and "warn" methods');this.log=t.log}else this.log={info:e=>{console.info(`[${(new Date).toISOString()}] INFO: ${e}`)},debug:e=>{console.debug(`[${(new Date).toISOString()}] DEBUG: ${e}`)},warn:e=>{console.warn(`[${(new Date).toISOString()}] WARN: ${e}`)},error:e=>{console.error(`[${(new Date).toISOString()}] ERROR: ${e}`)}};this.stopped=!0,this.states={upload:{filesCount:0,success:{files:0,bytes:0,reads:0},types:{},niceTypes:"",progress:{bytes:0,total:0}},download:{progress:{},success:{files:0,reads:0,bytes:0},fail:0,types:{},niceTypes:""},warnings:[]},this.config={options:lodash.defaults(t,DEFAULTS),instance:{id_workflow_instance:t.id_workflow_instance,inputQueueName:null,outputQueueName:null,outputQueueURL:null,discoverQueueCache:{},bucket:null,bucketFolder:null,remote_addr:null,chain:null,key_id:null}},this.config.instance.awssettings={region:this.config.options.region},this.REST=new REST(lodash.merge({},{log:this.log},this.config.options)),this.timers={downloadCheckInterval:null,stateCheckInterval:null,fileCheckInterval:null,transferTimeouts:{},visibilityIntervals:{},summaryTelemetryInterval:null}}async stopEverything(){this.stopped=!0,this.log.debug("stopping watchers"),["downloadCheckInterval","stateCheckInterval","fileCheckInterval","summaryTelemetryInterval"].forEach(e=>{this.timers[e]&&(this.log.debug(`clearing ${e} interval`),clearInterval(this.timers[e]),this.timers[e]=null)}),Object.keys(this.timers.transferTimeouts).forEach(e=>{this.log.debug(`clearing transferTimeout for ${e}`),clearTimeout(this.timers.transferTimeouts[e]),delete this.timers.transferTimeouts[e]}),Object.keys(this.timers.visibilityIntervals).forEach(e=>{this.log.debug(`clearing visibilityInterval for ${e}`),clearInterval(this.timers.visibilityIntervals[e]),delete this.timers.visibilityIntervals[e]}),this.downloadWorkerPool&&(this.log.debug("clearing downloadWorkerPool"),await Promise$1.all(Object.values(this.downloadWorkerPool)),this.downloadWorkerPool=null);const{id_workflow_instance:e}=this.config.instance;if(e){try{await this.REST.stopWorkflow(e)}catch(t){return this.log.error(`Error stopping instance: ${String(t)}`),Promise$1.reject(t)}this.log.info(`workflow instance ${e} stopped`)}return Promise$1.resolve()}async session(e,t){let s=!1;if(e&&e.length&&(s=!0),!s){if(this.sessioning)return Promise$1.resolve();if(this.states.sts_expiration&&this.states.sts_expiration>Date.now())return Promise$1.resolve();this.sessioning=!0}let r=null;try{await this.fetchInstanceToken(e,t)}catch(o){r=o,this.log.error(`session error ${String(r)}`)}finally{s||(this.sessioning=!1)}return r?Promise$1.reject(r):Promise$1.resolve()}async fetchInstanceToken(e,t){if(!this.config.instance.id_workflow_instance)return Promise$1.reject(new Error("must specify id_workflow_instance"));this.log.debug("new instance token needed");try{const r=await this.REST.instanceToken(this.config.instance.id_workflow_instance,t);this.log.debug(`allocated new instance token expiring at ${r.expiration}`),this.states.sts_expiration=new Date(r.expiration).getTime()-60*this.config.options.sessionGrace,this.config.options.proxy&&AWS.config.update({httpOptions:{agent:proxy(this.config.options.proxy,!0)}}),AWS.config.update(this.config.instance.awssettings),AWS.config.update(r),e&&e.forEach(e=>{try{e.config.update(r)}catch(t){this.log.warn(`failed to update config on ${String(e)}: ${String(t)}`)}})}catch(s){this.log.warn(`failed to fetch instance token: ${String(s)}`)}return Promise$1.resolve()}async sessionedS3(e){return await this.session(null,e),new AWS.S3({useAccelerateEndpoint:"on"===this.config.options.awsAcceleration})}async sessionedSQS(e){return await this.session(null,e),new AWS.SQS}reportProgress(){const{upload:e,download:t}=this.states;this.log.info(`Progress: ${JSON.stringify({progress:{download:t,upload:e}})}`)}storeState(e,t,s,r){const o=r||{};this.states[e]||(this.states[e]={}),this.states[e][t]||(this.states[e][t]={}),"incr"===s?Object.keys(o).forEach(s=>{this.states[e][t][s]=this.states[e][t][s]?this.states[e][t][s]+parseInt(o[s],10):parseInt(o[s],10)}):Object.keys(o).forEach(s=>{this.states[e][t][s]=this.states[e][t][s]?this.states[e][t][s]-parseInt(o[s],10):-parseInt(o[s],10)});try{this.states[e].success.niceReads=utils.niceSize(this.states[e].success.reads)}catch(n){this.states[e].success.niceReads=0}try{this.states[e].progress.niceSize=utils.niceSize(this.states[e].success.bytes+this.states[e].progress.bytes||0)}catch(n){this.states[e].progress.niceSize=0}try{this.states[e].success.niceSize=utils.niceSize(this.states[e].success.bytes)}catch(n){this.states[e].success.niceSize=0}this.states[e].niceTypes=Object.keys(this.states[e].types||{}).sort().map(t=>`${this.states[e].types[t]} ${t}`).join(", ");const i=Date.now();(!this.stateReportTime||i-this.stateReportTime>2e3)&&(this.stateReportTime=i,this.reportProgress())}uploadState(e,t,s){return this.storeState("upload",e,t,s)}downloadState(e,t,s){return this.storeState("download",e,t,s)}async deleteMessage(e){try{const s=await this.discoverQueue(this.config.instance.outputQueueName);return(await this.sessionedSQS()).deleteMessage({QueueUrl:s,ReceiptHandle:e.ReceiptHandle}).promise()}catch(t){return this.log.error(`deleteMessage exception: ${String(t)}`),this.states.download.failure||(this.states.download.failure={}),this.states.download.failure[t]=this.states.download.failure[t]?this.states.download.failure[t]+1:1,Promise$1.reject(t)}}async discoverQueue(e){if(this.config.instance.discoverQueueCache[e])return Promise$1.resolve(this.config.instance.discoverQueueCache[e]);let t;this.log.debug(`discovering queue for ${e}`);try{const r=await this.sessionedSQS();t=await r.getQueueUrl({QueueName:e}).promise()}catch(s){return this.log.error(`Error: failed to find queue for ${e}: ${String(s)}`),Promise$1.reject(s)}return this.log.debug(`found queue ${t.QueueUrl}`),this.config.instance.discoverQueueCache[e]=t.QueueUrl,Promise$1.resolve(t.QueueUrl)}async queueLength(e){if(!e)return Promise$1.reject(new Error("no queueURL specified"));const t=e.match(/([\w\-_]+)$/)[0];this.log.debug(`querying queue length of ${t}`);try{const t=await this.sessionedSQS(),r=await t.getQueueAttributes({QueueUrl:e,AttributeNames:["ApproximateNumberOfMessages"]}).promise();if(r&&r.Attributes&&"ApproximateNumberOfMessages"in r.Attributes){let e=r.Attributes.ApproximateNumberOfMessages;return e=parseInt(e,10)||0,Promise$1.resolve(e)}return Promise$1.reject(new Error("unexpected response"))}catch(s){return this.log.error(`error in getQueueAttributes ${String(s)}`),Promise$1.reject(s)}}url(){return this.config.options.url}apikey(){return this.config.options.apikey}attr(e,t){if(!(e in this.config.options))throw new Error(`config object does not contain property ${e}`);return t?(this.config.options[e]=t,this):this.config.options[e]}stats(e){return this.states[e]}}EPI2ME.version=utils.version,EPI2ME.REST=REST,EPI2ME.utils=utils,module.exports=EPI2ME;
>>>>>>> 257b323... tidy ups
