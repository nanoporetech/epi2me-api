/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2020
 */

import t from"graphql-tag";import{ApolloClient as e,ApolloLink as r,createHttpLink as n,execute as o,InMemoryCache as s}from"@apollo/client/core";import a from"axios";import i from"crypto";import{httpsOverHttps as h,httpsOverHttp as l}from"tunnel";import u,{Headers as c}from"cross-fetch";const p="\npage\npages\nhasNext\nhasPrevious\ntotalCount\n",f="\nidWorkflowInstance\nstartDate\nworkflowImage{\n  workflow\n  {\n    rev\n    name\n  }\n}\n";var d="undefined"!==typeof globalThis?globalThis:"undefined"!==typeof window?window:"undefined"!==typeof global?global:"undefined"!==typeof self?self:{};function g(t,e,r){return t(r={path:e,exports:{},require:function(t,e){return function(){throw new Error("Dynamic requires are not currently supported by @rollup/plugin-commonjs")}((void 0===e||null===e)&&r.path)}},r.exports),r.exports}var m=g((function(t,e){!function(r){var n=e&&!e.nodeType&&e,o=t&&!t.nodeType&&t,s="object"==typeof d&&d;s.global!==s&&s.window!==s&&s.self!==s||(r=s);var a,i,h=2147483647,l=/^xn--/,u=/[^\x20-\x7E]/,c=/[\x2E\u3002\uFF0E\uFF61]/g,p={overflow:"Overflow: input needs wider integers to process","not-basic":"Illegal input >= 0x80 (not a basic code point)","invalid-input":"Invalid input"},f=Math.floor,g=String.fromCharCode;function m(t){throw RangeError(p[t])}function w(t,e){for(var r=t.length,n=[];r--;)n[r]=e(t[r]);return n}function y(t,e){var r=t.split("@"),n="";return r.length>1&&(n=r[0]+"@",t=r[1]),n+w((t=t.replace(c,".")).split("."),e).join(".")}function v(t){for(var e,r,n=[],o=0,s=t.length;o<s;)(e=t.charCodeAt(o++))>=55296&&e<=56319&&o<s?56320==(64512&(r=t.charCodeAt(o++)))?n.push(((1023&e)<<10)+(1023&r)+65536):(n.push(e),o--):n.push(e);return n}function k(t){return w(t,(function(t){var e="";return t>65535&&(e+=g((t-=65536)>>>10&1023|55296),t=56320|1023&t),e+=g(t)})).join("")}function b(t,e){return t+22+75*(t<26)-((0!=e)<<5)}function $(t,e,r){var n=0;for(t=r?f(t/700):t>>1,t+=f(t/e);t>455;n+=36)t=f(t/35);return f(n+36*t/(t+38))}function I(t){var e,r,n,o,s,a,i,l,u,c,p,d=[],g=t.length,w=0,y=128,v=72;for((r=t.lastIndexOf("-"))<0&&(r=0),n=0;n<r;++n)t.charCodeAt(n)>=128&&m("not-basic"),d.push(t.charCodeAt(n));for(o=r>0?r+1:0;o<g;){for(s=w,a=1,i=36;o>=g&&m("invalid-input"),((l=(p=t.charCodeAt(o++))-48<10?p-22:p-65<26?p-65:p-97<26?p-97:36)>=36||l>f((h-w)/a))&&m("overflow"),w+=l*a,!(l<(u=i<=v?1:i>=v+26?26:i-v));i+=36)a>f(h/(c=36-u))&&m("overflow"),a*=c;v=$(w-s,e=d.length+1,0==s),f(w/e)>h-y&&m("overflow"),y+=f(w/e),w%=e,d.splice(w++,0,y)}return k(d)}function j(t){var e,r,n,o,s,a,i,l,u,c,p,d,w,y,k,I=[];for(d=(t=v(t)).length,e=128,r=0,s=72,a=0;a<d;++a)(p=t[a])<128&&I.push(g(p));for(n=o=I.length,o&&I.push("-");n<d;){for(i=h,a=0;a<d;++a)(p=t[a])>=e&&p<i&&(i=p);for(i-e>f((h-r)/(w=n+1))&&m("overflow"),r+=(i-e)*w,e=i,a=0;a<d;++a)if((p=t[a])<e&&++r>h&&m("overflow"),p==e){for(l=r,u=36;!(l<(c=u<=s?1:u>=s+26?26:u-s));u+=36)k=l-c,y=36-c,I.push(g(b(c+k%y,0))),l=f(k/y);I.push(g(b(l,0))),s=$(r,w,n==o),r=0,++n}++r,++e}return I.join("")}if(a={version:"1.3.2",ucs2:{decode:v,encode:k},decode:I,encode:j,toASCII:function(t){return y(t,(function(t){return u.test(t)?"xn--"+j(t):t}))},toUnicode:function(t){return y(t,(function(t){return l.test(t)?I(t.slice(4).toLowerCase()):t}))}},n&&o)if(t.exports==n)o.exports=a;else for(i in a)a.hasOwnProperty(i)&&(n[i]=a[i]);else r.punycode=a}(d)}));function w(t,e){return Object.prototype.hasOwnProperty.call(t,e)}var y=function(t,e,r,n){e=e||"&",r=r||"=";var o={};if("string"!==typeof t||0===t.length)return o;var s=/\+/g;t=t.split(e);var a=1e3;n&&"number"===typeof n.maxKeys&&(a=n.maxKeys);var i=t.length;a>0&&i>a&&(i=a);for(var h=0;h<i;++h){var l,u,c,p,f=t[h].replace(s,"%20"),d=f.indexOf(r);d>=0?(l=f.substr(0,d),u=f.substr(d+1)):(l=f,u=""),c=decodeURIComponent(l),p=decodeURIComponent(u),w(o,c)?Array.isArray(o[c])?o[c].push(p):o[c]=[o[c],p]:o[c]=p}return o},v=function(t){switch(typeof t){case"string":return t;case"boolean":return t?"true":"false";case"number":return isFinite(t)?t:"";default:return""}},k=function(t,e,r,n){return e=e||"&",r=r||"=",null===t&&(t=void 0),"object"===typeof t?Object.keys(t).map((function(n){var o=encodeURIComponent(v(n))+r;return Array.isArray(t[n])?t[n].map((function(t){return o+encodeURIComponent(v(t))})).join(e):o+encodeURIComponent(v(t[n]))})).join(e):n?encodeURIComponent(v(n))+r+encodeURIComponent(v(t)):""},b=g((function(t,e){e.decode=e.parse=y,e.encode=e.stringify=k})),$=function(t,e){return P(t,!1,!0).resolve(e)};function I(){this.protocol=null,this.slashes=null,this.auth=null,this.host=null,this.port=null,this.hostname=null,this.hash=null,this.search=null,this.query=null,this.pathname=null,this.path=null,this.href=null}var j=/^([a-z0-9.+-]+:)/i,x=/:[0-9]*$/,A=["{","}","|","\\","^","`"].concat(["<",">",'"',"`"," ","\r","\n","\t"]),O=["'"].concat(A),C=["%","/","?",";","#"].concat(O),E=["/","?","#"],q=/^[a-z0-9A-Z_-]{0,63}$/,S=/^([a-z0-9A-Z_-]{0,63})(.*)$/,T={javascript:!0,"javascript:":!0},W={javascript:!0,"javascript:":!0},R={http:!0,https:!0,ftp:!0,gopher:!0,file:!0,"http:":!0,"https:":!0,"ftp:":!0,"gopher:":!0,"file:":!0};function P(t,e,r){if(t&&D(t)&&t instanceof I)return t;var n=new I;return n.parse(t,e,r),n}function U(t){return"string"===typeof t}function D(t){return"object"===typeof t&&null!==t}function _(t){return null===t}I.prototype.parse=function(t,e,r){if(!U(t))throw new TypeError("Parameter 'url' must be a string, not "+typeof t);var n=t;n=n.trim();var o=j.exec(n);if(o){var s=(o=o[0]).toLowerCase();this.protocol=s,n=n.substr(o.length)}if(r||o||n.match(/^\/\/[^@\/]+@[^@\/]+/)){var a="//"===n.substr(0,2);!a||o&&W[o]||(n=n.substr(2),this.slashes=!0)}if(!W[o]&&(a||o&&!R[o])){for(var i,h,l=-1,u=0;u<E.length;u++){-1!==(c=n.indexOf(E[u]))&&(-1===l||c<l)&&(l=c)}-1!==(h=-1===l?n.lastIndexOf("@"):n.lastIndexOf("@",l))&&(i=n.slice(0,h),n=n.slice(h+1),this.auth=decodeURIComponent(i)),l=-1;for(u=0;u<C.length;u++){var c;-1!==(c=n.indexOf(C[u]))&&(-1===l||c<l)&&(l=c)}-1===l&&(l=n.length),this.host=n.slice(0,l),n=n.slice(l),this.parseHost(),this.hostname=this.hostname||"";var p="["===this.hostname[0]&&"]"===this.hostname[this.hostname.length-1];if(!p)for(var f=this.hostname.split(/\./),d=(u=0,f.length);u<d;u++){var g=f[u];if(g&&!g.match(q)){for(var w="",y=0,v=g.length;y<v;y++)g.charCodeAt(y)>127?w+="x":w+=g[y];if(!w.match(q)){var k=f.slice(0,u),$=f.slice(u+1),I=g.match(S);I&&(k.push(I[1]),$.unshift(I[2])),$.length&&(n="/"+$.join(".")+n),this.hostname=k.join(".");break}}}if(this.hostname.length>255?this.hostname="":this.hostname=this.hostname.toLowerCase(),!p){var x=this.hostname.split("."),A=[];for(u=0;u<x.length;++u){var P=x[u];A.push(P.match(/[^A-Za-z0-9_-]/)?"xn--"+m.encode(P):P)}this.hostname=A.join(".")}var D=this.port?":"+this.port:"",_=this.hostname||"";this.host=_+D,this.href+=this.host,p&&(this.hostname=this.hostname.substr(1,this.hostname.length-2),"/"!==n[0]&&(n="/"+n))}if(!T[s])for(u=0,d=O.length;u<d;u++){var H=O[u],N=encodeURIComponent(H);N===H&&(N=escape(H)),n=n.split(H).join(N)}var L=n.indexOf("#");-1!==L&&(this.hash=n.substr(L),n=n.slice(0,L));var z=n.indexOf("?");if(-1!==z?(this.search=n.substr(z),this.query=n.substr(z+1),e&&(this.query=b.parse(this.query)),n=n.slice(0,z)):e&&(this.search="",this.query={}),n&&(this.pathname=n),R[s]&&this.hostname&&!this.pathname&&(this.pathname="/"),this.pathname||this.search){D=this.pathname||"",P=this.search||"";this.path=D+P}return this.href=this.format(),this},I.prototype.format=function(){var t=this.auth||"";t&&(t=(t=encodeURIComponent(t)).replace(/%3A/i,":"),t+="@");var e=this.protocol||"",r=this.pathname||"",n=this.hash||"",o=!1,s="";this.host?o=t+this.host:this.hostname&&(o=t+(-1===this.hostname.indexOf(":")?this.hostname:"["+this.hostname+"]"),this.port&&(o+=":"+this.port)),this.query&&D(this.query)&&Object.keys(this.query).length&&(s=b.stringify(this.query));var a=this.search||s&&"?"+s||"";return e&&":"!==e.substr(-1)&&(e+=":"),this.slashes||(!e||R[e])&&!1!==o?(o="//"+(o||""),r&&"/"!==r.charAt(0)&&(r="/"+r)):o||(o=""),n&&"#"!==n.charAt(0)&&(n="#"+n),a&&"?"!==a.charAt(0)&&(a="?"+a),e+o+(r=r.replace(/[?#]/g,(function(t){return encodeURIComponent(t)})))+(a=a.replace("#","%23"))+n},I.prototype.resolve=function(t){return this.resolveObject(P(t,!1,!0)).format()},I.prototype.resolveObject=function(t){if(U(t)){var e=new I;e.parse(t,!1,!0),t=e}var r=new I;if(Object.keys(this).forEach((function(t){r[t]=this[t]}),this),r.hash=t.hash,""===t.href)return r.href=r.format(),r;if(t.slashes&&!t.protocol)return Object.keys(t).forEach((function(e){"protocol"!==e&&(r[e]=t[e])})),R[r.protocol]&&r.hostname&&!r.pathname&&(r.path=r.pathname="/"),r.href=r.format(),r;if(t.protocol&&t.protocol!==r.protocol){if(!R[t.protocol])return Object.keys(t).forEach((function(e){r[e]=t[e]})),r.href=r.format(),r;if(r.protocol=t.protocol,t.host||W[t.protocol])r.pathname=t.pathname;else{for(var n=(t.pathname||"").split("/");n.length&&!(t.host=n.shift()););t.host||(t.host=""),t.hostname||(t.hostname=""),""!==n[0]&&n.unshift(""),n.length<2&&n.unshift(""),r.pathname=n.join("/")}if(r.search=t.search,r.query=t.query,r.host=t.host||"",r.auth=t.auth,r.hostname=t.hostname||t.host,r.port=t.port,r.pathname||r.search){var o=r.pathname||"",s=r.search||"";r.path=o+s}return r.slashes=r.slashes||t.slashes,r.href=r.format(),r}var a=r.pathname&&"/"===r.pathname.charAt(0),i=t.host||t.pathname&&"/"===t.pathname.charAt(0),h=i||a||r.host&&t.pathname,l=h,u=r.pathname&&r.pathname.split("/")||[],c=(n=t.pathname&&t.pathname.split("/")||[],r.protocol&&!R[r.protocol]);if(c&&(r.hostname="",r.port=null,r.host&&(""===u[0]?u[0]=r.host:u.unshift(r.host)),r.host="",t.protocol&&(t.hostname=null,t.port=null,t.host&&(""===n[0]?n[0]=t.host:n.unshift(t.host)),t.host=null),h=h&&(""===n[0]||""===u[0])),i)r.host=t.host||""===t.host?t.host:r.host,r.hostname=t.hostname||""===t.hostname?t.hostname:r.hostname,r.search=t.search,r.query=t.query,u=n;else if(n.length)u||(u=[]),u.pop(),u=u.concat(n),r.search=t.search,r.query=t.query;else if(null!=t.search){if(c)r.hostname=r.host=u.shift(),(m=!!(r.host&&r.host.indexOf("@")>0)&&r.host.split("@"))&&(r.auth=m.shift(),r.host=r.hostname=m.shift());return r.search=t.search,r.query=t.query,_(r.pathname)&&_(r.search)||(r.path=(r.pathname?r.pathname:"")+(r.search?r.search:"")),r.href=r.format(),r}if(!u.length)return r.pathname=null,r.search?r.path="/"+r.search:r.path=null,r.href=r.format(),r;for(var p=u.slice(-1)[0],f=(r.host||t.host)&&("."===p||".."===p)||""===p,d=0,g=u.length;g>=0;g--)"."==(p=u[g])?u.splice(g,1):".."===p?(u.splice(g,1),d++):d&&(u.splice(g,1),d--);if(!h&&!l)for(;d--;d)u.unshift("..");!h||""===u[0]||u[0]&&"/"===u[0].charAt(0)||u.unshift(""),f&&"/"!==u.join("/").substr(-1)&&u.push("");var m,w=""===u[0]||u[0]&&"/"===u[0].charAt(0);c&&(r.hostname=r.host=w?"":u.length?u.shift():"",(m=!!(r.host&&r.host.indexOf("@")>0)&&r.host.split("@"))&&(r.auth=m.shift(),r.host=r.hostname=m.shift()));return(h=h||r.host&&u.length)&&!w&&u.unshift(""),u.length?r.pathname=u.join("/"):(r.pathname=null,r.path=null),_(r.pathname)&&_(r.search)||(r.path=(r.pathname?r.pathname:"")+(r.search?r.search:"")),r.auth=t.auth||r.auth,r.slashes=r.slashes||t.slashes,r.href=r.format(),r},I.prototype.parseHost=function(){var t=this.host,e=x.exec(t);e&&(":"!==(e=e[0])&&(this.port=e.substr(1)),t=t.substr(0,t.length-e.length)),t&&(this.hostname=t)};const H=(...t)=>{},N={debug:H,error:H,info:H,warn:H};function L(t,e){if(function(t){return"boolean"===typeof t}(t))return t;if(function(t){return null===t||"undefined"===typeof t}(t)&&"undefined"!==typeof e)return e;throw new Error(`Unable to cast ${typeof t} to Boolean`)}a.defaults.validateStatus=t=>t<=504;const z=function(){const t={sign:(t,e)=>{var r,n;if(!e)return;if(t.headers||(t.headers={}),!e.apikey)return;if(t.headers["X-EPI2ME-ApiKey"]=e.apikey,!e.apisecret)return;t.headers["X-EPI2ME-SignatureDate"]=(new Date).toISOString(),(null===(r=t.url)||void 0===r?void 0:r.match(/^https:/))&&(t.url=t.url.replace(/:443/,"")),(null===(n=t.url)||void 0===n?void 0:n.match(/^http:/))&&(t.url=t.url.replace(/:80/,""));const o=[t.url,Object.keys(t.headers).sort().filter(t=>t.match(/^x-epi2me/i)).map(e=>`${e}:${t.headers[e]}`).join("\n")].join("\n"),s=i.createHmac("sha1",e.apisecret).update(o).digest("hex");t.headers["X-EPI2ME-SignatureV0"]=s},responseHandler(t){const e=t&&("object"===typeof(r=t.data)&&!1===Array.isArray(r))?t.data:null;var r;if(t&&t.status>=400){let r="Network error "+t.status;throw(null===e||void 0===e?void 0:e.error)&&(r=e.error+""),504===t.status&&(r="Please check your network connection and try again."),new Error(r)}if(!e)throw new Error("unexpected non-json response");if(e.error)throw new Error(e.error+"");return e}};return{version:"3.0.1839",headers(e,r){var n,o;if(e.headers=Object.assign(Object.assign({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-Client":r.user_agent||"api","X-EPI2ME-Version":r.agent_version||z.version},e.headers),r.headers),(null===(n=r.signing)||void 0===n||n)&&t.sign(e,r),r.proxy){const t=r.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/);if(!t)throw new Error("Failed to parse Proxy URL");const n=t[2],s=t[3],a={host:t[4],port:parseInt(t[5],10)};n&&s&&(a.proxyAuth=`${n}:${s}`);const i=null!==(o=r.log)&&void 0!==o?o:N;r.proxy.match(/^https/)?(i.debug("using HTTPS over HTTPS proxy",JSON.stringify(a)),e.httpsAgent=h({proxy:a})):(i.debug("using HTTPS over HTTP proxy",JSON.stringify(a)),e.httpsAgent=l({proxy:a})),e.proxy=!1}},async head(t,e){var r;const n={url:this.mangleURL(t,e)};if(this.headers(n,e),!n.url)throw new Error("unreachable: url argument in HEAD was deleted");(null!==(r=e.log)&&void 0!==r?r:N).debug("HEAD",n.url);const o=await a.head(n.url,n);if(o&&o.status>=400){if(504===o.status)throw new Error("Please check your network connection and try again.");throw new Error("Network error "+o.status)}return o},async get(e,r){var n;const o={url:this.mangleURL(e,r)};if(this.headers(o,r),!o.url)throw new Error("unreachable: url argument in GET was deleted");(null!==(n=r.log)&&void 0!==n?n:N).debug("GET",o.url);const s=await a.get(o.url,o);return t.responseHandler(s)},async post(e,r,n){var o;let s=n.url;s=s.replace(/\/+$/,"");const i={url:`${s}/${e.replace(/\/+/g,"/")}`,data:r,headers:{}};n.legacy_form&&this.processLegacyForm(i,r),this.headers(i,n);const{data:h}=i;delete i.data;const l=null!==(o=n.log)&&void 0!==o?o:N;if(!i.url)throw new Error("unreachable: url argument in POST was deleted");l.debug("POST",i.url);const u=await a.post(i.url,h,i);return n.handler?n.handler(u):t.responseHandler(u)},async put(e,r,n,o){var s;let i=o.url;i=i.replace(/\/+$/,"");const h={url:`${i}/${e.replace(/\/+/g,"/")}/${r}`,data:n,headers:{}};o.legacy_form&&this.processLegacyForm(h,n),this.headers(h,o);const{data:l}=h;delete h.data;const u=null!==(s=o.log)&&void 0!==s?s:N;if(!h.url)throw new Error("unreachable: url argument in PUT was deleted");u.debug("PUT",h.url);const c=await a.put(h.url,l,h);return t.responseHandler(c)},mangleURL(t,e){let r=e.url;return e.skip_url_mangle?t:(t="/"+t,r=r.replace(/\/+$/,""),r+(t=t.replace(/\/+/g,"/")))},processLegacyForm(t,e){const r=[],n=Object.assign({json:JSON.stringify(e)},e);Object.keys(n).sort().forEach(t=>{r.push(`${t}=${escape(n[t]+"")}`)}),t.data=r.join("&"),t.headers["Content-Type"]="application/x-www-form-urlencoded"},convertResponseToObject(t){if("object"===typeof t)return t;try{return JSON.parse(t)}catch(e){throw new Error("exception parsing chain JSON "+String(e))}}}}();class B{constructor(a){this.initClient=()=>function(t){const a=new r(e=>{const r=t(),{url:s}=e.getContext(),a=n({uri:$(s,"/graphql"),fetch:r});return o(a,e)}),i=new s;return new e({link:a,cache:i})}(()=>(t,e={})=>{const r=function(t={}){var e,r;const n=new c;if(n.set("Accept","application/json"),n.set("Content-Type","application/json"),n.set("X-EPI2ME-Client",null!==(e=t.user_agent)&&void 0!==e?e:"api"),n.set("X-EPI2ME-Version",null!==(r=t.agent_version)&&void 0!==r?r:"3.0.1839"),t.headers)for(const[o,s]of Object.entries(t.headers))n.set(o,s);return n}({headers:new c(e.headers)});return r.set("Authorization","Bearer "+this.options.jwt),e.headers=r,u(t,e)}),this.createContext=t=>{const{apikey:e,apisecret:r,url:n}=this.options;return Object.assign({apikey:e,apisecret:r,url:n},t)},this.resetCache=()=>{this.client.resetStore()},this.workflows=this.query(t`
    query allWorkflows($page: Int, $pageSize: Int, $isActive: Int, $orderBy: String, $region: String) {
      allWorkflows(page: $page, pageSize: $pageSize, isActive: $isActive, orderBy: $orderBy, region: $region) {
        ${p}
        results {
          ${"\nidWorkflow\nname\ndescription\nsummary\nrev\n"}
        }
      }
    }
  `),this.workflowPages=async t=>{let e=t,r=await this.workflows({variables:{page:e}});const n=async t=>(e=t,r=await this.workflows({variables:{page:e}}),r);return{data:r,next:()=>n(e+1),previous:()=>n(e-1),first:()=>n(1),last:()=>n(0)}},this.workflow=this.query(t`
    query workflow($idWorkflow: ID!) {
      workflow(idWorkflow: $idWorkflow) {
        ${"\nidWorkflow\nname\ndescription\nsummary\nrev\n"}
      }
    }
   `),this.workflowInstances=this.query(t`
  query allWorkflowInstances($page: Int, $pageSize: Int, $shared: Boolean, $idUser: ID, $orderBy: String) {
    allWorkflowInstances(page: $page, pageSize: $pageSize, shared: $shared, idUser: $idUser, orderBy: $orderBy) {
      ${p}
      results {
        ${f}
      }
    }
  }
   `),this.workflowInstance=this.query(t`
      query workflowInstance($idWorkflowInstance: ID!) {
        workflowInstance(idWorkflowInstance: $idWorkflowInstance) {
          ${f}
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
  `);let i=a.url;i=i.replace(/:\/\//,"://graphql."),i=i.replace(/\/$/,"");const{apikey:h,apisecret:l,jwt:d,log:g,local:m,signing:w}=a;this.options={url:i,agent_version:a.agent_version,local:m,user_agent:a.user_agent,signing:w,apikey:h,apisecret:l,jwt:d},this.log=g,this.client=this.initClient()}query(e){return r=>{var n,o,s;const a=null!==(n=null===r||void 0===r?void 0:r.context)&&void 0!==n?n:{},i=null!==(o=null===r||void 0===r?void 0:r.variables)&&void 0!==o?o:{},h=null!==(s=null===r||void 0===r?void 0:r.options)&&void 0!==s?s:{},l=this.createContext(a);let u;return u="string"===typeof e?t`
          ${e}
        `:"function"===typeof e?t`
          ${e(p)}
        `:e,this.client.query(Object.assign(Object.assign({query:u,variables:i},h),{context:l}))}}mutate(e){return r=>{var n,o,s;const a=null!==(n=null===r||void 0===r?void 0:r.context)&&void 0!==n?n:{},i=null!==(o=null===r||void 0===r?void 0:r.variables)&&void 0!==o?o:{},h=null!==(s=null===r||void 0===r?void 0:r.options)&&void 0!==s?s:{},l=this.createContext(a);let u;return u="string"===typeof e?t`
          ${e}
        `:e,this.client.mutate(Object.assign(Object.assign({mutation:u,variables:i},h),{context:l}))}}async convertONTJWT(t,e={token_type:"jwt"}){if("jwt"!==e.token_type&&!e.description)throw new Error("Description required for signature requests");return z.post("convert-ont",e,Object.assign(Object.assign({},this.options),{log:{debug:H},headers:{"X-ONT-JWT":t}}))}async healthCheck(){return{status:L((await z.get("/status",Object.assign(Object.assign({},this.options),{log:{debug:H}}))).status)}}}B.NETWORK_ONLY="network-only",B.CACHE_FIRST="cache-first",B.CACHE_AND_NETWORK="cache-and-network",B.CACHE_ONLY="cache-only",B.NO_CACHE="no-cache";export{B as GraphQL};
