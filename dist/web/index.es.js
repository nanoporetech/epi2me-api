/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2019
 */

import{merge as e,assign as t,filter as r,every as s,isFunction as o,defaults as i}from"lodash";import n from"aws-sdk";import a from"proxy-agent";import c from"core-js/features/promise";import l from"axios";import u from"crypto";import{httpsOverHttps as h,httpsOverHttp as g}from"tunnel";import p from"os";l.defaults.validateStatus=e=>e<=504;const d=["","K","M","G","T","P","E","Z"],f=function(){const t=(e,t)=>{e.headers||(e.headers={});let r=t;if(r||(r={}),!r.apikey)return;if(e.headers["X-EPI2ME-ApiKey"]=r.apikey,!r.apisecret)return;e.headers["X-EPI2ME-SignatureDate"]=(new Date).toISOString(),e.url.match(/^https:/)&&(e.url=e.url.replace(/:443/,"")),e.url.match(/^http:/)&&(e.url=e.url.replace(/:80/,""));const s=[e.url,Object.keys(e.headers).sort().filter(e=>e.match(/^x-epi2me/i)).map(t=>`${t}:${e.headers[t]}`).join("\n")].join("\n"),o=u.createHmac("sha1",r.apisecret).update(s).digest("hex");e.headers["X-EPI2ME-SignatureV0"]=o},r=async e=>{const t=e?e.data:null;if(!t)return Promise.reject(new Error("unexpected non-json response"));if(e&&e.status>=400){let r=`Network error ${e.status}`;return t.error&&(r=t.error),504===e.status&&(r="Please check your network connection and try again."),Promise.reject(new Error(r))}return t.error?Promise.reject(new Error(t.error)):Promise.resolve(t)};return{version:"2019.8.14-1732",headers:(r,s)=>{const{log:o}=e({log:{debug:()=>{}}},s);let i=s;if(i||(i={}),r.headers=e({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-Client":i.user_agent||"api","X-EPI2ME-Version":i.agent_version||f.version},r.headers,i.headers),"signing"in i&&!i.signing||t(r,i),i.proxy){const e=i.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/),t=e[2],s=e[3],n={host:e[4],port:e[5]};t&&s&&(n.proxyAuth=`${t}:${s}`),i.proxy.match(/^https/)?(o.debug("using HTTPS over HTTPS proxy",JSON.stringify(n)),r.httpsAgent=h({proxy:n})):(o.debug("using HTTPS over HTTP proxy",JSON.stringify(n)),r.httpsAgent=g({proxy:n})),r.proxy=!1}},get:async(t,s)=>{const{log:o}=e({log:{debug:()=>{}}},s);let i,n=s.url,a=t;s.skip_url_mangle?i=a:(a=`/${a}`,i=(n=n.replace(/\/+$/,""))+(a=a.replace(/\/+/g,"/")));const c={url:i,gzip:!0};let u;f.headers(c,s);try{o.debug(`GET ${c.url}`),u=await l.get(c.url,c)}catch(h){return Promise.reject(h)}return r(u,s)},post:async(t,s,o)=>{const{log:i}=e({log:{debug:()=>{}}},o);let n=o.url;const a={url:`${n=n.replace(/\/+$/,"")}/${t.replace(/\/+/g,"/")}`,gzip:!0,data:s,headers:{}};if(o.legacy_form){const t=[],r=e({json:JSON.stringify(s)},s);Object.keys(r).sort().forEach(e=>{t.push(`${e}=${escape(r[e])}`)}),a.data=t.join("&"),a.headers["Content-Type"]="application/x-www-form-urlencoded"}f.headers(a,o);const{data:c}=a;let u;delete a.data;try{i.debug(`POST ${a.url}`),u=await l.post(a.url,c,a)}catch(h){return Promise.reject(h)}return r(u,o)},put:async(t,s,o,i)=>{const{log:n}=e({log:{debug:()=>{}}},i);let a=i.url;const c={url:`${a=a.replace(/\/+$/,"")}/${t.replace(/\/+/g,"/")}/${s}`,gzip:!0,data:o,headers:{}};if(i.legacy_form){const t=[],r=e({json:JSON.stringify(o)},o);Object.keys(r).sort().forEach(e=>{t.push(`${e}=${escape(r[e])}`)}),c.data=t.join("&"),c.headers["Content-Type"]="application/x-www-form-urlencoded"}f.headers(c,i);const{data:u}=c;let h;delete c.data;try{n.debug(`PUT ${c.url}`),h=await l.put(c.url,u,c)}catch(g){return Promise.reject(g)}return r(h,i)},niceSize(e,t){let r=t||0,s=e||0;return s>1e3?(s/=1e3,(r+=1)>=d.length?"???":this.niceSize(s,r)):0===r?`${s}${d[r]}`:`${s.toFixed(1)}${d[r]}`}}}();var m=!1,w="https://epi2me.nanoporetech.com",y="EPI2ME API",v=!0,P={local:m,url:w,user_agent:y,region:"eu-west-1",sessionGrace:5,uploadTimeout:1200,downloadTimeout:1200,fileCheckInterval:5,downloadCheckInterval:3,stateCheckInterval:60,inFlightDelay:600,waitTimeSeconds:20,waitTokenError:30,transferPoolSize:3,downloadMode:"data+telemetry",filetype:".fastq",signing:v};class k{constructor(e){this.options=t({agent_version:f.version,local:m,url:w,user_agent:y,signing:v},e),this.log=this.options.log}async list(e){try{const r=await f.get(e,this.options),s=e.match(/^[a-z_]+/i)[0];return Promise.resolve(r[`${s}s`])}catch(t){return this.log.error(`list error ${String(t)}`),Promise.reject(t)}}async read(e,t){try{const s=await f.get(`${e}/${t}`,this.options);return Promise.resolve(s)}catch(r){return this.log.error("read",r),Promise.reject(r)}}async user(e){let t;if(this.options.local)t={accounts:[{id_user_account:"none",number:"NONE",name:"None"}]};else try{t=await f.get("user",this.options)}catch(r){return e?e(r):Promise.reject(r)}return e?e(null,t):Promise.resolve(t)}async status(){try{const t=await f.get("status",this.options);return Promise.resolve(t)}catch(e){return Promise.reject(e)}}async instanceToken(r,s){try{const i=await f.post("token",e(s,{id_workflow_instance:r}),t({},this.options,{legacy_form:!0}));return Promise.resolve(i)}catch(o){return Promise.reject(o)}}async installToken(e,r){try{const o=await f.post("token/install",{id_workflow:e},t({},this.options,{legacy_form:!0}));return r?r(null,o):Promise.resolve(o)}catch(s){return r?r(s):Promise.reject(s)}}async attributes(e){try{const r=await this.list("attribute");return e?e(null,r):Promise.resolve(r)}catch(t){return e?e(t):Promise.reject(t)}}async workflows(e){try{const r=await this.list("workflow");return e?e(null,r):Promise.resolve(r)}catch(t){return e?e(t):Promise.reject(t)}}async amiImages(e){if(this.options.local){const t=new Error("amiImages unsupported in local mode");return e?e(t):Promise.reject(t)}try{const r=this.list("ami_image");return e?e(null,r):Promise.resolve(r)}catch(t){return e?e(t):Promise.reject(t)}}async amiImage(e,t,r){let s,o,i,n;if(e&&t&&r instanceof Function?(s=e,o=t,i=r,n="update"):e&&t instanceof Object&&!(t instanceof Function)?(s=e,o=t,n="update"):e instanceof Object&&t instanceof Function?(o=e,i=t,n="create"):e instanceof Object&&!t?(o=e,n="create"):(n="read",s=e,i=t instanceof Function?t:null),this.options.local){const e=new Error("ami_image unsupported in local mode");return i?i(e):Promise.reject(e)}if("update"===n)try{const e=await f.put("ami_image",s,o,this.options);return i?i(null,e):Promise.resolve(e)}catch(a){return i?i(a):Promise.reject(a)}if("create"===n)try{const e=await f.post("ami_image",o,this.options);return i?i(null,e):Promise.resolve(e)}catch(a){return i?i(a):Promise.reject(a)}if(!s){const e=new Error("no id_ami_image specified");return i?i(e):Promise.reject(e)}try{const e=await this.read("ami_image",s);return i?i(null,e):Promise.resolve(e)}catch(a){return i?i(a):Promise.reject(a)}}async workflow(t,s,o){let i,n,a,c;if(t&&s&&o instanceof Function?(i=t,n=s,a=o,c="update"):t&&s instanceof Object&&!(s instanceof Function)?(i=t,n=s,c="update"):t instanceof Object&&s instanceof Function?(n=t,a=s,c="create"):t instanceof Object&&!s?(n=t,c="create"):(c="read",i=t,a=s instanceof Function?s:null),"update"===c)try{const e=await f.put("workflow",i,n,this.options);return a?a(null,e):Promise.resolve(e)}catch(g){return a?a(g):Promise.reject(g)}if("create"===c)try{const e=await f.post("workflow",n,this.options);return a?a(null,e):Promise.resolve(e)}catch(g){return a?a(g):Promise.reject(g)}if(!i){const e=new Error("no workflow id specified");return a?a(e):Promise.reject(e)}const l={};try{const t=await this.read("workflow",i);if(t.error)throw new Error(t.error);e(l,t)}catch(g){return this.log.error(`${i}: error fetching workflow ${String(g)}`),a?a(g):Promise.reject(g)}e(l,{params:{}});try{const t=await f.get(`workflow/config/${i}`,this.options);if(t.error)throw new Error(t.error);e(l,t)}catch(g){return this.log.error(`${i}: error fetching workflow config ${String(g)}`),a?a(g):Promise.reject(g)}const u=r(l.params,{widget:"ajax_dropdown"}),h=[...u.map((e,t)=>{const r=u[t];return new Promise(async(e,t)=>{const s=r.values.source.replace("{{EPI2ME_HOST}}","").replace(/&?apikey=\{\{EPI2ME_API_KEY\}\}/,"");try{const o=(await f.get(s,this.options))[r.values.data_root];return o&&(r.values=o.map(e=>({label:e[r.values.items.label_key],value:e[r.values.items.value_key]}))),e()}catch(g){return this.log.error(`failed to fetch ${s}`),t(g)}})})];try{return await Promise.all(h),a?a(null,l):Promise.resolve(l)}catch(g){return this.log.error(`${i}: error fetching config and parameters ${String(g)}`),a?a(g):Promise.reject(g)}}async startWorkflow(e,r){return f.post("workflow_instance",e,t({},this.options,{legacy_form:!0}),r)}stopWorkflow(e,r){return f.put("workflow_instance/stop",e,null,t({},this.options,{legacy_form:!0}),r)}async workflowInstances(e,t){let r,s;if(!e||e instanceof Function||void 0!==t?(r=e,s=t):s=e,s&&s.run_id)try{const e=(await f.get(`workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=${s.run_id};`,this.options)).data.map(e=>({id_workflow_instance:e.id_ins,id_workflow:e.id_flo,run_id:e.run_id,description:e.desc,rev:e.rev}));return r?r(null,e):Promise.resolve(e)}catch(o){return r?r(o):Promise.reject(o)}try{const e=await this.list("workflow_instance");return r?r(null,e):Promise.resolve(e)}catch(o){return r?r(o):Promise.reject(o)}}async workflowInstance(e,t){try{const s=await this.read("workflow_instance",e);return t?t(null,s):Promise.resolve(s)}catch(r){return t?t(r):Promise.reject(r)}}workflowConfig(e,t){return f.get(`workflow/config/${e}`,this.options,t)}async register(e,r,s){let o,i;r&&r instanceof Function?i=r:(o=r,i=s);try{const r=await f.put("reg",e,{description:o||`${p.userInfo().username}@${p.hostname()}`},t({},this.options,{signing:!1}));return i?i(null,r):Promise.resolve(r)}catch(n){return i?i(n):Promise.reject(n)}}async datasets(e,t){let r,s;!e||e instanceof Function||void 0!==t?(r=e,s=t):s=e,s||(s={}),s.show||(s.show="mine");try{const e=await this.list(`dataset?show=${s.show}`);return r?r(null,e):Promise.resolve(e)}catch(o){return r?r(o):Promise.reject(o)}}async dataset(e,t){if(!this.options.local)try{const s=await this.read("dataset",e);return t?t(null,s):Promise.resolve(s)}catch(r){return t?t(r):Promise.reject(r)}try{const s=(await this.datasets()).find(t=>t.id_dataset===e);return t?t(null,s):Promise.resolve(s)}catch(r){return t?t(r):Promise.reject(r)}}async fetchContent(e,r){const s=t({},this.options,{skip_url_mangle:!0,headers:{"Content-Type":""}});try{const t=await f.get(e,s);return r?r(null,t):Promise.resolve(t)}catch(o){return r?r(o):Promise.reject(o)}}}class j{constructor(t){let r;if((r="string"===typeof t||"object"===typeof t&&t.constructor===String?JSON.parse(t):t||{}).log){if(!s([r.log.info,r.log.warn,r.log.error,r.log.debug,r.log.json],o))throw new Error("expected log object to have error, debug, info, warn and json methods");this.log=r.log}else this.log={info:e=>{console.info(`[${(new Date).toISOString()}] INFO: ${e}`)},debug:e=>{console.debug(`[${(new Date).toISOString()}] DEBUG: ${e}`)},warn:e=>{console.warn(`[${(new Date).toISOString()}] WARN: ${e}`)},error:e=>{console.error(`[${(new Date).toISOString()}] ERROR: ${e}`)},json:e=>{console.log(JSON.stringify(e))}};this.stopped=!0,this.states={upload:{filesCount:0,success:{files:0,bytes:0,reads:0},types:{},niceTypes:"",progress:{bytes:0,total:0}},download:{progress:{},success:{files:0,reads:0,bytes:0},fail:0,types:{},niceTypes:""},warnings:[]},this.config={options:i(r,P),instance:{id_workflow_instance:r.id_workflow_instance,inputQueueName:null,outputQueueName:null,outputQueueURL:null,discoverQueueCache:{},bucket:null,bucketFolder:null,remote_addr:null,chain:null,key_id:null}},this.config.instance.awssettings={region:this.config.options.region},this.REST=new k(e({},{log:this.log},this.config.options)),this.timers={downloadCheckInterval:null,stateCheckInterval:null,fileCheckInterval:null,transferTimeouts:{},visibilityIntervals:{},summaryTelemetryInterval:null}}async stopEverything(){this.stopped=!0,this.log.debug("stopping watchers"),["downloadCheckInterval","stateCheckInterval","fileCheckInterval","summaryTelemetryInterval"].forEach(e=>{this.timers[e]&&(this.log.debug(`clearing ${e} interval`),clearInterval(this.timers[e]),this.timers[e]=null)}),Object.keys(this.timers.transferTimeouts).forEach(e=>{this.log.debug(`clearing transferTimeout for ${e}`),clearTimeout(this.timers.transferTimeouts[e]),delete this.timers.transferTimeouts[e]}),Object.keys(this.timers.visibilityIntervals).forEach(e=>{this.log.debug(`clearing visibilityInterval for ${e}`),clearInterval(this.timers.visibilityIntervals[e]),delete this.timers.visibilityIntervals[e]}),this.downloadWorkerPool&&(this.log.debug("clearing downloadWorkerPool"),await c.all(Object.values(this.downloadWorkerPool)),this.downloadWorkerPool=null);const{id_workflow_instance:e}=this.config.instance;if(e){try{await this.REST.stopWorkflow(e)}catch(t){return this.log.error(`Error stopping instance: ${String(t)}`),c.reject(t)}this.log.info(`workflow instance ${e} stopped`)}return c.resolve()}async session(e,t){let r=!1;if(e&&e.length&&(r=!0),!r){if(this.sessioning)return c.resolve();if(this.states.sts_expiration&&this.states.sts_expiration>Date.now())return c.resolve();this.sessioning=!0}let s=null;try{await this.fetchInstanceToken(e,t)}catch(o){s=o,this.log.error(`session error ${String(s)}`)}finally{r||(this.sessioning=!1)}return s?c.reject(s):c.resolve()}async fetchInstanceToken(e,t){if(!this.config.instance.id_workflow_instance)return c.reject(new Error("must specify id_workflow_instance"));this.log.debug("new instance token needed");try{const s=await this.REST.instanceToken(this.config.instance.id_workflow_instance,t);this.log.debug(`allocated new instance token expiring at ${s.expiration}`),this.states.sts_expiration=new Date(s.expiration).getTime()-60*this.config.options.sessionGrace,this.config.options.proxy&&n.config.update({httpOptions:{agent:a(this.config.options.proxy,!0)}}),n.config.update(this.config.instance.awssettings),n.config.update(s),e&&e.forEach(e=>{try{e.config.update(s)}catch(t){this.log.warn(`failed to update config on ${String(e)}: ${String(t)}`)}})}catch(r){this.log.warn(`failed to fetch instance token: ${String(r)}`)}return c.resolve()}async sessionedS3(e){return await this.session(null,e),new n.S3({useAccelerateEndpoint:"on"===this.config.options.awsAcceleration})}async sessionedSQS(e){return await this.session(null,e),new n.SQS}reportProgress(){const{upload:e,download:t}=this.states;this.log.json({progress:{download:t,upload:e}})}storeState(e,t,r,s){const o=s||{};this.states[e]||(this.states[e]={}),this.states[e][t]||(this.states[e][t]={}),"incr"===r?Object.keys(o).forEach(r=>{this.states[e][t][r]=this.states[e][t][r]?this.states[e][t][r]+parseInt(o[r],10):parseInt(o[r],10)}):Object.keys(o).forEach(r=>{this.states[e][t][r]=this.states[e][t][r]?this.states[e][t][r]-parseInt(o[r],10):-parseInt(o[r],10)});try{this.states[e].success.niceReads=f.niceSize(this.states[e].success.reads)}catch(n){this.states[e].success.niceReads=0}try{this.states[e].progress.niceSize=f.niceSize(this.states[e].success.bytes+this.states[e].progress.bytes||0)}catch(n){this.states[e].progress.niceSize=0}try{this.states[e].success.niceSize=f.niceSize(this.states[e].success.bytes)}catch(n){this.states[e].success.niceSize=0}this.states[e].niceTypes=Object.keys(this.states[e].types||{}).sort().map(t=>`${this.states[e].types[t]} ${t}`).join(", ");const i=Date.now();(!this.stateReportTime||i-this.stateReportTime>2e3)&&(this.stateReportTime=i,this.reportProgress())}uploadState(e,t,r){return this.storeState("upload",e,t,r)}downloadState(e,t,r){return this.storeState("download",e,t,r)}async deleteMessage(e){try{const r=await this.discoverQueue(this.config.instance.outputQueueName);return(await this.sessionedSQS()).deleteMessage({QueueUrl:r,ReceiptHandle:e.ReceiptHandle}).promise()}catch(t){return this.log.error(`deleteMessage exception: ${String(t)}`),this.states.download.failure||(this.states.download.failure={}),this.states.download.failure[t]=this.states.download.failure[t]?this.states.download.failure[t]+1:1,c.reject(t)}}async discoverQueue(e){if(this.config.instance.discoverQueueCache[e])return c.resolve(this.config.instance.discoverQueueCache[e]);let t;this.log.debug(`discovering queue for ${e}`);try{const s=await this.sessionedSQS();t=await s.getQueueUrl({QueueName:e}).promise()}catch(r){return this.log.error(`Error: failed to find queue for ${e}: ${String(r)}`),c.reject(r)}return this.log.debug(`found queue ${t.QueueUrl}`),this.config.instance.discoverQueueCache[e]=t.QueueUrl,c.resolve(t.QueueUrl)}async queueLength(e){if(!e)return c.reject(new Error("no queueURL specified"));const t=e.match(/([\w\-_]+)$/)[0];this.log.debug(`querying queue length of ${t}`);try{const t=await this.sessionedSQS(),s=await t.getQueueAttributes({QueueUrl:e,AttributeNames:["ApproximateNumberOfMessages"]}).promise();if(s&&s.Attributes&&"ApproximateNumberOfMessages"in s.Attributes){let e=s.Attributes.ApproximateNumberOfMessages;return e=parseInt(e,10)||0,c.resolve(e)}return c.reject(new Error("unexpected response"))}catch(r){return this.log.error(`error in getQueueAttributes ${String(r)}`),c.reject(r)}}url(){return this.config.options.url}apikey(){return this.config.options.apikey}attr(e,t){if(!(e in this.config.options))throw new Error(`config object does not contain property ${e}`);return t?(this.config.options[e]=t,this):this.config.options[e]}stats(e){return this.states[e]}}j.version=f.version,j.REST=k,j.utils=f;export default j;
