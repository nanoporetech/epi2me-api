/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2020
 */

"use strict";function t(t){return t&&"object"===typeof t&&"default"in t?t.default:t}Object.defineProperty(exports,"__esModule",{value:!0});var e=t(require("graphql-tag")),n=require("@apollo/client/core"),o=require("cross-fetch"),r=t(o);const s="\npage\npages\nhasNext\nhasPrevious\ntotalCount\n",a="\nidWorkflowInstance\nstartDate\nworkflowImage{\n  workflow\n  {\n    rev\n    name\n  }\n}\n";var i="undefined"!==typeof globalThis?globalThis:"undefined"!==typeof window?window:"undefined"!==typeof global?global:"undefined"!==typeof self?self:{};function h(t,e,n){return t(n={path:e,exports:{},require:function(t,e){return function(){throw new Error("Dynamic requires are not currently supported by @rollup/plugin-commonjs")}((void 0===e||null===e)&&n.path)}},n.exports),n.exports}var c=h((function(t,e){!function(n){var o=e&&!e.nodeType&&e,r=t&&!t.nodeType&&t,s="object"==typeof i&&i;s.global!==s&&s.window!==s&&s.self!==s||(n=s);var a,h,c=2147483647,u=/^xn--/,l=/[^\x20-\x7E]/,f=/[\x2E\u3002\uFF0E\uFF61]/g,p={overflow:"Overflow: input needs wider integers to process","not-basic":"Illegal input >= 0x80 (not a basic code point)","invalid-input":"Invalid input"},d=Math.floor,m=String.fromCharCode;function g(t){throw RangeError(p[t])}function w(t,e){for(var n=t.length,o=[];n--;)o[n]=e(t[n]);return o}function y(t,e){var n=t.split("@"),o="";return n.length>1&&(o=n[0]+"@",t=n[1]),o+w((t=t.replace(f,".")).split("."),e).join(".")}function v(t){for(var e,n,o=[],r=0,s=t.length;r<s;)(e=t.charCodeAt(r++))>=55296&&e<=56319&&r<s?56320==(64512&(n=t.charCodeAt(r++)))?o.push(((1023&e)<<10)+(1023&n)+65536):(o.push(e),r--):o.push(e);return o}function b(t){return w(t,(function(t){var e="";return t>65535&&(e+=m((t-=65536)>>>10&1023|55296),t=56320|1023&t),e+=m(t)})).join("")}function k(t,e){return t+22+75*(t<26)-((0!=e)<<5)}function I(t,e,n){var o=0;for(t=n?d(t/700):t>>1,t+=d(t/e);t>455;o+=36)t=d(t/35);return d(o+36*t/(t+38))}function $(t){var e,n,o,r,s,a,i,h,u,l,f,p=[],m=t.length,w=0,y=128,v=72;for((n=t.lastIndexOf("-"))<0&&(n=0),o=0;o<n;++o)t.charCodeAt(o)>=128&&g("not-basic"),p.push(t.charCodeAt(o));for(r=n>0?n+1:0;r<m;){for(s=w,a=1,i=36;r>=m&&g("invalid-input"),((h=(f=t.charCodeAt(r++))-48<10?f-22:f-65<26?f-65:f-97<26?f-97:36)>=36||h>d((c-w)/a))&&g("overflow"),w+=h*a,!(h<(u=i<=v?1:i>=v+26?26:i-v));i+=36)a>d(c/(l=36-u))&&g("overflow"),a*=l;v=I(w-s,e=p.length+1,0==s),d(w/e)>c-y&&g("overflow"),y+=d(w/e),w%=e,p.splice(w++,0,y)}return b(p)}function j(t){var e,n,o,r,s,a,i,h,u,l,f,p,w,y,b,$=[];for(p=(t=v(t)).length,e=128,n=0,s=72,a=0;a<p;++a)(f=t[a])<128&&$.push(m(f));for(o=r=$.length,r&&$.push("-");o<p;){for(i=c,a=0;a<p;++a)(f=t[a])>=e&&f<i&&(i=f);for(i-e>d((c-n)/(w=o+1))&&g("overflow"),n+=(i-e)*w,e=i,a=0;a<p;++a)if((f=t[a])<e&&++n>c&&g("overflow"),f==e){for(h=n,u=36;!(h<(l=u<=s?1:u>=s+26?26:u-s));u+=36)b=h-l,y=36-l,$.push(m(k(l+b%y,0))),h=d(b/y);$.push(m(k(h,0))),s=I(n,w,o==r),n=0,++o}++n,++e}return $.join("")}if(a={version:"1.3.2",ucs2:{decode:v,encode:b},decode:$,encode:j,toASCII:function(t){return y(t,(function(t){return l.test(t)?"xn--"+j(t):t}))},toUnicode:function(t){return y(t,(function(t){return u.test(t)?$(t.slice(4).toLowerCase()):t}))}},o&&r)if(t.exports==o)r.exports=a;else for(h in a)a.hasOwnProperty(h)&&(o[h]=a[h]);else n.punycode=a}(i)}));function u(t,e){return Object.prototype.hasOwnProperty.call(t,e)}var l=function(t,e,n,o){e=e||"&",n=n||"=";var r={};if("string"!==typeof t||0===t.length)return r;var s=/\+/g;t=t.split(e);var a=1e3;o&&"number"===typeof o.maxKeys&&(a=o.maxKeys);var i=t.length;a>0&&i>a&&(i=a);for(var h=0;h<i;++h){var c,l,f,p,d=t[h].replace(s,"%20"),m=d.indexOf(n);m>=0?(c=d.substr(0,m),l=d.substr(m+1)):(c=d,l=""),f=decodeURIComponent(c),p=decodeURIComponent(l),u(r,f)?Array.isArray(r[f])?r[f].push(p):r[f]=[r[f],p]:r[f]=p}return r},f=function(t){switch(typeof t){case"string":return t;case"boolean":return t?"true":"false";case"number":return isFinite(t)?t:"";default:return""}},p=function(t,e,n,o){return e=e||"&",n=n||"=",null===t&&(t=void 0),"object"===typeof t?Object.keys(t).map((function(o){var r=encodeURIComponent(f(o))+n;return Array.isArray(t[o])?t[o].map((function(t){return r+encodeURIComponent(f(t))})).join(e):r+encodeURIComponent(f(t[o]))})).join(e):o?encodeURIComponent(f(o))+n+encodeURIComponent(f(t)):""},d=h((function(t,e){e.decode=e.parse=l,e.encode=e.stringify=p})),m=function(t,e){return C(t,!1,!0).resolve(e)};function g(){this.protocol=null,this.slashes=null,this.auth=null,this.host=null,this.port=null,this.hostname=null,this.hash=null,this.search=null,this.query=null,this.pathname=null,this.path=null,this.href=null}var w=/^([a-z0-9.+-]+:)/i,y=/:[0-9]*$/,v=["{","}","|","\\","^","`"].concat(["<",">",'"',"`"," ","\r","\n","\t"]),b=["'"].concat(v),k=["%","/","?",";","#"].concat(b),I=["/","?","#"],$=/^[a-z0-9A-Z_-]{0,63}$/,j=/^([a-z0-9A-Z_-]{0,63})(.*)$/,O={javascript:!0,"javascript:":!0},A={javascript:!0,"javascript:":!0},q={http:!0,https:!0,ftp:!0,gopher:!0,file:!0,"http:":!0,"https:":!0,"ftp:":!0,"gopher:":!0,"file:":!0};function C(t,e,n){if(t&&W(t)&&t instanceof g)return t;var o=new g;return o.parse(t,e,n),o}function x(t){return"string"===typeof t}function W(t){return"object"===typeof t&&null!==t}function _(t){return null===t}g.prototype.parse=function(t,e,n){if(!x(t))throw new TypeError("Parameter 'url' must be a string, not "+typeof t);var o=t;o=o.trim();var r=w.exec(o);if(r){var s=(r=r[0]).toLowerCase();this.protocol=s,o=o.substr(r.length)}if(n||r||o.match(/^\/\/[^@\/]+@[^@\/]+/)){var a="//"===o.substr(0,2);!a||r&&A[r]||(o=o.substr(2),this.slashes=!0)}if(!A[r]&&(a||r&&!q[r])){for(var i,h,u=-1,l=0;l<I.length;l++){-1!==(f=o.indexOf(I[l]))&&(-1===u||f<u)&&(u=f)}-1!==(h=-1===u?o.lastIndexOf("@"):o.lastIndexOf("@",u))&&(i=o.slice(0,h),o=o.slice(h+1),this.auth=decodeURIComponent(i)),u=-1;for(l=0;l<k.length;l++){var f;-1!==(f=o.indexOf(k[l]))&&(-1===u||f<u)&&(u=f)}-1===u&&(u=o.length),this.host=o.slice(0,u),o=o.slice(u),this.parseHost(),this.hostname=this.hostname||"";var p="["===this.hostname[0]&&"]"===this.hostname[this.hostname.length-1];if(!p)for(var m=this.hostname.split(/\./),g=(l=0,m.length);l<g;l++){var y=m[l];if(y&&!y.match($)){for(var v="",C=0,W=y.length;C<W;C++)y.charCodeAt(C)>127?v+="x":v+=y[C];if(!v.match($)){var _=m.slice(0,l),R=m.slice(l+1),E=y.match(j);E&&(_.push(E[1]),R.unshift(E[2])),R.length&&(o="/"+R.join(".")+o),this.hostname=_.join(".");break}}}if(this.hostname.length>255?this.hostname="":this.hostname=this.hostname.toLowerCase(),!p){var S=this.hostname.split("."),U=[];for(l=0;l<S.length;++l){var D=S[l];U.push(D.match(/[^A-Za-z0-9_-]/)?"xn--"+c.encode(D):D)}this.hostname=U.join(".")}var T=this.port?":"+this.port:"",P=this.hostname||"";this.host=P+T,this.href+=this.host,p&&(this.hostname=this.hostname.substr(1,this.hostname.length-2),"/"!==o[0]&&(o="/"+o))}if(!O[s])for(l=0,g=b.length;l<g;l++){var H=b[l],N=encodeURIComponent(H);N===H&&(N=escape(H)),o=o.split(H).join(N)}var z=o.indexOf("#");-1!==z&&(this.hash=o.substr(z),o=o.slice(0,z));var B=o.indexOf("?");if(-1!==B?(this.search=o.substr(B),this.query=o.substr(B+1),e&&(this.query=d.parse(this.query)),o=o.slice(0,B)):e&&(this.search="",this.query={}),o&&(this.pathname=o),q[s]&&this.hostname&&!this.pathname&&(this.pathname="/"),this.pathname||this.search){T=this.pathname||"",D=this.search||"";this.path=T+D}return this.href=this.format(),this},g.prototype.format=function(){var t=this.auth||"";t&&(t=(t=encodeURIComponent(t)).replace(/%3A/i,":"),t+="@");var e=this.protocol||"",n=this.pathname||"",o=this.hash||"",r=!1,s="";this.host?r=t+this.host:this.hostname&&(r=t+(-1===this.hostname.indexOf(":")?this.hostname:"["+this.hostname+"]"),this.port&&(r+=":"+this.port)),this.query&&W(this.query)&&Object.keys(this.query).length&&(s=d.stringify(this.query));var a=this.search||s&&"?"+s||"";return e&&":"!==e.substr(-1)&&(e+=":"),this.slashes||(!e||q[e])&&!1!==r?(r="//"+(r||""),n&&"/"!==n.charAt(0)&&(n="/"+n)):r||(r=""),o&&"#"!==o.charAt(0)&&(o="#"+o),a&&"?"!==a.charAt(0)&&(a="?"+a),e+r+(n=n.replace(/[?#]/g,(function(t){return encodeURIComponent(t)})))+(a=a.replace("#","%23"))+o},g.prototype.resolve=function(t){return this.resolveObject(C(t,!1,!0)).format()},g.prototype.resolveObject=function(t){if(x(t)){var e=new g;e.parse(t,!1,!0),t=e}var n=new g;if(Object.keys(this).forEach((function(t){n[t]=this[t]}),this),n.hash=t.hash,""===t.href)return n.href=n.format(),n;if(t.slashes&&!t.protocol)return Object.keys(t).forEach((function(e){"protocol"!==e&&(n[e]=t[e])})),q[n.protocol]&&n.hostname&&!n.pathname&&(n.path=n.pathname="/"),n.href=n.format(),n;if(t.protocol&&t.protocol!==n.protocol){if(!q[t.protocol])return Object.keys(t).forEach((function(e){n[e]=t[e]})),n.href=n.format(),n;if(n.protocol=t.protocol,t.host||A[t.protocol])n.pathname=t.pathname;else{for(var o=(t.pathname||"").split("/");o.length&&!(t.host=o.shift()););t.host||(t.host=""),t.hostname||(t.hostname=""),""!==o[0]&&o.unshift(""),o.length<2&&o.unshift(""),n.pathname=o.join("/")}if(n.search=t.search,n.query=t.query,n.host=t.host||"",n.auth=t.auth,n.hostname=t.hostname||t.host,n.port=t.port,n.pathname||n.search){var r=n.pathname||"",s=n.search||"";n.path=r+s}return n.slashes=n.slashes||t.slashes,n.href=n.format(),n}var a=n.pathname&&"/"===n.pathname.charAt(0),i=t.host||t.pathname&&"/"===t.pathname.charAt(0),h=i||a||n.host&&t.pathname,c=h,u=n.pathname&&n.pathname.split("/")||[],l=(o=t.pathname&&t.pathname.split("/")||[],n.protocol&&!q[n.protocol]);if(l&&(n.hostname="",n.port=null,n.host&&(""===u[0]?u[0]=n.host:u.unshift(n.host)),n.host="",t.protocol&&(t.hostname=null,t.port=null,t.host&&(""===o[0]?o[0]=t.host:o.unshift(t.host)),t.host=null),h=h&&(""===o[0]||""===u[0])),i)n.host=t.host||""===t.host?t.host:n.host,n.hostname=t.hostname||""===t.hostname?t.hostname:n.hostname,n.search=t.search,n.query=t.query,u=o;else if(o.length)u||(u=[]),u.pop(),u=u.concat(o),n.search=t.search,n.query=t.query;else if(null!=t.search){if(l)n.hostname=n.host=u.shift(),(w=!!(n.host&&n.host.indexOf("@")>0)&&n.host.split("@"))&&(n.auth=w.shift(),n.host=n.hostname=w.shift());return n.search=t.search,n.query=t.query,_(n.pathname)&&_(n.search)||(n.path=(n.pathname?n.pathname:"")+(n.search?n.search:"")),n.href=n.format(),n}if(!u.length)return n.pathname=null,n.search?n.path="/"+n.search:n.path=null,n.href=n.format(),n;for(var f=u.slice(-1)[0],p=(n.host||t.host)&&("."===f||".."===f)||""===f,d=0,m=u.length;m>=0;m--)"."==(f=u[m])?u.splice(m,1):".."===f?(u.splice(m,1),d++):d&&(u.splice(m,1),d--);if(!h&&!c)for(;d--;d)u.unshift("..");!h||""===u[0]||u[0]&&"/"===u[0].charAt(0)||u.unshift(""),p&&"/"!==u.join("/").substr(-1)&&u.push("");var w,y=""===u[0]||u[0]&&"/"===u[0].charAt(0);l&&(n.hostname=n.host=y?"":u.length?u.shift():"",(w=!!(n.host&&n.host.indexOf("@")>0)&&n.host.split("@"))&&(n.auth=w.shift(),n.host=n.hostname=w.shift()));return(h=h||n.host&&u.length)&&!y&&u.unshift(""),u.length?n.pathname=u.join("/"):(n.pathname=null,n.path=null),_(n.pathname)&&_(n.search)||(n.path=(n.pathname?n.pathname:"")+(n.search?n.search:"")),n.auth=t.auth||n.auth,n.slashes=n.slashes||t.slashes,n.href=n.format(),n},g.prototype.parseHost=function(){var t=this.host,e=y.exec(t);e&&(":"!==(e=e[0])&&(this.port=e.substr(1)),t=t.substr(0,t.length-e.length)),t&&(this.hostname=t)};function R(t){return null!==t&&"object"===typeof t&&!1===Array.isArray(t)}function E(t,e){if(function(t){return"boolean"===typeof t}(t))return t;if(function(t){return null===t||"undefined"===typeof t}(t)&&"undefined"!==typeof e)return e;throw new Error(`Unable to cast ${typeof t} to Boolean`)}let S=r;async function U(t,e=!1){const n=await(e?async function(t){try{return await t.json()}catch(e){return null}}(t):t.json());if(R(n)&&"string"===typeof n.error)throw new Error(n.error);return n}function D(t={}){var e,n;const r=new o.Headers;if(r.set("Accept","application/json"),r.set("Content-Type","application/json"),r.set("X-EPI2ME-Client",null!==(e=t.user_agent)&&void 0!==e?e:"api"),r.set("X-EPI2ME-Version",null!==(n=t.agent_version)&&void 0!==n?n:"3.0.1238"),t.headers)for(const[o,s]of Object.entries(t.headers))r.set(o,s);return r}async function T(t,e){var n;const r=D(e),s=new URL(t,e.base_url),a={headers:r,method:null!==(n=e.method)&&void 0!==n?n:"get",agent:e.agent,body:e.body};let i=new o.Request(s.toString(),a);e.mutate_request&&(i=await e.mutate_request(i)),e.log&&e.log(i);let h=await S(i);return await async function(t){if(!t.ok){if(504===t.status)throw new Error("Please check your network connection and try again");throw await U(t,!0),new Error("Network error: "+t.statusText)}}(h),e.mutate_response&&(h=await e.mutate_response(h)),h}function P(t,e){if(R(t)){if("json"===e)return JSON.stringify(t);if("url"===e){const e=new URLSearchParams;for(const n of Object.keys(t))e.set(n,String(t[n]));return e.set("json",JSON.stringify(t)),e.sort(),e}throw new Error("Invalid body encoding method "+e)}return t}const H={head:(t,e={})=>T(t,Object.assign(Object.assign({},e),{method:"head"})),get:async(t,e={})=>U(await T(t,Object.assign(Object.assign({},e),{method:"get"}))),async post(t,e,n={}){var o;const r=P(e,null!==(o=n.encode_method)&&void 0!==o?o:"json");return U(await T(t,Object.assign(Object.assign({},n),{body:r,method:"post"})))},async put(t,e,n={}){var o;const r=P(e,null!==(o=n.encode_method)&&void 0!==o?o:"json");return U(await T(t,Object.assign(Object.assign({},n),{body:r,method:"put"})))}},N=(...t)=>{};class z{constructor(t){this.initClient=()=>function(t){const e=new n.ApolloLink(e=>{const o=t(),{url:r}=e.getContext(),s=n.createHttpLink({uri:m(r,"/graphql"),fetch:o});return n.execute(s,e)}),o=new n.InMemoryCache;return new n.ApolloClient({link:e,cache:o})}(()=>(t,e={})=>{const n=D({headers:new o.Headers(e.headers)});return n.set("Authorization","Bearer "+this.options.jwt),e.headers=n,r(t,e)}),this.createContext=t=>{const{url:e,apikey:n,apisecret:o}=this.options;return Object.assign({apikey:n,apisecret:o,url:e},t)},this.resetCache=()=>{this.client.resetStore()},this.workflows=this.query(e`
    query allWorkflows($page: Int, $pageSize: Int, $isActive: Int, $orderBy: String, $region: String) {
      allWorkflows(page: $page, pageSize: $pageSize, isActive: $isActive, orderBy: $orderBy, region: $region) {
        ${s}
        results {
          ${"\nidWorkflow\nname\ndescription\nsummary\nrev\n"}
        }
      }
    }
  `),this.workflowPages=async t=>{let e=t,n=await this.workflows({variables:{page:e}});const o=async t=>(e=t,n=await this.workflows({variables:{page:e}}),n);return{data:n,next:()=>o(e+1),previous:()=>o(e-1),first:()=>o(1),last:()=>o(0)}},this.workflow=this.query(e`
    query workflow($idWorkflow: ID!) {
      workflow(idWorkflow: $idWorkflow) {
        ${"\nidWorkflow\nname\ndescription\nsummary\nrev\n"}
      }
    }
   `),this.workflowInstances=this.query(e`
  query allWorkflowInstances($page: Int, $pageSize: Int, $shared: Boolean, $idUser: ID, $orderBy: String) {
    allWorkflowInstances(page: $page, pageSize: $pageSize, shared: $shared, idUser: $idUser, orderBy: $orderBy) {
      ${s}
      results {
        ${a}
      }
    }
  }
   `),this.workflowInstance=this.query(e`
      query workflowInstance($idWorkflowInstance: ID!) {
        workflowInstance(idWorkflowInstance: $idWorkflowInstance) {
          ${a}
        }
      }
   `),this.startWorkflow=this.mutate(e`
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
  `),this.stopWorkflow=this.mutate(e`
    mutation stopWorkflowInstance($idWorkflowInstance: ID!) {
      stopData: stopWorkflowInstance(idWorkflowInstance: $idWorkflowInstance) {
        success
        message
      }
    }
  `),this.instanceToken=this.mutate(e`
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
  `),this.user=this.query(e`
    query user {
      me {
        username
        realname
        useraccountSet {
          idUserAccount
        }
      }
    }
  `),this.updateUser=this.mutate(e`
    mutation updateUser($idRegionPreferred: ID!) {
      updateUser(idRegionPreferred: $idRegionPreferred) {
        idRegionPreferred
      }
    }
  `),this.register=this.mutate(e`
    mutation registerToken($code: String!, $description: String) {
      registerToken(code: $code, description: $description) {
        apikey
        apisecret
        description
      }
    }
  `),this.status=this.query(e`
    query status {
      status {
        portalVersion
        remoteAddr
        serverTime
        minimumAgent
        dbVersion
      }
    }
  `),this.regions=this.query(e`
    query regions {
      regions {
        idRegion
        description
        name
      }
    }
  `);let i=t.url;i=i.replace(/:\/\//,"://graphql."),i=i.replace(/\/$/,"");const{apikey:h,apisecret:c,jwt:u,log:l,local:f,signing:p}=t;this.options={url:i,base_url:i,agent_version:t.agent_version,local:f,user_agent:t.user_agent,signing:p,apikey:h,apisecret:c,jwt:u},this.log=l,this.client=this.initClient()}query(t){return n=>{var o,r,a;const i=null!==(o=null===n||void 0===n?void 0:n.context)&&void 0!==o?o:{},h=null!==(r=null===n||void 0===n?void 0:n.variables)&&void 0!==r?r:{},c=null!==(a=null===n||void 0===n?void 0:n.options)&&void 0!==a?a:{},u=this.createContext(i);let l;return l="string"===typeof t?e`
          ${t}
        `:"function"===typeof t?e`
          ${t(s)}
        `:t,this.client.query(Object.assign(Object.assign({query:l,variables:h},c),{context:u}))}}mutate(t){return n=>{var o,r,s;const a=null!==(o=null===n||void 0===n?void 0:n.context)&&void 0!==o?o:{},i=null!==(r=null===n||void 0===n?void 0:n.variables)&&void 0!==r?r:{},h=null!==(s=null===n||void 0===n?void 0:n.options)&&void 0!==s?s:{},c=this.createContext(a);let u;return u="string"===typeof t?e`
          ${t}
        `:t,this.client.mutate(Object.assign(Object.assign({mutation:u,variables:i},h),{context:c}))}}async convertONTJWT(t,e={token_type:"jwt"}){if("jwt"!==e.token_type&&!e.description)throw new Error("Description required for signature requests");return H.post("convert-ont",e,Object.assign(Object.assign({},this.options),{log:N,headers:{"X-ONT-JWT":t}}))}async healthCheck(){return{status:E((await H.get("/status",Object.assign(Object.assign({},this.options),{log:N}))).status)}}}z.NETWORK_ONLY="network-only",z.CACHE_FIRST="cache-first",z.CACHE_AND_NETWORK="cache-and-network",z.CACHE_ONLY="cache-only",z.NO_CACHE="no-cache",exports.GraphQL=z;
