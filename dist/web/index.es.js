/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2020
 */

import{merge as e,assign as t,filter as s,every as o,isFunction as r,defaults as n}from"lodash";import i from"axios";import a from"crypto";import{httpsOverHttps as c,httpsOverHttp as l}from"tunnel";import u from"os";import h from"graphql-tag";import{InMemoryCache as p}from"apollo-cache-inmemory";import d from"apollo-client";import{ApolloLink as g,execute as f}from"apollo-link";import{createHttpLink as w}from"apollo-link-http";import{buildAxiosFetch as m}from"@lifeomic/axios-fetch";import y from"socket.io-client";i.defaults.validateStatus=e=>e<=504;const k=function(){const t=(e,t)=>{e.headers||(e.headers={});let s=t;if(s||(s={}),!s.apikey)return;if(e.headers["X-EPI2ME-ApiKey"]=s.apikey,!s.apisecret)return;e.headers["X-EPI2ME-SignatureDate"]=(new Date).toISOString(),e.url.match(/^https:/)&&(e.url=e.url.replace(/:443/,"")),e.url.match(/^http:/)&&(e.url=e.url.replace(/:80/,""));const o=[e.url,Object.keys(e.headers).sort().filter(e=>e.match(/^x-epi2me/i)).map(t=>`${t}:${e.headers[t]}`).join("\n")].join("\n"),r=a.createHmac("sha1",s.apisecret).update(o).digest("hex");e.headers["X-EPI2ME-SignatureV0"]=r},s=async e=>{const t=e?e.data:null;if(!t)return Promise.reject(new Error("unexpected non-json response"));if(e&&e.status>=400){let s=`Network error ${e.status}`;return t.error&&(s=t.error),504===e.status&&(s="Please check your network connection and try again."),Promise.reject(new Error(s))}return t.error?Promise.reject(new Error(t.error)):Promise.resolve(t)};return{version:"3.0.1552",headers:(s,o)=>{const{log:r}=e({log:{debug:()=>{}}},o);let n=o;if(n||(n={}),s.headers=e({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-Client":n.user_agent||"api","X-EPI2ME-Version":n.agent_version||k.version},s.headers,n.headers),"signing"in n&&!n.signing||t(s,n),n.proxy){const e=n.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/),t=e[2],o=e[3],i={host:e[4],port:e[5]};t&&o&&(i.proxyAuth=`${t}:${o}`),n.proxy.match(/^https/)?(r.debug("using HTTPS over HTTPS proxy",JSON.stringify(i)),s.httpsAgent=c({proxy:i})):(r.debug("using HTTPS over HTTP proxy",JSON.stringify(i)),s.httpsAgent=l({proxy:i})),s.proxy=!1}},get:async(t,o)=>{const{log:r}=e({log:{debug:()=>{}}},o);let n,a=o.url,c=t;o.skip_url_mangle?n=c:(c=`/${c}`,a=a.replace(/\/+$/,""),c=c.replace(/\/+/g,"/"),n=a+c);const l={url:n,gzip:!0};let u;k.headers(l,o);try{r.debug(`GET ${l.url}`),u=await i.get(l.url,l)}catch(h){return Promise.reject(h)}return s(u,o)},post:async(t,o,r)=>{const{log:n}=e({log:{debug:()=>{}}},r);let a=r.url;a=a.replace(/\/+$/,"");const c={url:`${a}/${t.replace(/\/+/g,"/")}`,gzip:!0,data:o,headers:{}};if(r.legacy_form){const t=[],s=e({json:JSON.stringify(o)},o);Object.keys(s).sort().forEach(e=>{t.push(`${e}=${escape(s[e])}`)}),c.data=t.join("&"),c.headers["Content-Type"]="application/x-www-form-urlencoded"}k.headers(c,r);const{data:l}=c;let u;delete c.data;try{n.debug(`POST ${c.url}`),u=await i.post(c.url,l,c)}catch(h){return Promise.reject(h)}return r.handler?r.handler(u):s(u,r)},put:async(t,o,r,n)=>{const{log:a}=e({log:{debug:()=>{}}},n);let c=n.url;c=c.replace(/\/+$/,"");const l={url:`${c}/${t.replace(/\/+/g,"/")}/${o}`,gzip:!0,data:r,headers:{}};if(n.legacy_form){const t=[],s=e({json:JSON.stringify(r)},r);Object.keys(s).sort().forEach(e=>{t.push(`${e}=${escape(s[e])}`)}),l.data=t.join("&"),l.headers["Content-Type"]="application/x-www-form-urlencoded"}k.headers(l,n);const{data:u}=l;let h;delete l.data;try{a.debug(`PUT ${l.url}`),h=await i.put(l.url,u,l)}catch(p){return Promise.reject(p)}return s(h,n)}}}(),$=(e,t)=>{const s=["","K","M","G","T","P","E","Z"];let o=t||0,r=e||0;return r>=1e3?(r/=1e3,o+=1,o>=s.length?"???":$(r,o)):0===o?`${r}${s[o]}`:`${r.toFixed(1)}${s[o]}`};var I="https://epi2me.nanoporetech.com",b={local:!1,url:I,user_agent:"EPI2ME API",region:"eu-west-1",sessionGrace:5,uploadTimeout:1200,downloadTimeout:1200,fileCheckInterval:5,downloadCheckInterval:3,stateCheckInterval:60,inFlightDelay:600,waitTimeSeconds:20,waitTokenError:30,transferPoolSize:3,downloadMode:"data+telemetry",filetype:[".fastq",".fq",".fastq.gz",".fq.gz"],signing:!0};class v{constructor(e){this.options=t({agent_version:k.version,local:!1,url:I,user_agent:"EPI2ME API",signing:!0},e),this.log=this.options.log}async list(e){const t=e.match(/^[a-z_]+/i)[0];return k.get(e,this.options).then(e=>e[`${t}s`])}async read(e,t){return k.get(`${e}/${t}`,this.options)}async user(){return this.options.local?{accounts:[{id_user_account:"none",number:"NONE",name:"None"}]}:k.get("user",this.options)}async status(){return k.get("status",this.options)}async jwt(){return k.post("authenticate",{},e({handler:e=>e.headers["x-epi2me-jwt"]?Promise.resolve(e.headers["x-epi2me-jwt"]):Promise.reject(new Error("failed to fetch JWT"))},this.options))}async instanceToken(s,o){return k.post("token",e(o,{id_workflow_instance:s}),t({},this.options,{legacy_form:!0}))}async installToken(e){return k.post("token/install",{id_workflow:e},t({},this.options,{legacy_form:!0}))}async attributes(){return this.list("attribute")}async workflows(){return this.list("workflow")}async amiImages(){if(this.options.local)throw new Error("amiImages unsupported in local mode");return this.list("ami_image")}async amiImage(e,t){let s,o,r;if(e&&t instanceof Object?(s=e,o=t,r="update"):e instanceof Object&&!t?(o=e,r="create"):(r="read",s=e),this.options.local)throw new Error("ami_image unsupported in local mode");if("update"===r)return k.put("ami_image",s,o,this.options);if("create"===r)return k.post("ami_image",o,this.options);if(!s)throw new Error("no id_ami_image specified");return this.read("ami_image",s)}async workflow(t,o,r){let n,i,a,c;if(t&&o&&r instanceof Function?(n=t,i=o,a=r,c="update"):t&&o instanceof Object&&!(o instanceof Function)?(n=t,i=o,c="update"):t instanceof Object&&o instanceof Function?(i=t,a=o,c="create"):t instanceof Object&&!o?(i=t,c="create"):(c="read",n=t,a=o instanceof Function?o:null),"update"===c)try{const e=await k.put("workflow",n,i,this.options);return a?a(null,e):Promise.resolve(e)}catch(p){return a?a(p):Promise.reject(p)}if("create"===c)try{const e=await k.post("workflow",i,this.options);return a?a(null,e):Promise.resolve(e)}catch(p){return a?a(p):Promise.reject(p)}if(!n){const e=new Error("no workflow id specified");return a?a(e):Promise.reject(e)}const l={};try{const t=await this.read("workflow",n);if(t.error)throw new Error(t.error);e(l,t)}catch(p){return this.log.error(`${n}: error fetching workflow ${String(p)}`),a?a(p):Promise.reject(p)}e(l,{params:{}});try{const t=await k.get(`workflow/config/${n}`,this.options);if(t.error)throw new Error(t.error);e(l,t)}catch(p){return this.log.error(`${n}: error fetching workflow config ${String(p)}`),a?a(p):Promise.reject(p)}const u=s(l.params,{widget:"ajax_dropdown"}),h=[...u.map((e,t)=>{const s=u[t];return new Promise((e,t)=>{const o=s.values.source.replace("{{EPI2ME_HOST}}","").replace(/&?apikey=\{\{EPI2ME_API_KEY\}\}/,"");k.get(o,this.options).then(t=>{const o=t[s.values.data_root];return o&&(s.values=o.map(e=>({label:e[s.values.items.label_key],value:e[s.values.items.value_key]}))),e()}).catch(e=>(this.log.error(`failed to fetch ${o}`),t(e)))})})];try{return await Promise.all(h),a?a(null,l):Promise.resolve(l)}catch(p){return this.log.error(`${n}: error fetching config and parameters ${String(p)}`),a?a(p):Promise.reject(p)}}async startWorkflow(e){return k.post("workflow_instance",e,t({},this.options,{legacy_form:!0}))}async stopWorkflow(e){return k.put("workflow_instance/stop",e,null,t({},this.options,{legacy_form:!0}))}async workflowInstances(e){return e&&e.run_id?k.get(`workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=${e.run_id};`,this.options).then(e=>e.data.map(e=>({id_workflow_instance:e.id_ins,id_workflow:e.id_flo,run_id:e.run_id,description:e.desc,rev:e.rev}))):this.list("workflow_instance")}async workflowInstance(e){return this.read("workflow_instance",e)}async workflowConfig(e){return k.get(`workflow/config/${e}`,this.options)}async register(e,s){return k.put("reg",e,{description:s||`${u.userInfo().username}@${u.hostname()}`},t({},this.options,{signing:!1}))}async datasets(e){let t=e;return t||(t={}),t.show||(t.show="mine"),this.list(`dataset?show=${t.show}`)}async dataset(e){return this.options.local?this.datasets().then(t=>t.find(t=>t.id_dataset===e)):this.read("dataset",e)}async fetchContent(e){const s=t({},this.options,{skip_url_mangle:!0,headers:{"Content-Type":""}});return k.get(e,s)}}const E="\npage\npages\nhasNext\nhasPrevious\ntotalCount\n",P="\nidWorkflowInstance\nstartDate\nworkflowImage{\n  workflow\n  {\n    rev\n    name\n  }\n}\n",S=function(){const t=(e,t)=>{e.headers||(e.headers={});let s=t;if(s||(s={}),!s.apikey||!s.apisecret)return;e.headers["X-EPI2ME-APIKEY"]=s.apikey,e.headers["X-EPI2ME-SIGNATUREDATE"]=(new Date).toISOString();const o=[Object.keys(e.headers).sort().filter(e=>e.match(/^x-epi2me/i)).map(t=>`${t}:${e.headers[t]}`).join("\n"),e.body].join("\n"),r=a.createHmac("sha1",s.apisecret).update(o).digest("hex");e.headers["X-EPI2ME-SIGNATUREV0"]=r};return{version:"3.0.1552",setHeaders:(s,o)=>{const{log:r}=e({log:{debug:()=>{}}},o);let n=o;if(n||(n={}),s.headers=e({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-CLIENT":n.user_agent||"api","X-EPI2ME-VERSION":n.agent_version||S.version},s.headers,n.headers),"signing"in n&&!n.signing||t(s,n),n.proxy){const e=n.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/),t=e[2],o=e[3],i={host:e[4],port:e[5]};t&&o&&(i.proxyAuth=`${t}:${o}`),n.proxy.match(/^https/)?(r.debug("using HTTPS over HTTPS proxy",JSON.stringify(i)),s.httpsAgent=c({proxy:i})):(r.debug("using HTTPS over HTTP proxy",JSON.stringify(i)),s.httpsAgent=l({proxy:i})),s.proxy=!1}}}}(),_=m(i),T=(e,t)=>{const{apikey:s,apisecret:o}=t.headers.keys;return delete t.headers.keys,S.setHeaders(t,{apikey:s,apisecret:o,signing:!0}),_(e,t)},j=new d({link:new g(e=>{const{apikey:t,apisecret:s,url:o}=e.getContext(),r=w({uri:`${o}/graphql`,fetch:T,headers:{keys:{apikey:t,apisecret:s}}});return f(r,e)}),cache:new p});class x{constructor(e){this.options=t({agent_version:k.version,local:!1,url:I,user_agent:"EPI2ME API",signing:!0},e),this.options.url=this.options.url.replace(/:\/\//,"://graphql."),this.log=this.options.log,this.client=j}createContext(t){const{apikey:s,apisecret:o,url:r}=this.options;return e({apikey:s,apisecret:o,url:r},t)}workflows(e={},t={}){const s=h`
      query allWorkflows($page: Int, $isActive: Int) {
        allWorkflows(page: $page, isActive: $isActive) {
          ${E}
          results {
            ${"\nidWorkflow\nname\ndescription\nsummary\nrev\n"}
          }
        }
      }
    `,o=this.createContext(e);return this.client.query({query:s,variables:t,context:o})}workflow(e={},t={}){const s=h`
      query workflow($idWorkflow: ID!) {
        workflow(idWorkflow: $idWorkflow) {
          ${"\nidWorkflow\nname\ndescription\nsummary\nrev\n"}
        }
      }
    `,o=this.createContext(e);return this.client.query({query:s,variables:t,context:o})}workflowInstances(e={},t={}){const s=h`
      query allWorkflowInstances($page: Int, $shared: Boolean, $idUser: int) {
        allWorkflowInstances(page: $page, shared: $shared, idUser: $idUser) {
          ${E}
          results {
            ${P}
          }
        }
      }
    `,o=this.createContext(e);return this.client.query({query:s,variables:t,context:o})}workflowInstance(e={},t={}){const s=h`
      query workflowInstance($idWorkflowInstance: ID!) {
        workflowInstance(idWorkflowInstance: $idWorkflowInstance) {
          ${P}
        }
      }
    `,o=this.createContext(e);return this.client.query({query:s,variables:t,context:o})}startWorkflow(e={},t={}){const s=h`
      mutation startWorkflow(
        $idWorkflow: ID!
        $computeAccountId: Int!
        $storageAccountId: Int
        $isConsentedHuman: Int = 0
      ) {
        startWorkflowInstance(
          idWorkflow: $idWorkflow
          computeAccountId: $computeAccountId
          storageAccountId: $storageAccountId
          isConsentedHuman: $isConsentedHuman
        ) {
          bucket
          idUser
          idWorkflowInstance
          inputqueue
          outputqueue
          region
          keyId
          chain
        }
      }
    `,o=this.createContext(e);return this.client.mutate({mutation:s,variables:t,context:o})}async register(e,t,s){let o,r;t&&t instanceof Function?r=t:(o=t,r=s);try{const t=await k.post("apiaccess",{code:e,description:o||`${u.userInfo().username}@${u.hostname()}`},this.options);return r?r(null,t):Promise.resolve(t)}catch(n){return r?r(n):Promise.reject(n)}}}class O{constructor(t,s){this.debounces={},this.debounceWindow=e({debounceWindow:2e3},s).debounceWindow,this.log=e({log:{debug:()=>{}}},s).log,t.jwt().then(e=>{this.socket=y(s.url,{transportOptions:{polling:{extraHeaders:{Cookie:`x-epi2me-jwt=${e}`}}}}),this.socket.on("connect",()=>{this.log.debug("socket ready")})})}debounce(t,s){const o=e(t)._uuid;if(o){if(this.debounces[o])return;this.debounces[o]=1,setTimeout(()=>{delete this.debounces[o]},this.debounceWindow)}s&&s(t)}watch(e,t){if(!this.socket)return this.log.debug(`socket not ready. requeueing watch on ${e}`),void setTimeout(()=>{this.watch(e,t)},1e3);this.socket.on(e,e=>this.debounce(e,t))}emit(e,t){if(!this.socket)return this.log.debug(`socket not ready. requeueing emit on ${e}`),void setTimeout(()=>{this.emit(e,t)},1e3);this.log.debug(`socket emit ${e} ${JSON.stringify(t)}`),this.socket.emit(e,t)}}class C{constructor(t){let s;if(s="string"===typeof t||"object"===typeof t&&t.constructor===String?JSON.parse(t):t||{},s.endpoint&&(s.url=s.endpoint,delete s.endpoint),s.log){if(!o([s.log.info,s.log.warn,s.log.error,s.log.debug,s.log.json],r))throw new Error("expected log object to have error, debug, info, warn and json methods");this.log=s.log}else this.log={info:e=>{console.info(`[${(new Date).toISOString()}] INFO: ${e}`)},debug:e=>{console.debug(`[${(new Date).toISOString()}] DEBUG: ${e}`)},warn:e=>{console.warn(`[${(new Date).toISOString()}] WARN: ${e}`)},error:e=>{console.error(`[${(new Date).toISOString()}] ERROR: ${e}`)},json:e=>{console.log(JSON.stringify(e))}};this.stopped=!0,this.states={upload:{filesCount:0,success:{files:0,bytes:0,reads:0},types:{},niceTypes:"",progress:{bytes:0,total:0}},download:{progress:{},success:{files:0,reads:0,bytes:0},fail:0,types:{},niceTypes:""},warnings:[]},this.config={options:n(s,b),instance:{id_workflow_instance:s.id_workflow_instance,inputQueueName:null,outputQueueName:null,outputQueueURL:null,discoverQueueCache:{},bucket:null,bucketFolder:null,remote_addr:null,chain:null,key_id:null}},this.config.instance.awssettings={region:this.config.options.region},this.REST=new v(e({log:this.log},this.config.options)),this.graphQL=new x(e({log:this.log},this.config.options)),this.timers={downloadCheckInterval:null,stateCheckInterval:null,fileCheckInterval:null,transferTimeouts:{},visibilityIntervals:{},summaryTelemetryInterval:null}}async socket(){return this.mySocket?this.mySocket:(this.mySocket=new O(this.REST,e({log:this.log},this.config.options)),this.mySocket)}async realtimeFeedback(e,t){(await this.socket()).emit(e,t)}async stopEverything(){this.stopped=!0,this.log.debug("stopping watchers"),["downloadCheckInterval","stateCheckInterval","fileCheckInterval","summaryTelemetryInterval"].forEach(e=>{this.timers[e]&&(this.log.debug(`clearing ${e} interval`),clearInterval(this.timers[e]),this.timers[e]=null)}),Object.keys(this.timers.transferTimeouts).forEach(e=>{this.log.debug(`clearing transferTimeout for ${e}`),clearTimeout(this.timers.transferTimeouts[e]),delete this.timers.transferTimeouts[e]}),Object.keys(this.timers.visibilityIntervals).forEach(e=>{this.log.debug(`clearing visibilityInterval for ${e}`),clearInterval(this.timers.visibilityIntervals[e]),delete this.timers.visibilityIntervals[e]}),this.downloadWorkerPool&&(this.log.debug("clearing downloadWorkerPool"),await Promise.all(Object.values(this.downloadWorkerPool)),this.downloadWorkerPool=null);const{id_workflow_instance:e}=this.config.instance;if(e){try{await this.REST.stopWorkflow(e)}catch(t){return this.log.error(`Error stopping instance: ${String(t)}`),Promise.reject(t)}this.log.info(`workflow instance ${e} stopped`)}return Promise.resolve()}reportProgress(){const{upload:e,download:t}=this.states;this.log.json({progress:{download:t,upload:e}})}storeState(e,t,s,o){const r=o||{};this.states[e]||(this.states[e]={}),this.states[e][t]||(this.states[e][t]={}),"incr"===s?Object.keys(r).forEach(s=>{this.states[e][t][s]=this.states[e][t][s]?this.states[e][t][s]+parseInt(r[s],10):parseInt(r[s],10)}):Object.keys(r).forEach(s=>{this.states[e][t][s]=this.states[e][t][s]?this.states[e][t][s]-parseInt(r[s],10):-parseInt(r[s],10)});try{this.states[e].success.niceReads=$(this.states[e].success.reads)}catch(i){this.states[e].success.niceReads=0}try{this.states[e].progress.niceSize=$(this.states[e].success.bytes+this.states[e].progress.bytes||0)}catch(i){this.states[e].progress.niceSize=0}try{this.states[e].success.niceSize=$(this.states[e].success.bytes)}catch(i){this.states[e].success.niceSize=0}this.states[e].niceTypes=Object.keys(this.states[e].types||{}).sort().map(t=>`${this.states[e].types[t]} ${t}`).join(", ");const n=Date.now();(!this.stateReportTime||n-this.stateReportTime>2e3)&&(this.stateReportTime=n,this.reportProgress())}uploadState(e,t,s){return this.storeState("upload",e,t,s)}downloadState(e,t,s){return this.storeState("download",e,t,s)}url(){return this.config.options.url}apikey(){return this.config.options.apikey}attr(e,t){if(!(e in this.config.options))throw new Error(`config object does not contain property ${e}`);return t?(this.config.options[e]=t,this):this.config.options[e]}stats(e){return this.states[e]}}C.version=k.version,C.Profile=class{constructor(t,s){this.allProfileData={},this.defaultEndpoint=process.env.METRICHOR||b.endpoint||b.url,this.raiseExceptions=s,t&&(this.allProfileData=e(t,{profiles:{}})),this.allProfileData.endpoint&&(this.defaultEndpoint=this.allProfileData.endpoint)}profile(t){return t?e({endpoint:this.defaultEndpoint},this.allProfileData.profiles[t]):{}}profiles(){return Object.keys(this.allProfileData.profiles||{})}},C.REST=v,C.utils=k;export default C;
