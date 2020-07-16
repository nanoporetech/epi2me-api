/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2020
 */

import{merge as t,assign as e,filter as s,every as o,isFunction as r,defaults as i}from"lodash";import{BehaviorSubject as n,combineLatest as a}from"rxjs";import c from"graphql-tag";import{InMemoryCache as l}from"apollo-cache-inmemory";import h from"apollo-client";import{ApolloLink as u,execute as p}from"apollo-link";import{createHttpLink as d}from"apollo-link-http";import{resolve as g}from"url";import{buildAxiosFetch as f}from"@lifeomic/axios-fetch";import w from"axios";import m from"crypto";import{httpsOverHttps as y,httpsOverHttp as k}from"tunnel";import $ from"os";import _ from"socket.io-client";var I="https://epi2me.nanoporetech.com",S={local:!1,url:I,user_agent:"EPI2ME API",region:"eu-west-1",sessionGrace:5,uploadTimeout:1200,downloadTimeout:1200,fileCheckInterval:5,downloadCheckInterval:3,stateCheckInterval:60,inFlightDelay:600,waitTimeSeconds:20,waitTokenError:30,transferPoolSize:3,downloadMode:"data+telemetry",filetype:[".fastq",".fq",".fastq.gz",".fq.gz"],signing:!0,sampleDirectory:"/data"};const b="\npage\npages\nhasNext\nhasPrevious\ntotalCount\n",v="\nidWorkflowInstance\nstartDate\nworkflowImage{\n  workflow\n  {\n    rev\n    name\n  }\n}\n";const P=function(){const e=(t,e)=>{t.headers||(t.headers={});let s=e;if(s||(s={}),!s.apikey||!s.apisecret)return;t.headers["X-EPI2ME-APIKEY"]=s.apikey,t.headers["X-EPI2ME-SIGNATUREDATE"]=(new Date).toISOString();const o=[Object.keys(t.headers).sort().filter(t=>t.match(/^x-epi2me/i)).map(e=>`${e}:${t.headers[e]}`).join("\n"),t.body].join("\n"),r=m.createHmac("sha1",s.apisecret).update(o).digest("hex");t.headers["X-EPI2ME-SIGNATUREV0"]=r};return{version:"3.0.948",setHeaders:(s,o)=>{const{log:r}=t({log:{debug:()=>{}}},o);let i=o;if(i||(i={}),s.headers=t({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-CLIENT":i.user_agent||"api","X-EPI2ME-VERSION":i.agent_version||P.version},s.headers,i.headers),"signing"in i&&!i.signing||e(s,i),i.proxy){const t=i.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/),e=t[2],o=t[3],n={host:t[4],port:t[5]};e&&o&&(n.proxyAuth=`${e}:${o}`),i.proxy.match(/^https/)?(r.debug("using HTTPS over HTTPS proxy",JSON.stringify(n)),s.httpsAgent=y({proxy:n})):(r.debug("using HTTPS over HTTP proxy",JSON.stringify(n)),s.httpsAgent=k({proxy:n})),s.proxy=!1}}}}(),E=f(w),T=(t,e)=>{const{apikey:s,apisecret:o}=e.headers.keys;return delete e.headers.keys,P.setHeaders(e,{apikey:s,apisecret:o,signing:!0}),E(t,e)},j=new h({link:new u(t=>{const{apikey:e,apisecret:s,url:o}=t.getContext(),r=d({uri:g(o,"/graphql"),fetch:T,headers:{keys:{apikey:e,apisecret:s}}});return p(r,t)}),cache:new l});w.defaults.validateStatus=t=>t<=504;const x=function(){const e=(t,e)=>{t.headers||(t.headers={});let s=e;if(s||(s={}),!s.apikey)return;if(t.headers["X-EPI2ME-ApiKey"]=s.apikey,!s.apisecret)return;t.headers["X-EPI2ME-SignatureDate"]=(new Date).toISOString(),t.url.match(/^https:/)&&(t.url=t.url.replace(/:443/,"")),t.url.match(/^http:/)&&(t.url=t.url.replace(/:80/,""));const o=[t.url,Object.keys(t.headers).sort().filter(t=>t.match(/^x-epi2me/i)).map(e=>`${e}:${t.headers[e]}`).join("\n")].join("\n"),r=m.createHmac("sha1",s.apisecret).update(o).digest("hex");t.headers["X-EPI2ME-SignatureV0"]=r},s=async t=>{const e=t?t.data:null;if(!e)return Promise.reject(new Error("unexpected non-json response"));if(t&&t.status>=400){let s=`Network error ${t.status}`;return e.error&&(s=e.error),504===t.status&&(s="Please check your network connection and try again."),Promise.reject(new Error(s))}return e.error?Promise.reject(new Error(e.error)):Promise.resolve(e)};return{version:"3.0.948",headers:(s,o)=>{const{log:r}=t({log:{debug:()=>{}}},o);let i=o;if(i||(i={}),s.headers=t({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-Client":i.user_agent||"api","X-EPI2ME-Version":i.agent_version||x.version},s.headers,i.headers),"signing"in i&&!i.signing||e(s,i),i.proxy){const t=i.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/),e=t[2],o=t[3],n={host:t[4],port:t[5]};e&&o&&(n.proxyAuth=`${e}:${o}`),i.proxy.match(/^https/)?(r.debug("using HTTPS over HTTPS proxy",JSON.stringify(n)),s.httpsAgent=y({proxy:n})):(r.debug("using HTTPS over HTTP proxy",JSON.stringify(n)),s.httpsAgent=k({proxy:n})),s.proxy=!1}},head:async(e,s)=>{const{log:o}=t({log:{debug:()=>{}}},s);let r,i=s.url,n=e;s.skip_url_mangle?r=n:(n=`/${n}`,i=i.replace(/\/+$/,""),n=n.replace(/\/+/g,"/"),r=i+n);const a={url:r,gzip:!0};let c;x.headers(a,s);try{if(o.debug(`HEAD ${a.url}`),c=await w.head(a.url,a),c&&c.status>=400){let t=`Network error ${c.status}`;return 504===c.status&&(t="Please check your network connection and try again."),Promise.reject(new Error(t))}}catch(l){return Promise.reject(l)}return Promise.resolve(c)},get:async(e,o)=>{const{log:r}=t({log:{debug:()=>{}}},o);let i,n=o.url,a=e;o.skip_url_mangle?i=a:(a=`/${a}`,n=n.replace(/\/+$/,""),a=a.replace(/\/+/g,"/"),i=n+a);const c={url:i,gzip:!0};let l;x.headers(c,o);try{r.debug(`GET ${c.url}`),l=await w.get(c.url,c)}catch(h){return Promise.reject(h)}return s(l,o)},post:async(e,o,r)=>{const{log:i}=t({log:{debug:()=>{}}},r);let n=r.url;n=n.replace(/\/+$/,"");const a={url:`${n}/${e.replace(/\/+/g,"/")}`,gzip:!0,data:o,headers:{}};if(r.legacy_form){const e=[],s=t({json:JSON.stringify(o)},o);Object.keys(s).sort().forEach(t=>{e.push(`${t}=${escape(s[t])}`)}),a.data=e.join("&"),a.headers["Content-Type"]="application/x-www-form-urlencoded"}x.headers(a,r);const{data:c}=a;let l;delete a.data;try{i.debug(`POST ${a.url}`),l=await w.post(a.url,c,a)}catch(h){return Promise.reject(h)}return r.handler?r.handler(l):s(l,r)},put:async(e,o,r,i)=>{const{log:n}=t({log:{debug:()=>{}}},i);let a=i.url;a=a.replace(/\/+$/,"");const c={url:`${a}/${e.replace(/\/+/g,"/")}/${o}`,gzip:!0,data:r,headers:{}};if(i.legacy_form){const e=[],s=t({json:JSON.stringify(r)},r);Object.keys(s).sort().forEach(t=>{e.push(`${t}=${escape(s[t])}`)}),c.data=e.join("&"),c.headers["Content-Type"]="application/x-www-form-urlencoded"}x.headers(c,i);const{data:l}=c;let h;delete c.data;try{n.debug(`PUT ${c.url}`),h=await w.put(c.url,l,c)}catch(u){return Promise.reject(u)}return s(h,i)},convertResponseToObject(t){if("object"===typeof t)return t;try{return JSON.parse(t)}catch(e){throw new Error(`exception parsing chain JSON ${String(e)}`)}}}}();class W{constructor(t){W.prototype.__init.call(this),W.prototype.__init2.call(this),W.prototype.__init3.call(this),W.prototype.__init4.call(this),W.prototype.__init5.call(this),W.prototype.__init6.call(this),W.prototype.__init7.call(this),W.prototype.__init8.call(this),W.prototype.__init9.call(this),W.prototype.__init10.call(this),W.prototype.__init11.call(this),W.prototype.__init12.call(this),W.prototype.__init13.call(this),W.prototype.__init14.call(this),W.prototype.__init15.call(this),W.prototype.__init16.call(this),W.prototype.__init17.call(this),W.prototype.__init18.call(this),this.options=e({agent_version:x.version,local:!1,url:I,user_agent:"EPI2ME API",signing:!0},t),this.options.url=this.options.url.replace(/:\/\//,"://graphql."),this.options.url=this.options.url.replace(/\/$/,""),this.log=this.options.log,this.client=j}__init(){this.createContext=e=>{const{apikey:s,apisecret:o,url:r}=this.options;return t({apikey:s,apisecret:o,url:r},e)}}__init2(){this.query=t=>({context:e={},variables:s={},options:o={}}={})=>{const r=this.createContext(e);let i;return i="string"===typeof t?c`
        ${t}
      `:"function"===typeof t?c`
        ${t(b)}
      `:t,this.client.query({query:i,variables:s,...o,context:r})}}__init3(){this.mutate=t=>({context:e={},variables:s={},options:o={}}={})=>{const r=this.createContext(e);let i;return i="string"===typeof t?c`
        ${t}
      `:t,this.client.mutate({mutation:i,variables:s,...o,context:r})}}__init4(){this.resetCache=()=>{this.client.resetStore()}}__init5(){this.workflows=this.query(c`
    query allWorkflows($page: Int, $pageSize: Int, $isActive: Int, $orderBy: String, $region: String) {
      allWorkflows(page: $page, pageSize: $pageSize, isActive: $isActive, orderBy: $orderBy, region: $region) {
        ${b}
        results {
          ${"\nidWorkflow\nname\ndescription\nsummary\nrev\n"}
        }
      }
    }
  `)}__init6(){this.workflowPages=async t=>{let e=t,s=await this.workflows({variables:{page:e}});const o=async t=>(e=t,s=await this.workflows({variables:{page:e}}),s);return{data:s,next:()=>o(e+1),previous:()=>o(e-1),first:()=>o(1),last:()=>o(0)}}}__init7(){this.workflow=this.query(c`
    query workflow($idWorkflow: ID!) {
      workflow(idWorkflow: $idWorkflow) {
        ${"\nidWorkflow\nname\ndescription\nsummary\nrev\n"}
      }
    }
   `)}__init8(){this.workflowInstances=this.query(c`
  query allWorkflowInstances($page: Int, $pageSize: Int, $shared: Boolean, $idUser: ID, $orderBy: String) {
    allWorkflowInstances(page: $page, pageSize: $pageSize, shared: $shared, idUser: $idUser, orderBy: $orderBy) {
      ${b}
      results {
        ${v}
      }
    }
  }
   `)}__init9(){this.workflowInstance=this.query(c`
      query workflowInstance($idWorkflowInstance: ID!) {
        workflowInstance(idWorkflowInstance: $idWorkflowInstance) {
          ${v}
        }
      }
   `)}__init10(){this.startWorkflow=this.mutate(c`
    mutation startWorkflow(
      $idWorkflow: ID!
      $computeAccountId: ID!
      $storageAccountId: ID
      $isConsentedHuman: Boolean = false
      $idDataset: ID
      $storeResults: Boolean = false
      $userDefined: GenericScalar
      $instanceAttributes: [GenericScalar]
      $region: String
    ) {
      startData: startWorkflowInstance(
        idWorkflow: $idWorkflow
        computeAccountId: $computeAccountId
        storageAccountId: $storageAccountId
        isConsentedHuman: $isConsentedHuman
        idDataset: $idDataset
        storeResults: $storeResults
        userDefined: $userDefined
        instanceAttributes: $instanceAttributes
        region: $region
      ) {
        bucket
        idUser
        remoteAddr
        instance {
          idWorkflowInstance
          chain
          keyId
          outputqueue
          mappedTelemetry
          workflowImage {
            inputqueue
            workflow {
              idWorkflow
            }
            region {
              name
            }
          }
        }
      }
    }
  `)}__init11(){this.stopWorkflow=this.mutate(c`
    mutation stopWorkflowInstance($idWorkflowInstance: ID!) {
      stopData: stopWorkflowInstance(idWorkflowInstance: $idWorkflowInstance) {
        success
        message
      }
    }
  `)}__init12(){this.instanceToken=this.mutate(c`
    mutation getInstanceToken($idWorkflowInstance: ID!) {
      token: getInstanceToken(idWorkflowInstance: $idWorkflowInstance) {
        id_workflow_instance: idWorkflowInstance
        accessKeyId
        secretAccessKey
        sessionToken
        expiration
        region
      }
    }
  `)}__init13(){this.user=this.query(c`
    query user {
      me {
        username
        realname
        useraccountSet {
          idUserAccount
        }
      }
    }
  `)}__init14(){this.updateUser=this.mutate(c`
    mutation updateUser($idRegionPreferred: ID!) {
      updateUser(idRegionPreferred: $idRegionPreferred) {
        idRegionPreferred
      }
    }
  `)}__init15(){this.register=this.mutate(c`
    mutation registerToken($code: String!, $description: String) {
      registerToken(code: $code, description: $description) {
        apikey
        apisecret
        description
      }
    }
  `)}__init16(){this.status=this.query(c`
    query status {
      status {
        portalVersion
        remoteAddr
        serverTime
        minimumAgent
        dbVersion
      }
    }
  `)}__init17(){this.healthCheck=()=>x.get("/status",{...this.options,log:{debug:()=>{}}})}__init18(){this.regions=this.query(c`
    query regions {
      regions {
        idRegion
        description
        name
      }
    }
  `)}}const O=(t,e)=>{const s=["","K","M","G","T","P","E","Z"];let o=e||0,r=t||0;return r>=1e3?(r/=1e3,o+=1,o>=s.length?"???":O(r,o)):0===o?`${r}${s[o]}`:`${r.toFixed(1)}${s[o]}`};class A{constructor(t){this.options=e({agent_version:x.version,local:!1,url:I,user_agent:"EPI2ME API",signing:!0},t),this.log=this.options.log,this.cachedResponses={}}async list(t){const e=t.match(/^[a-z_]+/i)[0];return x.get(t,this.options).then(t=>t[`${e}s`])}async read(t,e){return x.get(`${t}/${e}`,this.options)}async user(){return this.options.local?{accounts:[{id_user_account:"none",number:"NONE",name:"None"}]}:x.get("user",this.options)}async status(){return x.get("status",this.options)}async jwt(){return x.post("authenticate",{},t({handler:t=>t.headers["x-epi2me-jwt"]?Promise.resolve(t.headers["x-epi2me-jwt"]):Promise.reject(new Error("failed to fetch JWT"))},this.options))}async instanceToken(s,o){return x.post("token",t(o,{id_workflow_instance:s}),e({},this.options,{legacy_form:!0}))}async installToken(t){return x.post("token/install",{id_workflow:t},e({},this.options,{legacy_form:!0}))}async attributes(){return this.list("attribute")}async workflows(){return this.list("workflow")}async amiImages(){if(this.options.local)throw new Error("amiImages unsupported in local mode");return this.list("ami_image")}async amiImage(t,e){let s,o,r;if(t&&e instanceof Object?(s=t,o=e,r="update"):t instanceof Object&&!e?(o=t,r="create"):(r="read",s=t),this.options.local)throw new Error("ami_image unsupported in local mode");if("update"===r)return x.put("ami_image",s,o,this.options);if("create"===r)return x.post("ami_image",o,this.options);if(!s)throw new Error("no id_ami_image specified");return this.read("ami_image",s)}async workflow(e,o,r){let i,n,a,c;if(e&&o&&r instanceof Function?(i=e,n=o,a=r,c="update"):e&&o instanceof Object&&!(o instanceof Function)?(i=e,n=o,c="update"):e instanceof Object&&o instanceof Function?(n=e,a=o,c="create"):e instanceof Object&&!o?(n=e,c="create"):(c="read",i=e,a=o instanceof Function?o:null),"update"===c)try{const t=await x.put("workflow",i,n,this.options);return a?a(null,t):Promise.resolve(t)}catch(p){return a?a(p):Promise.reject(p)}if("create"===c)try{const t=await x.post("workflow",n,this.options);return a?a(null,t):Promise.resolve(t)}catch(p){return a?a(p):Promise.reject(p)}if(!i){const t=new Error("no workflow id specified");return a?a(t):Promise.reject(t)}const l={};try{const e=await this.read("workflow",i);if(e.error)throw new Error(e.error);t(l,e)}catch(p){return this.log.error(`${i}: error fetching workflow ${String(p)}`),a?a(p):Promise.reject(p)}t(l,{params:{}});try{const e=await x.get(`workflow/config/${i}`,this.options);if(e.error)throw new Error(e.error);t(l,e)}catch(p){return this.log.error(`${i}: error fetching workflow config ${String(p)}`),a?a(p):Promise.reject(p)}const h=s(l.params,{widget:"ajax_dropdown"}),u=[...h.map((t,e)=>{const s=h[e];return new Promise((t,e)=>{const o=s.values.source.replace("{{EPI2ME_HOST}}","").replace(/&?apikey=\{\{EPI2ME_API_KEY\}\}/,"");x.get(o,this.options).then(e=>{const o=e[s.values.data_root];return o&&(s.values=o.map(t=>({label:t[s.values.items.label_key],value:t[s.values.items.value_key]}))),t()}).catch(t=>(this.log.error(`failed to fetch ${o}`),e(t)))})})];try{return await Promise.all(u),a?a(null,l):Promise.resolve(l)}catch(p){return this.log.error(`${i}: error fetching config and parameters ${String(p)}`),a?a(p):Promise.reject(p)}}async startWorkflow(t){return x.post("workflow_instance",t,e({},this.options,{legacy_form:!0}))}async stopWorkflow(t){return x.put("workflow_instance/stop",t,null,e({},this.options,{legacy_form:!0}))}async workflowInstances(t){return t&&t.run_id?x.get(`workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=${t.run_id};`,this.options).then(t=>t.data.map(t=>({id_workflow_instance:t.id_ins,id_workflow:t.id_flo,run_id:t.run_id,description:t.desc,rev:t.rev}))):this.list("workflow_instance")}async workflowInstance(t){return this.read("workflow_instance",t)}async workflowConfig(t){return x.get(`workflow/config/${t}`,this.options)}async register(t,s){return x.put("reg",t,{description:s||`${$.userInfo().username}@${$.hostname()}`},e({},this.options,{signing:!1}))}async datasets(t){let e=t;return e||(e={}),e.show||(e.show="mine"),this.list(`dataset?show=${e.show}`)}async dataset(t){return this.options.local?this.datasets().then(e=>e.find(e=>e.id_dataset===t)):this.read("dataset",t)}async fetchContent(t){const s=e({},this.options,{skip_url_mangle:!0,headers:{"Content-Type":""}});let o;try{if(o=(await x.head(t,s)).headers.etag,o&&this.cachedResponses[t]&&this.cachedResponses[t].etag===o)return this.cachedResponses[t].response}catch(i){this.log.warn(`Failed to HEAD request ${t}: ${String(i)}`)}const r=await x.get(t,s);return o&&(this.cachedResponses[t]={etag:o,response:r}),r}}class D{constructor(e,s){this.debounces={},this.debounceWindow=t({debounceWindow:2e3},s).debounceWindow,this.log=t({log:{debug:()=>{}}},s).log,e.jwt().then(t=>{this.socket=_(s.url,{transportOptions:{polling:{extraHeaders:{Cookie:`x-epi2me-jwt=${t}`}}}}),this.socket.on("connect",()=>{this.log.debug("socket ready")})}).catch(t=>{this.log.error("socket connection failed - JWT authentication error")})}debounce(e,s){const o=t(e)._uuid;if(o){if(this.debounces[o])return;this.debounces[o]=1,setTimeout(()=>{delete this.debounces[o]},this.debounceWindow)}s&&s(e)}watch(t,e){if(!this.socket)return this.log.debug(`socket not ready. requeueing watch on ${t}`),void setTimeout(()=>{this.watch(t,e)},1e3);this.socket.on(t,t=>this.debounce(t,e))}emit(t,e){if(!this.socket)return this.log.debug(`socket not ready. requeueing emit on ${t}`),void setTimeout(()=>{this.emit(t,e)},1e3);this.log.debug(`socket emit ${t} ${JSON.stringify(e)}`),this.socket.emit(t,e)}}class R{constructor(e){let s;if(s="string"===typeof e||"object"===typeof e&&e.constructor===String?JSON.parse(e):e||{},s.endpoint&&(s.url=s.endpoint,delete s.endpoint),s.log){if(!o([s.log.info,s.log.warn,s.log.error,s.log.debug,s.log.json],r))throw new Error("expected log object to have error, debug, info, warn and json methods");this.log=s.log}else this.log={info:t=>{console.info(`[${(new Date).toISOString()}] INFO: ${t}`)},debug:t=>{console.debug(`[${(new Date).toISOString()}] DEBUG: ${t}`)},warn:t=>{console.warn(`[${(new Date).toISOString()}] WARN: ${t}`)},error:t=>{console.error(`[${(new Date).toISOString()}] ERROR: ${t}`)},json:t=>{console.log(JSON.stringify(t))}};this.stopped=!0,this.uploadState$=new n(!1),this.analyseState$=new n(!1),this.reportState$=new n(!1),this.instanceTelemetry$=new n(null),this.experimentalWorkerStatus$=new n(null),this.runningStates$=a(this.uploadState$,this.analyseState$,this.reportState$),this.states={upload:{filesCount:0,success:{files:0,bytes:0,reads:0},types:{},niceTypes:"",progress:{bytes:0,total:0}},download:{progress:{},success:{files:0,reads:0,bytes:0},fail:0,types:{},niceTypes:""},warnings:[]},this.liveStates$=new n(this.states),this.config={options:i(s,S),instance:{id_workflow_instance:s.id_workflow_instance,inputQueueName:null,outputQueueName:null,outputQueueURL:null,discoverQueueCache:{},bucket:null,bucketFolder:null,remote_addr:null,chain:null,key_id:null}},this.config.instance.awssettings={region:this.config.options.region},this.REST=new A(t({log:this.log},this.config.options)),this.graphQL=new W(t({log:this.log},this.config.options)),this.timers={downloadCheckInterval:null,stateCheckInterval:null,fileCheckInterval:null,transferTimeouts:{},visibilityIntervals:{},summaryTelemetryInterval:null}}async socket(){if(this.mySocket)return this.mySocket;this.mySocket=new D(this.REST,t({log:this.log},this.config.options));const{id_workflow_instance:e}=this.config.instance;return e&&this.mySocket.watch(`workflow_instance:state:${e}`,t=>{const{instance:e}=this.config;if(e){const{summaryTelemetry:s}=e,o=Object.entries(e.chain.components).sort((t,e)=>t[0]-e[0]).reduce((e,o)=>{const[r,i]=o;if(!t[r])return e;const n=+r,a=n&&Object.keys(s[i.wid])[0]||"ROOT",[c,l,h]=t[r].split(",").map(t=>Math.max(0,+t));return[...e,{running:c,complete:l,error:h,step:n,name:a}]},[]);this.experimentalWorkerStatus$.next(o)}}),this.mySocket}async realtimeFeedback(t,e){(await this.socket()).emit(t,e)}stopTimer(t){this.timers[t]&&(this.log.debug(`clearing ${t} interval`),clearInterval(this.timers[t]),this.timers[t]=null)}async stopAnalysis(){this.stopUpload(),this.stopped=!0;const{id_workflow_instance:t}=this.config.instance;if(t){try{this.config.options.graphQL?await this.graphQL.stopWorkflow({variables:{idWorkflowInstance:t}}):await this.REST.stopWorkflow(t),this.analyseState$.next(!1)}catch(e){return this.log.error(`Error stopping instance: ${String(e)}`),Promise.reject(e)}this.log.info(`workflow instance ${t} stopped`)}return Promise.resolve()}async stopUpload(){this.log.debug("stopping watchers"),["stateCheckInterval","fileCheckInterval"].forEach(t=>this.stopTimer(t)),this.uploadState$.next(!1)}async stopEverything(){this.stopAnalysis(),Object.keys(this.timers.transferTimeouts).forEach(t=>{this.log.debug(`clearing transferTimeout for ${t}`),clearTimeout(this.timers.transferTimeouts[t]),delete this.timers.transferTimeouts[t]}),Object.keys(this.timers.visibilityIntervals).forEach(t=>{this.log.debug(`clearing visibilityInterval for ${t}`),clearInterval(this.timers.visibilityIntervals[t]),delete this.timers.visibilityIntervals[t]}),this.downloadWorkerPool&&(this.log.debug("clearing downloadWorkerPool"),await Promise.all(Object.values(this.downloadWorkerPool)),this.downloadWorkerPool=null),["summaryTelemetryInterval","downloadCheckInterval"].forEach(t=>this.stopTimer(t))}reportProgress(){const{upload:t,download:e}=this.states;this.log.json({progress:{download:e,upload:t}})}storeState(t,e,s,o){const r=o||{};this.states[t]||(this.states[t]={}),this.states[t][e]||(this.states[t][e]={}),"incr"===s?Object.keys(r).forEach(s=>{this.states[t][e][s]=this.states[t][e][s]?this.states[t][e][s]+parseInt(r[s],10):parseInt(r[s],10)}):Object.keys(r).forEach(s=>{this.states[t][e][s]=this.states[t][e][s]?this.states[t][e][s]-parseInt(r[s],10):-parseInt(r[s],10)});try{this.states[t].success.niceReads=O(this.states[t].success.reads)}catch(n){this.states[t].success.niceReads=0}try{this.states[t].progress.niceSize=O(this.states[t].success.bytes+this.states[t].progress.bytes||0)}catch(n){this.states[t].progress.niceSize=0}try{this.states[t].success.niceSize=O(this.states[t].success.bytes)}catch(n){this.states[t].success.niceSize=0}this.states[t].niceTypes=Object.keys(this.states[t].types||{}).sort().map(e=>`${this.states[t].types[e]} ${e}`).join(", ");const i=Date.now();(!this.stateReportTime||i-this.stateReportTime>2e3)&&(this.stateReportTime=i,this.reportProgress()),this.liveStates$.next({...this.states})}uploadState(t,e,s){return this.storeState("upload",t,e,s)}downloadState(t,e,s){return this.storeState("download",t,e,s)}url(){return this.config.options.url}apikey(){return this.config.options.apikey}attr(t,e){if(!(t in this.config.options))throw new Error(`config object does not contain property ${t}`);return e?(this.config.options[t]=e,this):this.config.options[t]}stats(t){return this.states[t]}}R.version=x.version,R.Profile=class{constructor(e){this.allProfileData={},this.defaultEndpoint=process.env.METRICHOR||S.url,e&&(this.allProfileData=t({profiles:{}},e)),this.allProfileData.endpoint&&(this.defaultEndpoint=this.allProfileData.endpoint)}profile(e){return e?t({endpoint:this.defaultEndpoint},t({profiles:{}},this.allProfileData).profiles[e]):{}}profiles(){return Object.keys(this.allProfileData.profiles||{})}},R.REST=A,R.utils=x;export default R;
