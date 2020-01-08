/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2020
 */

import{merge as e,assign as t,filter as s,every as r,isFunction as o,defaults as n}from"lodash";import i from"axios";import a from"crypto";import{httpsOverHttps as c,httpsOverHttp as l}from"tunnel";import u from"os";import h from"graphql-tag";import{ApolloClient as p}from"apollo-client";import{InMemoryCache as d}from"apollo-cache-inmemory";import{ApolloLink as g,execute as f}from"apollo-link";import{createHttpLink as m}from"apollo-link-http";import{buildAxiosFetch as w}from"@lifeomic/axios-fetch";import y from"socket.io-client";i.defaults.validateStatus=e=>e<=504;const k=function(){const t=(e,t)=>{e.headers||(e.headers={});let s=t;if(s||(s={}),!s.apikey)return;if(e.headers["X-EPI2ME-ApiKey"]=s.apikey,!s.apisecret)return;e.headers["X-EPI2ME-SignatureDate"]=(new Date).toISOString(),e.url.match(/^https:/)&&(e.url=e.url.replace(/:443/,"")),e.url.match(/^http:/)&&(e.url=e.url.replace(/:80/,""));const r=[e.url,Object.keys(e.headers).sort().filter(e=>e.match(/^x-epi2me/i)).map(t=>`${t}:${e.headers[t]}`).join("\n")].join("\n"),o=a.createHmac("sha1",s.apisecret).update(r).digest("hex");e.headers["X-EPI2ME-SignatureV0"]=o},s=async e=>{const t=e?e.data:null;if(!t)return Promise.reject(new Error("unexpected non-json response"));if(e&&e.status>=400){let s=`Network error ${e.status}`;return t.error&&(s=t.error),504===e.status&&(s="Please check your network connection and try again."),Promise.reject(new Error(s))}return t.error?Promise.reject(new Error(t.error)):Promise.resolve(t)};return{version:"3.0.1828",headers:(s,r)=>{const{log:o}=e({log:{debug:()=>{}}},r);let n=r;if(n||(n={}),s.headers=e({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-Client":n.user_agent||"api","X-EPI2ME-Version":n.agent_version||k.version},s.headers,n.headers),"signing"in n&&!n.signing||t(s,n),n.proxy){const e=n.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/),t=e[2],r=e[3],i={host:e[4],port:e[5]};t&&r&&(i.proxyAuth=`${t}:${r}`),n.proxy.match(/^https/)?(o.debug("using HTTPS over HTTPS proxy",JSON.stringify(i)),s.httpsAgent=c({proxy:i})):(o.debug("using HTTPS over HTTP proxy",JSON.stringify(i)),s.httpsAgent=l({proxy:i})),s.proxy=!1}},get:async(t,r)=>{const{log:o}=e({log:{debug:()=>{}}},r);let n,a=r.url,c=t;r.skip_url_mangle?n=c:(c=`/${c}`,n=(a=a.replace(/\/+$/,""))+(c=c.replace(/\/+/g,"/")));const l={url:n,gzip:!0};let u;k.headers(l,r);try{o.debug(`GET ${l.url}`),u=await i.get(l.url,l)}catch(h){return Promise.reject(h)}return s(u,r)},post:async(t,r,o)=>{const{log:n}=e({log:{debug:()=>{}}},o);let a=o.url;const c={url:`${a=a.replace(/\/+$/,"")}/${t.replace(/\/+/g,"/")}`,gzip:!0,data:r,headers:{}};if(o.legacy_form){const t=[],s=e({json:JSON.stringify(r)},r);Object.keys(s).sort().forEach(e=>{t.push(`${e}=${escape(s[e])}`)}),c.data=t.join("&"),c.headers["Content-Type"]="application/x-www-form-urlencoded"}k.headers(c,o);const{data:l}=c;let u;delete c.data;try{n.debug(`POST ${c.url}`),u=await i.post(c.url,l,c)}catch(h){return Promise.reject(h)}return o.handler?o.handler(u):s(u,o)},put:async(t,r,o,n)=>{const{log:a}=e({log:{debug:()=>{}}},n);let c=n.url;const l={url:`${c=c.replace(/\/+$/,"")}/${t.replace(/\/+/g,"/")}/${r}`,gzip:!0,data:o,headers:{}};if(n.legacy_form){const t=[],s=e({json:JSON.stringify(o)},o);Object.keys(s).sort().forEach(e=>{t.push(`${e}=${escape(s[e])}`)}),l.data=t.join("&"),l.headers["Content-Type"]="application/x-www-form-urlencoded"}k.headers(l,n);const{data:u}=l;let h;delete l.data;try{a.debug(`PUT ${l.url}`),h=await i.put(l.url,u,l)}catch(p){return Promise.reject(p)}return s(h,n)}}}(),$=(e,t)=>{const s=["","K","M","G","T","P","E","Z"];let r=t||0,o=e||0;return o>=1e3?(o/=1e3,(r+=1)>=s.length?"???":$(o,r)):0===r?`${o}${s[r]}`:`${o.toFixed(1)}${s[r]}`};var I=!1,b="https://epi2me.nanoporetech.com",v="EPI2ME API",P=!0,j={local:I,url:b,user_agent:v,region:"eu-west-1",sessionGrace:5,uploadTimeout:1200,downloadTimeout:1200,fileCheckInterval:5,downloadCheckInterval:3,stateCheckInterval:60,inFlightDelay:600,waitTimeSeconds:20,waitTokenError:30,transferPoolSize:3,downloadMode:"data+telemetry",filetype:[".fastq",".fq",".fastq.gz",".fq.gz"],signing:P};class S{constructor(e){this.options=t({agent_version:k.version,local:I,url:b,user_agent:v,signing:P},e),this.log=this.options.log}async list(e){try{const t=await k.get(e,this.options),s=e.match(/^[a-z_]+/i)[0];return Promise.resolve(t[`${s}s`])}catch(t){return this.log.error(`list error ${String(t)}`),Promise.reject(t)}}async read(e,t){try{const s=await k.get(`${e}/${t}`,this.options);return Promise.resolve(s)}catch(s){return this.log.error("read",s),Promise.reject(s)}}async user(){return this.options.local?{accounts:[{id_user_account:"none",number:"NONE",name:"None"}]}:k.get("user",this.options)}async status(){return k.get("status",this.options)}async jwt(){try{const t=e=>e.headers["x-epi2me-jwt"]?Promise.resolve(e.headers["x-epi2me-jwt"]):Promise.reject(new Error("failed to fetch JWT")),s=await k.post("authenticate",{},e({handler:t},this.options));return Promise.resolve(s)}catch(t){return Promise.reject(t)}}async instanceToken(s,r){return k.post("token",e(r,{id_workflow_instance:s}),t({},this.options,{legacy_form:!0}))}async installToken(e){return k.post("token/install",{id_workflow:e},t({},this.options,{legacy_form:!0}))}async attributes(){return this.list("attribute")}async workflows(){return this.list("workflow")}async amiImages(){if(this.options.local)throw new Error("amiImages unsupported in local mode");return this.list("ami_image")}async amiImage(e,t,s){let r,o,n,i;if(e&&t&&s instanceof Function?(r=e,o=t,n=s,i="update"):e&&t instanceof Object&&!(t instanceof Function)?(r=e,o=t,i="update"):e instanceof Object&&t instanceof Function?(o=e,n=t,i="create"):e instanceof Object&&!t?(o=e,i="create"):(i="read",r=e,n=t instanceof Function?t:null),this.options.local){const e=new Error("ami_image unsupported in local mode");return n?n(e):Promise.reject(e)}if("update"===i)try{const e=await k.put("ami_image",r,o,this.options);return n?n(null,e):Promise.resolve(e)}catch(a){return n?n(a):Promise.reject(a)}if("create"===i)try{const e=await k.post("ami_image",o,this.options);return n?n(null,e):Promise.resolve(e)}catch(a){return n?n(a):Promise.reject(a)}if(!r){const e=new Error("no id_ami_image specified");return n?n(e):Promise.reject(e)}try{const e=await this.read("ami_image",r);return n?n(null,e):Promise.resolve(e)}catch(a){return n?n(a):Promise.reject(a)}}async workflow(t,r,o){let n,i,a,c;if(t&&r&&o instanceof Function?(n=t,i=r,a=o,c="update"):t&&r instanceof Object&&!(r instanceof Function)?(n=t,i=r,c="update"):t instanceof Object&&r instanceof Function?(i=t,a=r,c="create"):t instanceof Object&&!r?(i=t,c="create"):(c="read",n=t,a=r instanceof Function?r:null),"update"===c)try{const e=await k.put("workflow",n,i,this.options);return a?a(null,e):Promise.resolve(e)}catch(p){return a?a(p):Promise.reject(p)}if("create"===c)try{const e=await k.post("workflow",i,this.options);return a?a(null,e):Promise.resolve(e)}catch(p){return a?a(p):Promise.reject(p)}if(!n){const e=new Error("no workflow id specified");return a?a(e):Promise.reject(e)}const l={};try{const t=await this.read("workflow",n);if(t.error)throw new Error(t.error);e(l,t)}catch(p){return this.log.error(`${n}: error fetching workflow ${String(p)}`),a?a(p):Promise.reject(p)}e(l,{params:{}});try{const t=await k.get(`workflow/config/${n}`,this.options);if(t.error)throw new Error(t.error);e(l,t)}catch(p){return this.log.error(`${n}: error fetching workflow config ${String(p)}`),a?a(p):Promise.reject(p)}const u=s(l.params,{widget:"ajax_dropdown"}),h=[...u.map((e,t)=>{const s=u[t];return new Promise((e,t)=>{const r=s.values.source.replace("{{EPI2ME_HOST}}","").replace(/&?apikey=\{\{EPI2ME_API_KEY\}\}/,"");k.get(r,this.options).then(t=>{const r=t[s.values.data_root];return r&&(s.values=r.map(e=>({label:e[s.values.items.label_key],value:e[s.values.items.value_key]}))),e()}).catch(e=>(this.log.error(`failed to fetch ${r}`),t(e)))})})];try{return await Promise.all(h),a?a(null,l):Promise.resolve(l)}catch(p){return this.log.error(`${n}: error fetching config and parameters ${String(p)}`),a?a(p):Promise.reject(p)}}async startWorkflow(e){return k.post("workflow_instance",e,t({},this.options,{legacy_form:!0}))}async stopWorkflow(e){return k.put("workflow_instance/stop",e,null,t({},this.options,{legacy_form:!0}))}async workflowInstances(e){if(e&&e.run_id)try{const t=(await k.get(`workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=${e.run_id};`,this.options)).data.map(e=>({id_workflow_instance:e.id_ins,id_workflow:e.id_flo,run_id:e.run_id,description:e.desc,rev:e.rev}));return Promise.resolve(t)}catch(t){return Promise.reject(t)}return this.list("workflow_instance")}async workflowInstance(e){return this.read("workflow_instance",e)}async workflowConfig(e){return k.get(`workflow/config/${e}`,this.options)}async register(e,s){return k.put("reg",e,{description:s||`${u.userInfo().username}@${u.hostname()}`},t({},this.options,{signing:!1}))}async datasets(e){let t=e;return t||(t={}),t.show||(t.show="mine"),this.list(`dataset?show=${t.show}`)}async dataset(e){return this.options.local?this.datasets().then(t=>t.find(t=>t.id_dataset===e)):this.read("dataset",e)}async fetchContent(e,s){const r=t({},this.options,{skip_url_mangle:!0,headers:{"Content-Type":""}});try{const t=await k.get(e,r);return s?s(null,t):Promise.resolve(t)}catch(o){return s?s(o):Promise.reject(o)}}}const E=function(){const t=(e,t)=>{e.headers||(e.headers={});let s=t;if(s||(s={}),!s.apikey||!s.apisecret)return;e.headers["X-EPI2ME-APIKEY"]=s.apikey,e.headers["X-EPI2ME-SIGNATUREDATE"]=(new Date).toISOString();const r=[Object.keys(e.headers).sort().filter(e=>e.match(/^x-epi2me/i)).map(t=>`${t}:${e.headers[t]}`).join("\n"),e.body].join("\n"),o=a.createHmac("sha1",s.apisecret).update(r).digest("hex");e.headers["X-EPI2ME-SIGNATUREV0"]=o};return{version:"3.0.1828",setHeaders:(s,r)=>{const{log:o}=e({log:{debug:()=>{}}},r);let n=r;if(n||(n={}),s.headers=e({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-CLIENT":n.user_agent||"api","X-EPI2ME-VERSION":n.agent_version||E.version},s.headers,n.headers),"signing"in n&&!n.signing||t(s,n),n.proxy){const e=n.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/),t=e[2],r=e[3],i={host:e[4],port:e[5]};t&&r&&(i.proxyAuth=`${t}:${r}`),n.proxy.match(/^https/)?(o.debug("using HTTPS over HTTPS proxy",JSON.stringify(i)),s.httpsAgent=c({proxy:i})):(o.debug("using HTTPS over HTTP proxy",JSON.stringify(i)),s.httpsAgent=l({proxy:i})),s.proxy=!1}}}}(),_=w(i),T=(e,t)=>{const{apikey:s,apisecret:r}=t.headers.keys;return delete t.headers.keys,E.setHeaders(t,{apikey:s,apisecret:r,signing:!0}),_(e,t)},x=new p({link:new g(e=>{const{apikey:t,apisecret:s,url:r}=e.getContext(),o=m({uri:`${r}/graphql`,fetch:T,headers:{keys:{apikey:t,apisecret:s}}});return f(o,e)}),cache:new d}),O="\npage\npages\nhasNext\nhasPrevious\ntotalCount\n",W="\nidWorkflow\nname\ndescription\nsummary\n",C="\nidWorkflowInstance\noutputqueue\nstartDate\n";class q{constructor(e){this.options=t({agent_version:k.version,local:I,url:b,user_agent:v,signing:P},e),this.options.url=this.options.url.replace(/:\/\//,"://graphql."),this.log=this.options.log,this.client=x}createContext(t){const{apikey:s,apisecret:r,url:o}=this.options;return e({apikey:s,apisecret:r,url:o},t)}workflows(e={},t={}){const s=h`
      query allWorkflows($page: Int) {
        allWorkflows(page: $page) {
          ${O}
          results {
            ${W}
          }
        }
      }
    `,r=this.createContext(e);return this.client.query({query:s,variables:t,context:r})}workflow(e){const t=h`
      query workflow($idWorkflow: ID!) {
        workflow(idWorkflow: $idWorkflow) {
          ${W}
        }
      }
    `;return this.client.query({query:t,variables:e})}workflowInstances(e){const t=h`
      query allWorkflowInstances($page: Int) {
        allWorkflowInstances(page: $page) {
          ${O}
          results {
            ${C}
          }
        }
      }
    `;return this.client.query({query:t,variables:e})}workflowInstance(e){const t=h`
      query workflowInstance($idWorkflowInstance: ID!) {
        workflowInstance(idWorkflowInstance: $idWorkflowInstance) {
          ${C}
        }
      }
    `;return this.client.query({query:t,variables:e})}startWorkflow(e){const t=h`
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
    `;return this.client.mutate({mutation:t,variables:e})}async register(e,t,s){let r,o;t&&t instanceof Function?o=t:(r=t,o=s);try{const t=await k.post("apiaccess",{code:e,description:r||`${u.userInfo().username}@${u.hostname()}`},this.options);return o?o(null,t):Promise.resolve(t)}catch(n){return o?o(n):Promise.reject(n)}}}class A{constructor(t,s){this.debounces={},this.debounceWindow=e({debounceWindow:2e3},s).debounceWindow,this.log=e({log:{debug:()=>{}}},s).log,t.jwt().then(e=>{this.socket=y(s.url,{transportOptions:{polling:{extraHeaders:{Cookie:`x-epi2me-jwt=${e}`}}}}),this.socket.on("connect",()=>{this.log.debug("socket ready")})})}debounce(t,s){const r=e(t)._uuid;if(r){if(this.debounces[r])return;this.debounces[r]=1,setTimeout(()=>{delete this.debounces[r]},this.debounceWindow)}s&&s(t)}watch(e,t){if(!this.socket)return this.log.debug(`socket not ready. requeueing watch on ${e}`),void setTimeout(()=>{this.watch(e,t)},1e3);this.socket.on(e,e=>this.debounce(e,t))}emit(e,t){if(!this.socket)return this.log.debug(`socket not ready. requeueing emit on ${e}`),void setTimeout(()=>{this.emit(e,t)},1e3);this.log.debug(`socket emit ${e} ${JSON.stringify(t)}`),this.socket.emit(e,t)}}class N{constructor(t){let s;if((s="string"===typeof t||"object"===typeof t&&t.constructor===String?JSON.parse(t):t||{}).log){if(!r([s.log.info,s.log.warn,s.log.error,s.log.debug,s.log.json],o))throw new Error("expected log object to have error, debug, info, warn and json methods");this.log=s.log}else this.log={info:e=>{console.info(`[${(new Date).toISOString()}] INFO: ${e}`)},debug:e=>{console.debug(`[${(new Date).toISOString()}] DEBUG: ${e}`)},warn:e=>{console.warn(`[${(new Date).toISOString()}] WARN: ${e}`)},error:e=>{console.error(`[${(new Date).toISOString()}] ERROR: ${e}`)},json:e=>{console.log(JSON.stringify(e))}};this.stopped=!0,this.states={upload:{filesCount:0,success:{files:0,bytes:0,reads:0},types:{},niceTypes:"",progress:{bytes:0,total:0}},download:{progress:{},success:{files:0,reads:0,bytes:0},fail:0,types:{},niceTypes:""},warnings:[]},this.config={options:n(s,j),instance:{id_workflow_instance:s.id_workflow_instance,inputQueueName:null,outputQueueName:null,outputQueueURL:null,discoverQueueCache:{},bucket:null,bucketFolder:null,remote_addr:null,chain:null,key_id:null}},this.config.instance.awssettings={region:this.config.options.region},this.REST=new S(e({log:this.log},this.config.options)),this.graphQL=new q(e({log:this.log},this.config.options)),this.timers={downloadCheckInterval:null,stateCheckInterval:null,fileCheckInterval:null,transferTimeouts:{},visibilityIntervals:{},summaryTelemetryInterval:null}}async socket(){return this.mySocket?this.mySocket:(this.mySocket=new A(this.REST,e({log:this.log},this.config.options)),this.mySocket)}async realtimeFeedback(e,t){(await this.socket()).emit(e,t)}async stopEverything(){this.stopped=!0,this.log.debug("stopping watchers"),["downloadCheckInterval","stateCheckInterval","fileCheckInterval","summaryTelemetryInterval"].forEach(e=>{this.timers[e]&&(this.log.debug(`clearing ${e} interval`),clearInterval(this.timers[e]),this.timers[e]=null)}),Object.keys(this.timers.transferTimeouts).forEach(e=>{this.log.debug(`clearing transferTimeout for ${e}`),clearTimeout(this.timers.transferTimeouts[e]),delete this.timers.transferTimeouts[e]}),Object.keys(this.timers.visibilityIntervals).forEach(e=>{this.log.debug(`clearing visibilityInterval for ${e}`),clearInterval(this.timers.visibilityIntervals[e]),delete this.timers.visibilityIntervals[e]}),this.downloadWorkerPool&&(this.log.debug("clearing downloadWorkerPool"),await Promise.all(Object.values(this.downloadWorkerPool)),this.downloadWorkerPool=null);const{id_workflow_instance:e}=this.config.instance;if(e){try{await this.REST.stopWorkflow(e)}catch(t){return this.log.error(`Error stopping instance: ${String(t)}`),Promise.reject(t)}this.log.info(`workflow instance ${e} stopped`)}return Promise.resolve()}reportProgress(){const{upload:e,download:t}=this.states;this.log.json({progress:{download:t,upload:e}})}storeState(e,t,s,r){const o=r||{};this.states[e]||(this.states[e]={}),this.states[e][t]||(this.states[e][t]={}),"incr"===s?Object.keys(o).forEach(s=>{this.states[e][t][s]=this.states[e][t][s]?this.states[e][t][s]+parseInt(o[s],10):parseInt(o[s],10)}):Object.keys(o).forEach(s=>{this.states[e][t][s]=this.states[e][t][s]?this.states[e][t][s]-parseInt(o[s],10):-parseInt(o[s],10)});try{this.states[e].success.niceReads=$(this.states[e].success.reads)}catch(i){this.states[e].success.niceReads=0}try{this.states[e].progress.niceSize=$(this.states[e].success.bytes+this.states[e].progress.bytes||0)}catch(i){this.states[e].progress.niceSize=0}try{this.states[e].success.niceSize=$(this.states[e].success.bytes)}catch(i){this.states[e].success.niceSize=0}this.states[e].niceTypes=Object.keys(this.states[e].types||{}).sort().map(t=>`${this.states[e].types[t]} ${t}`).join(", ");const n=Date.now();(!this.stateReportTime||n-this.stateReportTime>2e3)&&(this.stateReportTime=n,this.reportProgress())}uploadState(e,t,s){return this.storeState("upload",e,t,s)}downloadState(e,t,s){return this.storeState("download",e,t,s)}url(){return this.config.options.url}apikey(){return this.config.options.apikey}attr(e,t){if(!(e in this.config.options))throw new Error(`config object does not contain property ${e}`);return t?(this.config.options[e]=t,this):this.config.options[e]}stats(e){return this.states[e]}}N.version=k.version,N.REST=S,N.utils=k;export default N;
