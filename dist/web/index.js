/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2020
 */

"use strict";function e(e){return e&&"object"===typeof e&&"default"in e?e.default:e}Object.defineProperty(exports,"__esModule",{value:!0});var t=e(require("graphql-tag")),r=require("@apollo/client/core"),n=e(require("axios")),o=e(require("crypto")),s=require("tunnel"),a=require("cross-fetch"),i=e(a);const h="\npage\npages\nhasNext\nhasPrevious\ntotalCount\n",l="\nidWorkflowInstance\nstartDate\nworkflowImage{\n  workflow\n  {\n    rev\n    name\n  }\n}\n";var u="undefined"!==typeof globalThis?globalThis:"undefined"!==typeof window?window:"undefined"!==typeof global?global:"undefined"!==typeof self?self:{};function c(e,t,r){return e(r={path:t,exports:{},require:function(e,t){return function(){throw new Error("Dynamic requires are not currently supported by @rollup/plugin-commonjs")}((void 0===t||null===t)&&r.path)}},r.exports),r.exports}var p=c((function(e,t){!function(r){var n=t&&!t.nodeType&&t,o=e&&!e.nodeType&&e,s="object"==typeof u&&u;s.global!==s&&s.window!==s&&s.self!==s||(r=s);var a,i,h=2147483647,l=/^xn--/,c=/[^\x20-\x7E]/,p=/[\x2E\u3002\uFF0E\uFF61]/g,f={overflow:"Overflow: input needs wider integers to process","not-basic":"Illegal input >= 0x80 (not a basic code point)","invalid-input":"Invalid input"},d=Math.floor,g=String.fromCharCode;function m(e){throw RangeError(f[e])}function w(e,t){for(var r=e.length,n=[];r--;)n[r]=t(e[r]);return n}function y(e,t){var r=e.split("@"),n="";return r.length>1&&(n=r[0]+"@",e=r[1]),n+w((e=e.replace(p,".")).split("."),t).join(".")}function v(e){for(var t,r,n=[],o=0,s=e.length;o<s;)(t=e.charCodeAt(o++))>=55296&&t<=56319&&o<s?56320==(64512&(r=e.charCodeAt(o++)))?n.push(((1023&t)<<10)+(1023&r)+65536):(n.push(t),o--):n.push(t);return n}function k(e){return w(e,(function(e){var t="";return e>65535&&(t+=g((e-=65536)>>>10&1023|55296),e=56320|1023&e),t+=g(e)})).join("")}function b(e,t){return e+22+75*(e<26)-((0!=t)<<5)}function $(e,t,r){var n=0;for(e=r?d(e/700):e>>1,e+=d(e/t);e>455;n+=36)e=d(e/35);return d(n+36*e/(e+38))}function I(e){var t,r,n,o,s,a,i,l,u,c,p,f=[],g=e.length,w=0,y=128,v=72;for((r=e.lastIndexOf("-"))<0&&(r=0),n=0;n<r;++n)e.charCodeAt(n)>=128&&m("not-basic"),f.push(e.charCodeAt(n));for(o=r>0?r+1:0;o<g;){for(s=w,a=1,i=36;o>=g&&m("invalid-input"),((l=(p=e.charCodeAt(o++))-48<10?p-22:p-65<26?p-65:p-97<26?p-97:36)>=36||l>d((h-w)/a))&&m("overflow"),w+=l*a,!(l<(u=i<=v?1:i>=v+26?26:i-v));i+=36)a>d(h/(c=36-u))&&m("overflow"),a*=c;v=$(w-s,t=f.length+1,0==s),d(w/t)>h-y&&m("overflow"),y+=d(w/t),w%=t,f.splice(w++,0,y)}return k(f)}function j(e){var t,r,n,o,s,a,i,l,u,c,p,f,w,y,k,I=[];for(f=(e=v(e)).length,t=128,r=0,s=72,a=0;a<f;++a)(p=e[a])<128&&I.push(g(p));for(n=o=I.length,o&&I.push("-");n<f;){for(i=h,a=0;a<f;++a)(p=e[a])>=t&&p<i&&(i=p);for(i-t>d((h-r)/(w=n+1))&&m("overflow"),r+=(i-t)*w,t=i,a=0;a<f;++a)if((p=e[a])<t&&++r>h&&m("overflow"),p==t){for(l=r,u=36;!(l<(c=u<=s?1:u>=s+26?26:u-s));u+=36)k=l-c,y=36-c,I.push(g(b(c+k%y,0))),l=d(k/y);I.push(g(b(l,0))),s=$(r,w,n==o),r=0,++n}++r,++t}return I.join("")}if(a={version:"1.3.2",ucs2:{decode:v,encode:k},decode:I,encode:j,toASCII:function(e){return y(e,(function(e){return c.test(e)?"xn--"+j(e):e}))},toUnicode:function(e){return y(e,(function(e){return l.test(e)?I(e.slice(4).toLowerCase()):e}))}},n&&o)if(e.exports==n)o.exports=a;else for(i in a)a.hasOwnProperty(i)&&(n[i]=a[i]);else r.punycode=a}(u)}));function f(e,t){return Object.prototype.hasOwnProperty.call(e,t)}var d=function(e,t,r,n){t=t||"&",r=r||"=";var o={};if("string"!==typeof e||0===e.length)return o;var s=/\+/g;e=e.split(t);var a=1e3;n&&"number"===typeof n.maxKeys&&(a=n.maxKeys);var i=e.length;a>0&&i>a&&(i=a);for(var h=0;h<i;++h){var l,u,c,p,d=e[h].replace(s,"%20"),g=d.indexOf(r);g>=0?(l=d.substr(0,g),u=d.substr(g+1)):(l=d,u=""),c=decodeURIComponent(l),p=decodeURIComponent(u),f(o,c)?Array.isArray(o[c])?o[c].push(p):o[c]=[o[c],p]:o[c]=p}return o},g=function(e){switch(typeof e){case"string":return e;case"boolean":return e?"true":"false";case"number":return isFinite(e)?e:"";default:return""}},m=function(e,t,r,n){return t=t||"&",r=r||"=",null===e&&(e=void 0),"object"===typeof e?Object.keys(e).map((function(n){var o=encodeURIComponent(g(n))+r;return Array.isArray(e[n])?e[n].map((function(e){return o+encodeURIComponent(g(e))})).join(t):o+encodeURIComponent(g(e[n]))})).join(t):n?encodeURIComponent(g(n))+r+encodeURIComponent(g(e)):""},w=c((function(e,t){t.decode=t.parse=d,t.encode=t.stringify=m})),y=function(e,t){return S(e,!1,!0).resolve(t)};function v(){this.protocol=null,this.slashes=null,this.auth=null,this.host=null,this.port=null,this.hostname=null,this.hash=null,this.search=null,this.query=null,this.pathname=null,this.path=null,this.href=null}var k=/^([a-z0-9.+-]+:)/i,b=/:[0-9]*$/,$=["{","}","|","\\","^","`"].concat(["<",">",'"',"`"," ","\r","\n","\t"]),I=["'"].concat($),j=["%","/","?",";","#"].concat(I),x=["/","?","#"],A=/^[a-z0-9A-Z_-]{0,63}$/,O=/^([a-z0-9A-Z_-]{0,63})(.*)$/,C={javascript:!0,"javascript:":!0},q={javascript:!0,"javascript:":!0},E={http:!0,https:!0,ftp:!0,gopher:!0,file:!0,"http:":!0,"https:":!0,"ftp:":!0,"gopher:":!0,"file:":!0};function S(e,t,r){if(e&&W(e)&&e instanceof v)return e;var n=new v;return n.parse(e,t,r),n}function T(e){return"string"===typeof e}function W(e){return"object"===typeof e&&null!==e}function P(e){return null===e}v.prototype.parse=function(e,t,r){if(!T(e))throw new TypeError("Parameter 'url' must be a string, not "+typeof e);var n=e;n=n.trim();var o=k.exec(n);if(o){var s=(o=o[0]).toLowerCase();this.protocol=s,n=n.substr(o.length)}if(r||o||n.match(/^\/\/[^@\/]+@[^@\/]+/)){var a="//"===n.substr(0,2);!a||o&&q[o]||(n=n.substr(2),this.slashes=!0)}if(!q[o]&&(a||o&&!E[o])){for(var i,h,l=-1,u=0;u<x.length;u++){-1!==(c=n.indexOf(x[u]))&&(-1===l||c<l)&&(l=c)}-1!==(h=-1===l?n.lastIndexOf("@"):n.lastIndexOf("@",l))&&(i=n.slice(0,h),n=n.slice(h+1),this.auth=decodeURIComponent(i)),l=-1;for(u=0;u<j.length;u++){var c;-1!==(c=n.indexOf(j[u]))&&(-1===l||c<l)&&(l=c)}-1===l&&(l=n.length),this.host=n.slice(0,l),n=n.slice(l),this.parseHost(),this.hostname=this.hostname||"";var f="["===this.hostname[0]&&"]"===this.hostname[this.hostname.length-1];if(!f)for(var d=this.hostname.split(/\./),g=(u=0,d.length);u<g;u++){var m=d[u];if(m&&!m.match(A)){for(var y="",v=0,b=m.length;v<b;v++)m.charCodeAt(v)>127?y+="x":y+=m[v];if(!y.match(A)){var $=d.slice(0,u),S=d.slice(u+1),W=m.match(O);W&&($.push(W[1]),S.unshift(W[2])),S.length&&(n="/"+S.join(".")+n),this.hostname=$.join(".");break}}}if(this.hostname.length>255?this.hostname="":this.hostname=this.hostname.toLowerCase(),!f){var P=this.hostname.split("."),R=[];for(u=0;u<P.length;++u){var U=P[u];R.push(U.match(/[^A-Za-z0-9_-]/)?"xn--"+p.encode(U):U)}this.hostname=R.join(".")}var _=this.port?":"+this.port:"",D=this.hostname||"";this.host=D+_,this.href+=this.host,f&&(this.hostname=this.hostname.substr(1,this.hostname.length-2),"/"!==n[0]&&(n="/"+n))}if(!C[s])for(u=0,g=I.length;u<g;u++){var H=I[u],N=encodeURIComponent(H);N===H&&(N=escape(H)),n=n.split(H).join(N)}var L=n.indexOf("#");-1!==L&&(this.hash=n.substr(L),n=n.slice(0,L));var z=n.indexOf("?");if(-1!==z?(this.search=n.substr(z),this.query=n.substr(z+1),t&&(this.query=w.parse(this.query)),n=n.slice(0,z)):t&&(this.search="",this.query={}),n&&(this.pathname=n),E[s]&&this.hostname&&!this.pathname&&(this.pathname="/"),this.pathname||this.search){_=this.pathname||"",U=this.search||"";this.path=_+U}return this.href=this.format(),this},v.prototype.format=function(){var e=this.auth||"";e&&(e=(e=encodeURIComponent(e)).replace(/%3A/i,":"),e+="@");var t=this.protocol||"",r=this.pathname||"",n=this.hash||"",o=!1,s="";this.host?o=e+this.host:this.hostname&&(o=e+(-1===this.hostname.indexOf(":")?this.hostname:"["+this.hostname+"]"),this.port&&(o+=":"+this.port)),this.query&&W(this.query)&&Object.keys(this.query).length&&(s=w.stringify(this.query));var a=this.search||s&&"?"+s||"";return t&&":"!==t.substr(-1)&&(t+=":"),this.slashes||(!t||E[t])&&!1!==o?(o="//"+(o||""),r&&"/"!==r.charAt(0)&&(r="/"+r)):o||(o=""),n&&"#"!==n.charAt(0)&&(n="#"+n),a&&"?"!==a.charAt(0)&&(a="?"+a),t+o+(r=r.replace(/[?#]/g,(function(e){return encodeURIComponent(e)})))+(a=a.replace("#","%23"))+n},v.prototype.resolve=function(e){return this.resolveObject(S(e,!1,!0)).format()},v.prototype.resolveObject=function(e){if(T(e)){var t=new v;t.parse(e,!1,!0),e=t}var r=new v;if(Object.keys(this).forEach((function(e){r[e]=this[e]}),this),r.hash=e.hash,""===e.href)return r.href=r.format(),r;if(e.slashes&&!e.protocol)return Object.keys(e).forEach((function(t){"protocol"!==t&&(r[t]=e[t])})),E[r.protocol]&&r.hostname&&!r.pathname&&(r.path=r.pathname="/"),r.href=r.format(),r;if(e.protocol&&e.protocol!==r.protocol){if(!E[e.protocol])return Object.keys(e).forEach((function(t){r[t]=e[t]})),r.href=r.format(),r;if(r.protocol=e.protocol,e.host||q[e.protocol])r.pathname=e.pathname;else{for(var n=(e.pathname||"").split("/");n.length&&!(e.host=n.shift()););e.host||(e.host=""),e.hostname||(e.hostname=""),""!==n[0]&&n.unshift(""),n.length<2&&n.unshift(""),r.pathname=n.join("/")}if(r.search=e.search,r.query=e.query,r.host=e.host||"",r.auth=e.auth,r.hostname=e.hostname||e.host,r.port=e.port,r.pathname||r.search){var o=r.pathname||"",s=r.search||"";r.path=o+s}return r.slashes=r.slashes||e.slashes,r.href=r.format(),r}var a=r.pathname&&"/"===r.pathname.charAt(0),i=e.host||e.pathname&&"/"===e.pathname.charAt(0),h=i||a||r.host&&e.pathname,l=h,u=r.pathname&&r.pathname.split("/")||[],c=(n=e.pathname&&e.pathname.split("/")||[],r.protocol&&!E[r.protocol]);if(c&&(r.hostname="",r.port=null,r.host&&(""===u[0]?u[0]=r.host:u.unshift(r.host)),r.host="",e.protocol&&(e.hostname=null,e.port=null,e.host&&(""===n[0]?n[0]=e.host:n.unshift(e.host)),e.host=null),h=h&&(""===n[0]||""===u[0])),i)r.host=e.host||""===e.host?e.host:r.host,r.hostname=e.hostname||""===e.hostname?e.hostname:r.hostname,r.search=e.search,r.query=e.query,u=n;else if(n.length)u||(u=[]),u.pop(),u=u.concat(n),r.search=e.search,r.query=e.query;else if(null!=e.search){if(c)r.hostname=r.host=u.shift(),(m=!!(r.host&&r.host.indexOf("@")>0)&&r.host.split("@"))&&(r.auth=m.shift(),r.host=r.hostname=m.shift());return r.search=e.search,r.query=e.query,P(r.pathname)&&P(r.search)||(r.path=(r.pathname?r.pathname:"")+(r.search?r.search:"")),r.href=r.format(),r}if(!u.length)return r.pathname=null,r.search?r.path="/"+r.search:r.path=null,r.href=r.format(),r;for(var p=u.slice(-1)[0],f=(r.host||e.host)&&("."===p||".."===p)||""===p,d=0,g=u.length;g>=0;g--)"."==(p=u[g])?u.splice(g,1):".."===p?(u.splice(g,1),d++):d&&(u.splice(g,1),d--);if(!h&&!l)for(;d--;d)u.unshift("..");!h||""===u[0]||u[0]&&"/"===u[0].charAt(0)||u.unshift(""),f&&"/"!==u.join("/").substr(-1)&&u.push("");var m,w=""===u[0]||u[0]&&"/"===u[0].charAt(0);c&&(r.hostname=r.host=w?"":u.length?u.shift():"",(m=!!(r.host&&r.host.indexOf("@")>0)&&r.host.split("@"))&&(r.auth=m.shift(),r.host=r.hostname=m.shift()));return(h=h||r.host&&u.length)&&!w&&u.unshift(""),u.length?r.pathname=u.join("/"):(r.pathname=null,r.path=null),P(r.pathname)&&P(r.search)||(r.path=(r.pathname?r.pathname:"")+(r.search?r.search:"")),r.auth=e.auth||r.auth,r.slashes=r.slashes||e.slashes,r.href=r.format(),r},v.prototype.parseHost=function(){var e=this.host,t=b.exec(e);t&&(":"!==(t=t[0])&&(this.port=t.substr(1)),e=e.substr(0,e.length-t.length)),e&&(this.hostname=e)};const R=(...e)=>{},U={debug:R,error:R,info:R,warn:R};function _(e,t){if(function(e){return"boolean"===typeof e}(e))return e;if(function(e){return null===e||"undefined"===typeof e}(e)&&"undefined"!==typeof t)return t;throw new Error(`Unable to cast ${typeof e} to Boolean`)}n.defaults.validateStatus=e=>e<=504;const D=function(){const e={sign:(e,t)=>{var r,n;if(!t)return;if(e.headers||(e.headers={}),!t.apikey)return;if(e.headers["X-EPI2ME-ApiKey"]=t.apikey,!t.apisecret)return;e.headers["X-EPI2ME-SignatureDate"]=(new Date).toISOString(),(null===(r=e.url)||void 0===r?void 0:r.match(/^https:/))&&(e.url=e.url.replace(/:443/,"")),(null===(n=e.url)||void 0===n?void 0:n.match(/^http:/))&&(e.url=e.url.replace(/:80/,""));const s=[e.url,Object.keys(e.headers).sort().filter(e=>e.match(/^x-epi2me/i)).map(t=>`${t}:${e.headers[t]}`).join("\n")].join("\n"),a=o.createHmac("sha1",t.apisecret).update(s).digest("hex");e.headers["X-EPI2ME-SignatureV0"]=a},responseHandler(e){const t=e&&("object"===typeof(r=e.data)&&!1===Array.isArray(r))?e.data:null;var r;if(e&&e.status>=400){let r="Network error "+e.status;throw(null===t||void 0===t?void 0:t.error)&&(r=t.error+""),504===e.status&&(r="Please check your network connection and try again."),new Error(r)}if(!t)throw new Error("unexpected non-json response");if(t.error)throw new Error(t.error+"");return t}};return{version:"3.0.1839",headers(t,r){var n,o;if(t.headers=Object.assign(Object.assign({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-Client":r.user_agent||"api","X-EPI2ME-Version":r.agent_version||D.version},t.headers),r.headers),(null===(n=r.signing)||void 0===n||n)&&e.sign(t,r),r.proxy){const e=r.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/);if(!e)throw new Error("Failed to parse Proxy URL");const n=e[2],a=e[3],i={host:e[4],port:parseInt(e[5],10)};n&&a&&(i.proxyAuth=`${n}:${a}`);const h=null!==(o=r.log)&&void 0!==o?o:U;r.proxy.match(/^https/)?(h.debug("using HTTPS over HTTPS proxy",JSON.stringify(i)),t.httpsAgent=s.httpsOverHttps({proxy:i})):(h.debug("using HTTPS over HTTP proxy",JSON.stringify(i)),t.httpsAgent=s.httpsOverHttp({proxy:i})),t.proxy=!1}},async head(e,t){var r;const o={url:this.mangleURL(e,t)};if(this.headers(o,t),!o.url)throw new Error("unreachable: url argument in HEAD was deleted");(null!==(r=t.log)&&void 0!==r?r:U).debug("HEAD",o.url);const s=await n.head(o.url,o);if(s&&s.status>=400){if(504===s.status)throw new Error("Please check your network connection and try again.");throw new Error("Network error "+s.status)}return s},async get(t,r){var o;const s={url:this.mangleURL(t,r)};if(this.headers(s,r),!s.url)throw new Error("unreachable: url argument in GET was deleted");(null!==(o=r.log)&&void 0!==o?o:U).debug("GET",s.url);const a=await n.get(s.url,s);return e.responseHandler(a)},async post(t,r,o){var s;let a=o.url;a=a.replace(/\/+$/,"");const i={url:`${a}/${t.replace(/\/+/g,"/")}`,data:r,headers:{}};o.legacy_form&&this.processLegacyForm(i,r),this.headers(i,o);const{data:h}=i;delete i.data;const l=null!==(s=o.log)&&void 0!==s?s:U;if(!i.url)throw new Error("unreachable: url argument in POST was deleted");l.debug("POST",i.url);const u=await n.post(i.url,h,i);return o.handler?o.handler(u):e.responseHandler(u)},async put(t,r,o,s){var a;let i=s.url;i=i.replace(/\/+$/,"");const h={url:`${i}/${t.replace(/\/+/g,"/")}/${r}`,data:o,headers:{}};s.legacy_form&&this.processLegacyForm(h,o),this.headers(h,s);const{data:l}=h;delete h.data;const u=null!==(a=s.log)&&void 0!==a?a:U;if(!h.url)throw new Error("unreachable: url argument in PUT was deleted");u.debug("PUT",h.url);const c=await n.put(h.url,l,h);return e.responseHandler(c)},mangleURL(e,t){let r=t.url;return t.skip_url_mangle?e:(e="/"+e,r=r.replace(/\/+$/,""),r+(e=e.replace(/\/+/g,"/")))},processLegacyForm(e,t){const r=[],n=Object.assign({json:JSON.stringify(t)},t);Object.keys(n).sort().forEach(e=>{r.push(`${e}=${escape(n[e]+"")}`)}),e.data=r.join("&"),e.headers["Content-Type"]="application/x-www-form-urlencoded"},convertResponseToObject(e){if("object"===typeof e)return e;try{return JSON.parse(e)}catch(t){throw new Error("exception parsing chain JSON "+String(t))}}}}();class H{constructor(e){this.initClient=()=>function(e){const t=new r.ApolloLink(t=>{const n=e(),{url:o}=t.getContext(),s=r.createHttpLink({uri:y(o,"/graphql"),fetch:n});return r.execute(s,t)}),n=new r.InMemoryCache;return new r.ApolloClient({link:t,cache:n})}(()=>(e,t={})=>{const r=function(e={}){var t,r;const n=new a.Headers;if(n.set("Accept","application/json"),n.set("Content-Type","application/json"),n.set("X-EPI2ME-Client",null!==(t=e.user_agent)&&void 0!==t?t:"api"),n.set("X-EPI2ME-Version",null!==(r=e.agent_version)&&void 0!==r?r:"3.0.1839"),e.headers)for(const[o,s]of Object.entries(e.headers))n.set(o,s);return n}({headers:new a.Headers(t.headers)});return r.set("Authorization","Bearer "+this.options.jwt),t.headers=r,i(e,t)}),this.createContext=e=>{const{apikey:t,apisecret:r,url:n}=this.options;return Object.assign({apikey:t,apisecret:r,url:n},e)},this.resetCache=()=>{this.client.resetStore()},this.workflows=this.query(t`
    query allWorkflows($page: Int, $pageSize: Int, $isActive: Int, $orderBy: String, $region: String) {
      allWorkflows(page: $page, pageSize: $pageSize, isActive: $isActive, orderBy: $orderBy, region: $region) {
        ${h}
        results {
          ${"\nidWorkflow\nname\ndescription\nsummary\nrev\n"}
        }
      }
    }
  `),this.workflowPages=async e=>{let t=e,r=await this.workflows({variables:{page:t}});const n=async e=>(t=e,r=await this.workflows({variables:{page:t}}),r);return{data:r,next:()=>n(t+1),previous:()=>n(t-1),first:()=>n(1),last:()=>n(0)}},this.workflow=this.query(t`
    query workflow($idWorkflow: ID!) {
      workflow(idWorkflow: $idWorkflow) {
        ${"\nidWorkflow\nname\ndescription\nsummary\nrev\n"}
      }
    }
   `),this.workflowInstances=this.query(t`
  query allWorkflowInstances($page: Int, $pageSize: Int, $shared: Boolean, $idUser: ID, $orderBy: String) {
    allWorkflowInstances(page: $page, pageSize: $pageSize, shared: $shared, idUser: $idUser, orderBy: $orderBy) {
      ${h}
      results {
        ${l}
      }
    }
  }
   `),this.workflowInstance=this.query(t`
      query workflowInstance($idWorkflowInstance: ID!) {
        workflowInstance(idWorkflowInstance: $idWorkflowInstance) {
          ${l}
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
  `);let n=e.url;n=n.replace(/:\/\//,"://graphql."),n=n.replace(/\/$/,"");const{apikey:o,apisecret:s,jwt:u,log:c,local:p,signing:f}=e;this.options={url:n,agent_version:e.agent_version,local:p,user_agent:e.user_agent,signing:f,apikey:o,apisecret:s,jwt:u},this.log=c,this.client=this.initClient()}query(e){return r=>{var n,o,s;const a=null!==(n=null===r||void 0===r?void 0:r.context)&&void 0!==n?n:{},i=null!==(o=null===r||void 0===r?void 0:r.variables)&&void 0!==o?o:{},l=null!==(s=null===r||void 0===r?void 0:r.options)&&void 0!==s?s:{},u=this.createContext(a);let c;return c="string"===typeof e?t`
          ${e}
        `:"function"===typeof e?t`
          ${e(h)}
        `:e,this.client.query(Object.assign(Object.assign({query:c,variables:i},l),{context:u}))}}mutate(e){return r=>{var n,o,s;const a=null!==(n=null===r||void 0===r?void 0:r.context)&&void 0!==n?n:{},i=null!==(o=null===r||void 0===r?void 0:r.variables)&&void 0!==o?o:{},h=null!==(s=null===r||void 0===r?void 0:r.options)&&void 0!==s?s:{},l=this.createContext(a);let u;return u="string"===typeof e?t`
          ${e}
        `:e,this.client.mutate(Object.assign(Object.assign({mutation:u,variables:i},h),{context:l}))}}async convertONTJWT(e,t={token_type:"jwt"}){if("jwt"!==t.token_type&&!t.description)throw new Error("Description required for signature requests");return D.post("convert-ont",t,Object.assign(Object.assign({},this.options),{log:{debug:R},headers:{"X-ONT-JWT":e}}))}async healthCheck(){return{status:_((await D.get("/status",Object.assign(Object.assign({},this.options),{log:{debug:R}}))).status)}}}H.NETWORK_ONLY="network-only",H.CACHE_FIRST="cache-first",H.CACHE_AND_NETWORK="cache-and-network",H.CACHE_ONLY="cache-only",H.NO_CACHE="no-cache",exports.GraphQL=H;
