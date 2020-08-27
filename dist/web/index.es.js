/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2020
 */

import t from"graphql-tag";import{ApolloClient as e,ApolloLink as n,createHttpLink as o,execute as r,InMemoryCache as s}from"@apollo/client/core";import a,{Headers as i,Request as h}from"cross-fetch";const c="\npage\npages\nhasNext\nhasPrevious\ntotalCount\n",u="\nidWorkflowInstance\nstartDate\nworkflowImage{\n  workflow\n  {\n    rev\n    name\n  }\n}\n";var l="undefined"!==typeof globalThis?globalThis:"undefined"!==typeof window?window:"undefined"!==typeof global?global:"undefined"!==typeof self?self:{};function f(t,e,n){return t(n={path:e,exports:{},require:function(t,e){return function(){throw new Error("Dynamic requires are not currently supported by @rollup/plugin-commonjs")}((void 0===e||null===e)&&n.path)}},n.exports),n.exports}var p=f((function(t,e){!function(n){var o=e&&!e.nodeType&&e,r=t&&!t.nodeType&&t,s="object"==typeof l&&l;s.global!==s&&s.window!==s&&s.self!==s||(n=s);var a,i,h=2147483647,c=/^xn--/,u=/[^\x20-\x7E]/,f=/[\x2E\u3002\uFF0E\uFF61]/g,p={overflow:"Overflow: input needs wider integers to process","not-basic":"Illegal input >= 0x80 (not a basic code point)","invalid-input":"Invalid input"},d=Math.floor,m=String.fromCharCode;function g(t){throw RangeError(p[t])}function w(t,e){for(var n=t.length,o=[];n--;)o[n]=e(t[n]);return o}function y(t,e){var n=t.split("@"),o="";return n.length>1&&(o=n[0]+"@",t=n[1]),o+w((t=t.replace(f,".")).split("."),e).join(".")}function v(t){for(var e,n,o=[],r=0,s=t.length;r<s;)(e=t.charCodeAt(r++))>=55296&&e<=56319&&r<s?56320==(64512&(n=t.charCodeAt(r++)))?o.push(((1023&e)<<10)+(1023&n)+65536):(o.push(e),r--):o.push(e);return o}function k(t){return w(t,(function(t){var e="";return t>65535&&(e+=m((t-=65536)>>>10&1023|55296),t=56320|1023&t),e+=m(t)})).join("")}function b(t,e){return t+22+75*(t<26)-((0!=e)<<5)}function I(t,e,n){var o=0;for(t=n?d(t/700):t>>1,t+=d(t/e);t>455;o+=36)t=d(t/35);return d(o+36*t/(t+38))}function $(t){var e,n,o,r,s,a,i,c,u,l,f,p=[],m=t.length,w=0,y=128,v=72;for((n=t.lastIndexOf("-"))<0&&(n=0),o=0;o<n;++o)t.charCodeAt(o)>=128&&g("not-basic"),p.push(t.charCodeAt(o));for(r=n>0?n+1:0;r<m;){for(s=w,a=1,i=36;r>=m&&g("invalid-input"),((c=(f=t.charCodeAt(r++))-48<10?f-22:f-65<26?f-65:f-97<26?f-97:36)>=36||c>d((h-w)/a))&&g("overflow"),w+=c*a,!(c<(u=i<=v?1:i>=v+26?26:i-v));i+=36)a>d(h/(l=36-u))&&g("overflow"),a*=l;v=I(w-s,e=p.length+1,0==s),d(w/e)>h-y&&g("overflow"),y+=d(w/e),w%=e,p.splice(w++,0,y)}return k(p)}function j(t){var e,n,o,r,s,a,i,c,u,l,f,p,w,y,k,$=[];for(p=(t=v(t)).length,e=128,n=0,s=72,a=0;a<p;++a)(f=t[a])<128&&$.push(m(f));for(o=r=$.length,r&&$.push("-");o<p;){for(i=h,a=0;a<p;++a)(f=t[a])>=e&&f<i&&(i=f);for(i-e>d((h-n)/(w=o+1))&&g("overflow"),n+=(i-e)*w,e=i,a=0;a<p;++a)if((f=t[a])<e&&++n>h&&g("overflow"),f==e){for(c=n,u=36;!(c<(l=u<=s?1:u>=s+26?26:u-s));u+=36)k=c-l,y=36-l,$.push(m(b(l+k%y,0))),c=d(k/y);$.push(m(b(c,0))),s=I(n,w,o==r),n=0,++o}++n,++e}return $.join("")}if(a={version:"1.3.2",ucs2:{decode:v,encode:k},decode:$,encode:j,toASCII:function(t){return y(t,(function(t){return u.test(t)?"xn--"+j(t):t}))},toUnicode:function(t){return y(t,(function(t){return c.test(t)?$(t.slice(4).toLowerCase()):t}))}},o&&r)if(t.exports==o)r.exports=a;else for(i in a)a.hasOwnProperty(i)&&(o[i]=a[i]);else n.punycode=a}(l)}));function d(t,e){return Object.prototype.hasOwnProperty.call(t,e)}var m=function(t,e,n,o){e=e||"&",n=n||"=";var r={};if("string"!==typeof t||0===t.length)return r;var s=/\+/g;t=t.split(e);var a=1e3;o&&"number"===typeof o.maxKeys&&(a=o.maxKeys);var i=t.length;a>0&&i>a&&(i=a);for(var h=0;h<i;++h){var c,u,l,f,p=t[h].replace(s,"%20"),m=p.indexOf(n);m>=0?(c=p.substr(0,m),u=p.substr(m+1)):(c=p,u=""),l=decodeURIComponent(c),f=decodeURIComponent(u),d(r,l)?Array.isArray(r[l])?r[l].push(f):r[l]=[r[l],f]:r[l]=f}return r},g=function(t){switch(typeof t){case"string":return t;case"boolean":return t?"true":"false";case"number":return isFinite(t)?t:"";default:return""}},w=function(t,e,n,o){return e=e||"&",n=n||"=",null===t&&(t=void 0),"object"===typeof t?Object.keys(t).map((function(o){var r=encodeURIComponent(g(o))+n;return Array.isArray(t[o])?t[o].map((function(t){return r+encodeURIComponent(g(t))})).join(e):r+encodeURIComponent(g(t[o]))})).join(e):o?encodeURIComponent(g(o))+n+encodeURIComponent(g(t)):""},y=f((function(t,e){e.decode=e.parse=m,e.encode=e.stringify=w})),v=function(t,e){return R(t,!1,!0).resolve(e)};function k(){this.protocol=null,this.slashes=null,this.auth=null,this.host=null,this.port=null,this.hostname=null,this.hash=null,this.search=null,this.query=null,this.pathname=null,this.path=null,this.href=null}var b=/^([a-z0-9.+-]+:)/i,I=/:[0-9]*$/,$=["{","}","|","\\","^","`"].concat(["<",">",'"',"`"," ","\r","\n","\t"]),j=["'"].concat($),O=["%","/","?",";","#"].concat(j),A=["/","?","#"],q=/^[a-z0-9A-Z_-]{0,63}$/,C=/^([a-z0-9A-Z_-]{0,63})(.*)$/,x={javascript:!0,"javascript:":!0},W={javascript:!0,"javascript:":!0},_={http:!0,https:!0,ftp:!0,gopher:!0,file:!0,"http:":!0,"https:":!0,"ftp:":!0,"gopher:":!0,"file:":!0};function R(t,e,n){if(t&&S(t)&&t instanceof k)return t;var o=new k;return o.parse(t,e,n),o}function E(t){return"string"===typeof t}function S(t){return"object"===typeof t&&null!==t}function U(t){return null===t}k.prototype.parse=function(t,e,n){if(!E(t))throw new TypeError("Parameter 'url' must be a string, not "+typeof t);var o=t;o=o.trim();var r=b.exec(o);if(r){var s=(r=r[0]).toLowerCase();this.protocol=s,o=o.substr(r.length)}if(n||r||o.match(/^\/\/[^@\/]+@[^@\/]+/)){var a="//"===o.substr(0,2);!a||r&&W[r]||(o=o.substr(2),this.slashes=!0)}if(!W[r]&&(a||r&&!_[r])){for(var i,h,c=-1,u=0;u<A.length;u++){-1!==(l=o.indexOf(A[u]))&&(-1===c||l<c)&&(c=l)}-1!==(h=-1===c?o.lastIndexOf("@"):o.lastIndexOf("@",c))&&(i=o.slice(0,h),o=o.slice(h+1),this.auth=decodeURIComponent(i)),c=-1;for(u=0;u<O.length;u++){var l;-1!==(l=o.indexOf(O[u]))&&(-1===c||l<c)&&(c=l)}-1===c&&(c=o.length),this.host=o.slice(0,c),o=o.slice(c),this.parseHost(),this.hostname=this.hostname||"";var f="["===this.hostname[0]&&"]"===this.hostname[this.hostname.length-1];if(!f)for(var d=this.hostname.split(/\./),m=(u=0,d.length);u<m;u++){var g=d[u];if(g&&!g.match(q)){for(var w="",v=0,k=g.length;v<k;v++)g.charCodeAt(v)>127?w+="x":w+=g[v];if(!w.match(q)){var I=d.slice(0,u),$=d.slice(u+1),R=g.match(C);R&&(I.push(R[1]),$.unshift(R[2])),$.length&&(o="/"+$.join(".")+o),this.hostname=I.join(".");break}}}if(this.hostname.length>255?this.hostname="":this.hostname=this.hostname.toLowerCase(),!f){var S=this.hostname.split("."),U=[];for(u=0;u<S.length;++u){var D=S[u];U.push(D.match(/[^A-Za-z0-9_-]/)?"xn--"+p.encode(D):D)}this.hostname=U.join(".")}var T=this.port?":"+this.port:"",P=this.hostname||"";this.host=P+T,this.href+=this.host,f&&(this.hostname=this.hostname.substr(1,this.hostname.length-2),"/"!==o[0]&&(o="/"+o))}if(!x[s])for(u=0,m=j.length;u<m;u++){var N=j[u],z=encodeURIComponent(N);z===N&&(z=escape(N)),o=o.split(N).join(z)}var B=o.indexOf("#");-1!==B&&(this.hash=o.substr(B),o=o.slice(0,B));var H=o.indexOf("?");if(-1!==H?(this.search=o.substr(H),this.query=o.substr(H+1),e&&(this.query=y.parse(this.query)),o=o.slice(0,H)):e&&(this.search="",this.query={}),o&&(this.pathname=o),_[s]&&this.hostname&&!this.pathname&&(this.pathname="/"),this.pathname||this.search){T=this.pathname||"",D=this.search||"";this.path=T+D}return this.href=this.format(),this},k.prototype.format=function(){var t=this.auth||"";t&&(t=(t=encodeURIComponent(t)).replace(/%3A/i,":"),t+="@");var e=this.protocol||"",n=this.pathname||"",o=this.hash||"",r=!1,s="";this.host?r=t+this.host:this.hostname&&(r=t+(-1===this.hostname.indexOf(":")?this.hostname:"["+this.hostname+"]"),this.port&&(r+=":"+this.port)),this.query&&S(this.query)&&Object.keys(this.query).length&&(s=y.stringify(this.query));var a=this.search||s&&"?"+s||"";return e&&":"!==e.substr(-1)&&(e+=":"),this.slashes||(!e||_[e])&&!1!==r?(r="//"+(r||""),n&&"/"!==n.charAt(0)&&(n="/"+n)):r||(r=""),o&&"#"!==o.charAt(0)&&(o="#"+o),a&&"?"!==a.charAt(0)&&(a="?"+a),e+r+(n=n.replace(/[?#]/g,(function(t){return encodeURIComponent(t)})))+(a=a.replace("#","%23"))+o},k.prototype.resolve=function(t){return this.resolveObject(R(t,!1,!0)).format()},k.prototype.resolveObject=function(t){if(E(t)){var e=new k;e.parse(t,!1,!0),t=e}var n=new k;if(Object.keys(this).forEach((function(t){n[t]=this[t]}),this),n.hash=t.hash,""===t.href)return n.href=n.format(),n;if(t.slashes&&!t.protocol)return Object.keys(t).forEach((function(e){"protocol"!==e&&(n[e]=t[e])})),_[n.protocol]&&n.hostname&&!n.pathname&&(n.path=n.pathname="/"),n.href=n.format(),n;if(t.protocol&&t.protocol!==n.protocol){if(!_[t.protocol])return Object.keys(t).forEach((function(e){n[e]=t[e]})),n.href=n.format(),n;if(n.protocol=t.protocol,t.host||W[t.protocol])n.pathname=t.pathname;else{for(var o=(t.pathname||"").split("/");o.length&&!(t.host=o.shift()););t.host||(t.host=""),t.hostname||(t.hostname=""),""!==o[0]&&o.unshift(""),o.length<2&&o.unshift(""),n.pathname=o.join("/")}if(n.search=t.search,n.query=t.query,n.host=t.host||"",n.auth=t.auth,n.hostname=t.hostname||t.host,n.port=t.port,n.pathname||n.search){var r=n.pathname||"",s=n.search||"";n.path=r+s}return n.slashes=n.slashes||t.slashes,n.href=n.format(),n}var a=n.pathname&&"/"===n.pathname.charAt(0),i=t.host||t.pathname&&"/"===t.pathname.charAt(0),h=i||a||n.host&&t.pathname,c=h,u=n.pathname&&n.pathname.split("/")||[],l=(o=t.pathname&&t.pathname.split("/")||[],n.protocol&&!_[n.protocol]);if(l&&(n.hostname="",n.port=null,n.host&&(""===u[0]?u[0]=n.host:u.unshift(n.host)),n.host="",t.protocol&&(t.hostname=null,t.port=null,t.host&&(""===o[0]?o[0]=t.host:o.unshift(t.host)),t.host=null),h=h&&(""===o[0]||""===u[0])),i)n.host=t.host||""===t.host?t.host:n.host,n.hostname=t.hostname||""===t.hostname?t.hostname:n.hostname,n.search=t.search,n.query=t.query,u=o;else if(o.length)u||(u=[]),u.pop(),u=u.concat(o),n.search=t.search,n.query=t.query;else if(null!=t.search){if(l)n.hostname=n.host=u.shift(),(g=!!(n.host&&n.host.indexOf("@")>0)&&n.host.split("@"))&&(n.auth=g.shift(),n.host=n.hostname=g.shift());return n.search=t.search,n.query=t.query,U(n.pathname)&&U(n.search)||(n.path=(n.pathname?n.pathname:"")+(n.search?n.search:"")),n.href=n.format(),n}if(!u.length)return n.pathname=null,n.search?n.path="/"+n.search:n.path=null,n.href=n.format(),n;for(var f=u.slice(-1)[0],p=(n.host||t.host)&&("."===f||".."===f)||""===f,d=0,m=u.length;m>=0;m--)"."==(f=u[m])?u.splice(m,1):".."===f?(u.splice(m,1),d++):d&&(u.splice(m,1),d--);if(!h&&!c)for(;d--;d)u.unshift("..");!h||""===u[0]||u[0]&&"/"===u[0].charAt(0)||u.unshift(""),p&&"/"!==u.join("/").substr(-1)&&u.push("");var g,w=""===u[0]||u[0]&&"/"===u[0].charAt(0);l&&(n.hostname=n.host=w?"":u.length?u.shift():"",(g=!!(n.host&&n.host.indexOf("@")>0)&&n.host.split("@"))&&(n.auth=g.shift(),n.host=n.hostname=g.shift()));return(h=h||n.host&&u.length)&&!w&&u.unshift(""),u.length?n.pathname=u.join("/"):(n.pathname=null,n.path=null),U(n.pathname)&&U(n.search)||(n.path=(n.pathname?n.pathname:"")+(n.search?n.search:"")),n.auth=t.auth||n.auth,n.slashes=n.slashes||t.slashes,n.href=n.format(),n},k.prototype.parseHost=function(){var t=this.host,e=I.exec(t);e&&(":"!==(e=e[0])&&(this.port=e.substr(1)),t=t.substr(0,t.length-e.length)),t&&(this.hostname=t)};function D(t){return"object"===typeof t&&!1===Array.isArray(t)}function T(t,e){if(function(t){return"boolean"===typeof t}(t))return t;if(function(t){return null===t||"undefined"===typeof t}(t)&&"undefined"!==typeof e)return e;throw new Error(`Unable to cast ${typeof t} to Boolean`)}async function P(t){const e=await async function(t){try{return await t.json()}catch(e){return}}(t);if(D(e)&&"string"===typeof e.error)throw new Error(e.error);return e}function N(t={}){var e,n;const o=new i;if(o.set("Accept","application/json"),o.set("Content-Type","application/json"),o.set("X-EPI2ME-Client",null!==(e=t.user_agent)&&void 0!==e?e:"api"),o.set("X-EPI2ME-Version",null!==(n=t.agent_version)&&void 0!==n?n:"3.0.1839"),t.headers)for(const[r,s]of Object.entries(t.headers))o.set(r,s);return o}async function z(t,e){var n;const o=N(e),r=new URL(t,e.base_url),s={headers:o,method:null!==(n=e.method)&&void 0!==n?n:"get",agent:e.agent,body:e.body};let i=new h(r.toString(),s);e.mutate_request&&(i=await e.mutate_request(i)),e.log&&e.log(i);let c=await a(i);return await async function(t){if(!t.ok){if(504===t.status)throw new Error("Please check your network connection and try again");throw await P(t),new Error("Network error "+t.statusText)}}(c),e.mutate_response&&(c=await e.mutate_response(c)),c}function B(t,e){if(D(t)){if("json"===e)return JSON.stringify(t);const n=new URLSearchParams;for(const e of Object.keys(t))n.set(e,String(t[e]));return n.set("json",JSON.stringify(t)),n.sort(),n}return t}const H={head:(t,e={})=>z(t,Object.assign(Object.assign({},e),{method:"head"})),get:async(t,e={})=>P(await z(t,Object.assign(Object.assign({},e),{method:"get"}))),async post(t,e,n={}){var o;const r=B(e,null!==(o=n.encode_method)&&void 0!==o?o:"json");return P(await z(t,Object.assign(Object.assign({},n),{body:r,method:"post"})))},async put(t,e,n={}){var o;const r=B(e,null!==(o=n.encode_method)&&void 0!==o?o:"json");return P(await z(t,Object.assign(Object.assign({},n),{body:r,method:"put"})))}},L=(...t)=>{};class F{constructor(h){this.initClient=()=>function(t){const a=new n(e=>{const n=t(),{url:s}=e.getContext(),a=o({uri:v(s,"/graphql"),fetch:n});return r(a,e)}),i=new s;return new e({link:a,cache:i})}(()=>(t,e={})=>{const n=N({headers:new i(e.headers)});return n.set("Authorization","Bearer "+this.options.jwt),e.headers=n,a(t,e)}),this.createContext=t=>{const{url:e,apikey:n,apisecret:o}=this.options;return Object.assign({apikey:n,apisecret:o,url:e},t)},this.resetCache=()=>{this.client.resetStore()},this.workflows=this.query(t`
    query allWorkflows($page: Int, $pageSize: Int, $isActive: Int, $orderBy: String, $region: String) {
      allWorkflows(page: $page, pageSize: $pageSize, isActive: $isActive, orderBy: $orderBy, region: $region) {
        ${c}
        results {
          ${"\nidWorkflow\nname\ndescription\nsummary\nrev\n"}
        }
      }
    }
  `),this.workflowPages=async t=>{let e=t,n=await this.workflows({variables:{page:e}});const o=async t=>(e=t,n=await this.workflows({variables:{page:e}}),n);return{data:n,next:()=>o(e+1),previous:()=>o(e-1),first:()=>o(1),last:()=>o(0)}},this.workflow=this.query(t`
    query workflow($idWorkflow: ID!) {
      workflow(idWorkflow: $idWorkflow) {
        ${"\nidWorkflow\nname\ndescription\nsummary\nrev\n"}
      }
    }
   `),this.workflowInstances=this.query(t`
  query allWorkflowInstances($page: Int, $pageSize: Int, $shared: Boolean, $idUser: ID, $orderBy: String) {
    allWorkflowInstances(page: $page, pageSize: $pageSize, shared: $shared, idUser: $idUser, orderBy: $orderBy) {
      ${c}
      results {
        ${u}
      }
    }
  }
   `),this.workflowInstance=this.query(t`
      query workflowInstance($idWorkflowInstance: ID!) {
        workflowInstance(idWorkflowInstance: $idWorkflowInstance) {
          ${u}
        }
      }
   `),this.startWorkflow=this.mutate(t`
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
  `),this.stopWorkflow=this.mutate(t`
    mutation stopWorkflowInstance($idWorkflowInstance: ID!) {
      stopData: stopWorkflowInstance(idWorkflowInstance: $idWorkflowInstance) {
        success
        message
      }
    }
  `),this.instanceToken=this.mutate(t`
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
  `),this.user=this.query(t`
    query user {
      me {
        username
        realname
        useraccountSet {
          idUserAccount
        }
      }
    }
  `),this.updateUser=this.mutate(t`
    mutation updateUser($idRegionPreferred: ID!) {
      updateUser(idRegionPreferred: $idRegionPreferred) {
        idRegionPreferred
      }
    }
  `),this.register=this.mutate(t`
    mutation registerToken($code: String!, $description: String) {
      registerToken(code: $code, description: $description) {
        apikey
        apisecret
        description
      }
    }
  `),this.status=this.query(t`
    query status {
      status {
        portalVersion
        remoteAddr
        serverTime
        minimumAgent
        dbVersion
      }
    }
  `),this.regions=this.query(t`
    query regions {
      regions {
        idRegion
        description
        name
      }
    }
  `);let l=h.url;l=l.replace(/:\/\//,"://graphql."),l=l.replace(/\/$/,"");const{apikey:f,apisecret:p,jwt:d,log:m,local:g,signing:w}=h;this.options={url:l,base_url:l,agent_version:h.agent_version,local:g,user_agent:h.user_agent,signing:w,apikey:f,apisecret:p,jwt:d},this.log=m,this.client=this.initClient()}query(e){return n=>{var o,r,s;const a=null!==(o=null===n||void 0===n?void 0:n.context)&&void 0!==o?o:{},i=null!==(r=null===n||void 0===n?void 0:n.variables)&&void 0!==r?r:{},h=null!==(s=null===n||void 0===n?void 0:n.options)&&void 0!==s?s:{},u=this.createContext(a);let l;return l="string"===typeof e?t`
          ${e}
        `:"function"===typeof e?t`
          ${e(c)}
        `:e,this.client.query(Object.assign(Object.assign({query:l,variables:i},h),{context:u}))}}mutate(e){return n=>{var o,r,s;const a=null!==(o=null===n||void 0===n?void 0:n.context)&&void 0!==o?o:{},i=null!==(r=null===n||void 0===n?void 0:n.variables)&&void 0!==r?r:{},h=null!==(s=null===n||void 0===n?void 0:n.options)&&void 0!==s?s:{},c=this.createContext(a);let u;return u="string"===typeof e?t`
          ${e}
        `:e,this.client.mutate(Object.assign(Object.assign({mutation:u,variables:i},h),{context:c}))}}async convertONTJWT(t,e={token_type:"jwt"}){if("jwt"!==e.token_type&&!e.description)throw new Error("Description required for signature requests");return H.post("convert-ont",e,Object.assign(Object.assign({},this.options),{log:L,headers:{"X-ONT-JWT":t}}))}async healthCheck(){return{status:T((await H.get("/status",Object.assign(Object.assign({},this.options),{log:L}))).status)}}}F.NETWORK_ONLY="network-only",F.CACHE_FIRST="cache-first",F.CACHE_AND_NETWORK="cache-and-network",F.CACHE_ONLY="cache-only",F.NO_CACHE="no-cache";export{F as GraphQL};
