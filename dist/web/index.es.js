/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2020
 */

import{merge as t,assign as e,filter as s,every as r,isFunction as o,defaults as n}from"lodash";import{BehaviorSubject as i,combineLatest as a}from"rxjs";import h from"graphql-tag";import{InMemoryCache as c}from"apollo-cache-inmemory";import l from"apollo-client";import{ApolloLink as u,execute as p}from"apollo-link";import{createHttpLink as f}from"apollo-link-http";import{buildAxiosFetch as d}from"@lifeomic/axios-fetch";import g from"axios";import m from"crypto";import{httpsOverHttps as w,httpsOverHttp as y}from"tunnel";import k from"os";import v from"socket.io-client";var $="https://epi2me.nanoporetech.com",b={local:!1,url:$,user_agent:"EPI2ME API",region:"eu-west-1",sessionGrace:5,uploadTimeout:1200,downloadTimeout:1200,fileCheckInterval:5,downloadCheckInterval:3,stateCheckInterval:60,inFlightDelay:600,waitTimeSeconds:20,waitTokenError:30,transferPoolSize:3,downloadMode:"data+telemetry",filetype:[".fastq",".fq",".fastq.gz",".fq.gz"],signing:!0,sampleDirectory:"/data"};const I="\npage\npages\nhasNext\nhasPrevious\ntotalCount\n",S="\nidWorkflowInstance\nstartDate\nworkflowImage{\n  workflow\n  {\n    rev\n    name\n  }\n}\n";var j="undefined"!==typeof globalThis?globalThis:"undefined"!==typeof window?window:"undefined"!==typeof global?global:"undefined"!==typeof self?self:{};function E(t,e,s){return t(s={path:e,exports:{},require:function(t,e){return function(){throw new Error("Dynamic requires are not currently supported by @rollup/plugin-commonjs")}((void 0===e||null===e)&&s.path)}},s.exports),s.exports}var x=E((function(t,e){!function(s){var r=e&&!e.nodeType&&e,o=t&&!t.nodeType&&t,n="object"==typeof j&&j;n.global!==n&&n.window!==n&&n.self!==n||(s=n);var i,a,h=2147483647,c=/^xn--/,l=/[^\x20-\x7E]/,u=/[\x2E\u3002\uFF0E\uFF61]/g,p={overflow:"Overflow: input needs wider integers to process","not-basic":"Illegal input >= 0x80 (not a basic code point)","invalid-input":"Invalid input"},f=Math.floor,d=String.fromCharCode;function g(t){throw RangeError(p[t])}function m(t,e){for(var s=t.length,r=[];s--;)r[s]=e(t[s]);return r}function w(t,e){var s=t.split("@"),r="";return s.length>1&&(r=s[0]+"@",t=s[1]),r+m((t=t.replace(u,".")).split("."),e).join(".")}function y(t){for(var e,s,r=[],o=0,n=t.length;o<n;)(e=t.charCodeAt(o++))>=55296&&e<=56319&&o<n?56320==(64512&(s=t.charCodeAt(o++)))?r.push(((1023&e)<<10)+(1023&s)+65536):(r.push(e),o--):r.push(e);return r}function k(t){return m(t,(function(t){var e="";return t>65535&&(e+=d((t-=65536)>>>10&1023|55296),t=56320|1023&t),e+=d(t)})).join("")}function v(t,e){return t+22+75*(t<26)-((0!=e)<<5)}function $(t,e,s){var r=0;for(t=s?f(t/700):t>>1,t+=f(t/e);t>455;r+=36)t=f(t/35);return f(r+36*t/(t+38))}function b(t){var e,s,r,o,n,i,a,c,l,u,p,d=[],m=t.length,w=0,y=128,v=72;for((s=t.lastIndexOf("-"))<0&&(s=0),r=0;r<s;++r)t.charCodeAt(r)>=128&&g("not-basic"),d.push(t.charCodeAt(r));for(o=s>0?s+1:0;o<m;){for(n=w,i=1,a=36;o>=m&&g("invalid-input"),((c=(p=t.charCodeAt(o++))-48<10?p-22:p-65<26?p-65:p-97<26?p-97:36)>=36||c>f((h-w)/i))&&g("overflow"),w+=c*i,!(c<(l=a<=v?1:a>=v+26?26:a-v));a+=36)i>f(h/(u=36-l))&&g("overflow"),i*=u;v=$(w-n,e=d.length+1,0==n),f(w/e)>h-y&&g("overflow"),y+=f(w/e),w%=e,d.splice(w++,0,y)}return k(d)}function I(t){var e,s,r,o,n,i,a,c,l,u,p,m,w,k,b,I=[];for(m=(t=y(t)).length,e=128,s=0,n=72,i=0;i<m;++i)(p=t[i])<128&&I.push(d(p));for(r=o=I.length,o&&I.push("-");r<m;){for(a=h,i=0;i<m;++i)(p=t[i])>=e&&p<a&&(a=p);for(a-e>f((h-s)/(w=r+1))&&g("overflow"),s+=(a-e)*w,e=a,i=0;i<m;++i)if((p=t[i])<e&&++s>h&&g("overflow"),p==e){for(c=s,l=36;!(c<(u=l<=n?1:l>=n+26?26:l-n));l+=36)b=c-u,k=36-u,I.push(d(v(u+b%k,0))),c=f(b/k);I.push(d(v(c,0))),n=$(s,w,r==o),s=0,++r}++s,++e}return I.join("")}if(i={version:"1.3.2",ucs2:{decode:y,encode:k},decode:b,encode:I,toASCII:function(t){return w(t,(function(t){return l.test(t)?"xn--"+I(t):t}))},toUnicode:function(t){return w(t,(function(t){return c.test(t)?b(t.slice(4).toLowerCase()):t}))}},r&&o)if(t.exports==r)o.exports=i;else for(a in i)i.hasOwnProperty(a)&&(r[a]=i[a]);else s.punycode=i}(j)}));function P(t,e){return Object.prototype.hasOwnProperty.call(t,e)}var T=function(t,e,s,r){e=e||"&",s=s||"=";var o={};if("string"!==typeof t||0===t.length)return o;var n=/\+/g;t=t.split(e);var i=1e3;r&&"number"===typeof r.maxKeys&&(i=r.maxKeys);var a=t.length;i>0&&a>i&&(a=i);for(var h=0;h<a;++h){var c,l,u,p,f=t[h].replace(n,"%20"),d=f.indexOf(s);d>=0?(c=f.substr(0,d),l=f.substr(d+1)):(c=f,l=""),u=decodeURIComponent(c),p=decodeURIComponent(l),P(o,u)?Array.isArray(o[u])?o[u].push(p):o[u]=[o[u],p]:o[u]=p}return o},O=function(t){switch(typeof t){case"string":return t;case"boolean":return t?"true":"false";case"number":return isFinite(t)?t:"";default:return""}},_=function(t,e,s,r){return e=e||"&",s=s||"=",null===t&&(t=void 0),"object"===typeof t?Object.keys(t).map((function(r){var o=encodeURIComponent(O(r))+s;return Array.isArray(t[r])?t[r].map((function(t){return o+encodeURIComponent(O(t))})).join(e):o+encodeURIComponent(O(t[r]))})).join(e):r?encodeURIComponent(O(r))+s+encodeURIComponent(O(t)):""},A=E((function(t,e){e.decode=e.parse=T,e.encode=e.stringify=_})),C=function(t,e){return X(t,!1,!0).resolve(e)};function W(){this.protocol=null,this.slashes=null,this.auth=null,this.host=null,this.port=null,this.hostname=null,this.hash=null,this.search=null,this.query=null,this.pathname=null,this.path=null,this.href=null}var q=/^([a-z0-9.+-]+:)/i,R=/:[0-9]*$/,D=["{","}","|","\\","^","`"].concat(["<",">",'"',"`"," ","\r","\n","\t"]),U=["'"].concat(D),N=["%","/","?",";","#"].concat(U),z=["/","?","#"],H=/^[a-z0-9A-Z_-]{0,63}$/,M=/^([a-z0-9A-Z_-]{0,63})(.*)$/,F={javascript:!0,"javascript:":!0},J={javascript:!0,"javascript:":!0},B={http:!0,https:!0,ftp:!0,gopher:!0,file:!0,"http:":!0,"https:":!0,"ftp:":!0,"gopher:":!0,"file:":!0};function X(t,e,s){if(t&&K(t)&&t instanceof W)return t;var r=new W;return r.parse(t,e,s),r}function G(t){return"string"===typeof t}function K(t){return"object"===typeof t&&null!==t}function L(t){return null===t}W.prototype.parse=function(t,e,s){if(!G(t))throw new TypeError("Parameter 'url' must be a string, not "+typeof t);var r=t;r=r.trim();var o=q.exec(r);if(o){var n=(o=o[0]).toLowerCase();this.protocol=n,r=r.substr(o.length)}if(s||o||r.match(/^\/\/[^@\/]+@[^@\/]+/)){var i="//"===r.substr(0,2);!i||o&&J[o]||(r=r.substr(2),this.slashes=!0)}if(!J[o]&&(i||o&&!B[o])){for(var a,h,c=-1,l=0;l<z.length;l++){-1!==(u=r.indexOf(z[l]))&&(-1===c||u<c)&&(c=u)}-1!==(h=-1===c?r.lastIndexOf("@"):r.lastIndexOf("@",c))&&(a=r.slice(0,h),r=r.slice(h+1),this.auth=decodeURIComponent(a)),c=-1;for(l=0;l<N.length;l++){var u;-1!==(u=r.indexOf(N[l]))&&(-1===c||u<c)&&(c=u)}-1===c&&(c=r.length),this.host=r.slice(0,c),r=r.slice(c),this.parseHost(),this.hostname=this.hostname||"";var p="["===this.hostname[0]&&"]"===this.hostname[this.hostname.length-1];if(!p)for(var f=this.hostname.split(/\./),d=(l=0,f.length);l<d;l++){var g=f[l];if(g&&!g.match(H)){for(var m="",w=0,y=g.length;w<y;w++)g.charCodeAt(w)>127?m+="x":m+=g[w];if(!m.match(H)){var k=f.slice(0,l),v=f.slice(l+1),$=g.match(M);$&&(k.push($[1]),v.unshift($[2])),v.length&&(r="/"+v.join(".")+r),this.hostname=k.join(".");break}}}if(this.hostname.length>255?this.hostname="":this.hostname=this.hostname.toLowerCase(),!p){var b=this.hostname.split("."),I=[];for(l=0;l<b.length;++l){var S=b[l];I.push(S.match(/[^A-Za-z0-9_-]/)?"xn--"+x.encode(S):S)}this.hostname=I.join(".")}var j=this.port?":"+this.port:"",E=this.hostname||"";this.host=E+j,this.href+=this.host,p&&(this.hostname=this.hostname.substr(1,this.hostname.length-2),"/"!==r[0]&&(r="/"+r))}if(!F[n])for(l=0,d=U.length;l<d;l++){var P=U[l],T=encodeURIComponent(P);T===P&&(T=escape(P)),r=r.split(P).join(T)}var O=r.indexOf("#");-1!==O&&(this.hash=r.substr(O),r=r.slice(0,O));var _=r.indexOf("?");if(-1!==_?(this.search=r.substr(_),this.query=r.substr(_+1),e&&(this.query=A.parse(this.query)),r=r.slice(0,_)):e&&(this.search="",this.query={}),r&&(this.pathname=r),B[n]&&this.hostname&&!this.pathname&&(this.pathname="/"),this.pathname||this.search){j=this.pathname||"",S=this.search||"";this.path=j+S}return this.href=this.format(),this},W.prototype.format=function(){var t=this.auth||"";t&&(t=(t=encodeURIComponent(t)).replace(/%3A/i,":"),t+="@");var e=this.protocol||"",s=this.pathname||"",r=this.hash||"",o=!1,n="";this.host?o=t+this.host:this.hostname&&(o=t+(-1===this.hostname.indexOf(":")?this.hostname:"["+this.hostname+"]"),this.port&&(o+=":"+this.port)),this.query&&K(this.query)&&Object.keys(this.query).length&&(n=A.stringify(this.query));var i=this.search||n&&"?"+n||"";return e&&":"!==e.substr(-1)&&(e+=":"),this.slashes||(!e||B[e])&&!1!==o?(o="//"+(o||""),s&&"/"!==s.charAt(0)&&(s="/"+s)):o||(o=""),r&&"#"!==r.charAt(0)&&(r="#"+r),i&&"?"!==i.charAt(0)&&(i="?"+i),e+o+(s=s.replace(/[?#]/g,(function(t){return encodeURIComponent(t)})))+(i=i.replace("#","%23"))+r},W.prototype.resolve=function(t){return this.resolveObject(X(t,!1,!0)).format()},W.prototype.resolveObject=function(t){if(G(t)){var e=new W;e.parse(t,!1,!0),t=e}var s=new W;if(Object.keys(this).forEach((function(t){s[t]=this[t]}),this),s.hash=t.hash,""===t.href)return s.href=s.format(),s;if(t.slashes&&!t.protocol)return Object.keys(t).forEach((function(e){"protocol"!==e&&(s[e]=t[e])})),B[s.protocol]&&s.hostname&&!s.pathname&&(s.path=s.pathname="/"),s.href=s.format(),s;if(t.protocol&&t.protocol!==s.protocol){if(!B[t.protocol])return Object.keys(t).forEach((function(e){s[e]=t[e]})),s.href=s.format(),s;if(s.protocol=t.protocol,t.host||J[t.protocol])s.pathname=t.pathname;else{for(var r=(t.pathname||"").split("/");r.length&&!(t.host=r.shift()););t.host||(t.host=""),t.hostname||(t.hostname=""),""!==r[0]&&r.unshift(""),r.length<2&&r.unshift(""),s.pathname=r.join("/")}if(s.search=t.search,s.query=t.query,s.host=t.host||"",s.auth=t.auth,s.hostname=t.hostname||t.host,s.port=t.port,s.pathname||s.search){var o=s.pathname||"",n=s.search||"";s.path=o+n}return s.slashes=s.slashes||t.slashes,s.href=s.format(),s}var i=s.pathname&&"/"===s.pathname.charAt(0),a=t.host||t.pathname&&"/"===t.pathname.charAt(0),h=a||i||s.host&&t.pathname,c=h,l=s.pathname&&s.pathname.split("/")||[],u=(r=t.pathname&&t.pathname.split("/")||[],s.protocol&&!B[s.protocol]);if(u&&(s.hostname="",s.port=null,s.host&&(""===l[0]?l[0]=s.host:l.unshift(s.host)),s.host="",t.protocol&&(t.hostname=null,t.port=null,t.host&&(""===r[0]?r[0]=t.host:r.unshift(t.host)),t.host=null),h=h&&(""===r[0]||""===l[0])),a)s.host=t.host||""===t.host?t.host:s.host,s.hostname=t.hostname||""===t.hostname?t.hostname:s.hostname,s.search=t.search,s.query=t.query,l=r;else if(r.length)l||(l=[]),l.pop(),l=l.concat(r),s.search=t.search,s.query=t.query;else if(null!=t.search){if(u)s.hostname=s.host=l.shift(),(m=!!(s.host&&s.host.indexOf("@")>0)&&s.host.split("@"))&&(s.auth=m.shift(),s.host=s.hostname=m.shift());return s.search=t.search,s.query=t.query,L(s.pathname)&&L(s.search)||(s.path=(s.pathname?s.pathname:"")+(s.search?s.search:"")),s.href=s.format(),s}if(!l.length)return s.pathname=null,s.search?s.path="/"+s.search:s.path=null,s.href=s.format(),s;for(var p=l.slice(-1)[0],f=(s.host||t.host)&&("."===p||".."===p)||""===p,d=0,g=l.length;g>=0;g--)"."==(p=l[g])?l.splice(g,1):".."===p?(l.splice(g,1),d++):d&&(l.splice(g,1),d--);if(!h&&!c)for(;d--;d)l.unshift("..");!h||""===l[0]||l[0]&&"/"===l[0].charAt(0)||l.unshift(""),f&&"/"!==l.join("/").substr(-1)&&l.push("");var m,w=""===l[0]||l[0]&&"/"===l[0].charAt(0);u&&(s.hostname=s.host=w?"":l.length?l.shift():"",(m=!!(s.host&&s.host.indexOf("@")>0)&&s.host.split("@"))&&(s.auth=m.shift(),s.host=s.hostname=m.shift()));return(h=h||s.host&&l.length)&&!w&&l.unshift(""),l.length?s.pathname=l.join("/"):(s.pathname=null,s.path=null),L(s.pathname)&&L(s.search)||(s.path=(s.pathname?s.pathname:"")+(s.search?s.search:"")),s.auth=t.auth||s.auth,s.slashes=s.slashes||t.slashes,s.href=s.format(),s},W.prototype.parseHost=function(){var t=this.host,e=R.exec(t);e&&(":"!==(e=e[0])&&(this.port=e.substr(1)),t=t.substr(0,t.length-e.length)),t&&(this.hostname=t)};const Q=function(){const e=(t,e)=>{t.headers||(t.headers={});let s=e;if(s||(s={}),!s.apikey||!s.apisecret)return;t.headers["X-EPI2ME-APIKEY"]=s.apikey,t.headers["X-EPI2ME-SIGNATUREDATE"]=(new Date).toISOString();const r=[Object.keys(t.headers).sort().filter(t=>t.match(/^x-epi2me/i)).map(e=>`${e}:${t.headers[e]}`).join("\n"),t.body].join("\n"),o=m.createHmac("sha1",s.apisecret).update(r).digest("hex");t.headers["X-EPI2ME-SIGNATUREV0"]=o};return{version:"3.0.926",setHeaders:(s,r)=>{const{log:o}=t({log:{debug:()=>{}}},r);let n=r;if(n||(n={}),s.headers=t({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-CLIENT":n.user_agent||"api","X-EPI2ME-VERSION":n.agent_version||Q.version},s.headers,n.headers),"signing"in n&&!n.signing||e(s,n),n.proxy){const t=n.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/),e=t[2],r=t[3],i={host:t[4],port:t[5]};e&&r&&(i.proxyAuth=`${e}:${r}`),n.proxy.match(/^https/)?(o.debug("using HTTPS over HTTPS proxy",JSON.stringify(i)),s.httpsAgent=w({proxy:i})):(o.debug("using HTTPS over HTTP proxy",JSON.stringify(i)),s.httpsAgent=y({proxy:i})),s.proxy=!1}}}}(),V=d(g),Z=(t,e)=>{const{apikey:s,apisecret:r}=e.headers.keys;return delete e.headers.keys,Q.setHeaders(e,{apikey:s,apisecret:r,signing:!0}),V(t,e)},Y=new l({link:new u(t=>{const{apikey:e,apisecret:s,url:r}=t.getContext(),o=f({uri:C(r,"/graphql"),fetch:Z,headers:{keys:{apikey:e,apisecret:s}}});return p(o,t)}),cache:new c});g.defaults.validateStatus=t=>t<=504;const tt=function(){const e=(t,e)=>{t.headers||(t.headers={});let s=e;if(s||(s={}),!s.apikey)return;if(t.headers["X-EPI2ME-ApiKey"]=s.apikey,!s.apisecret)return;t.headers["X-EPI2ME-SignatureDate"]=(new Date).toISOString(),t.url.match(/^https:/)&&(t.url=t.url.replace(/:443/,"")),t.url.match(/^http:/)&&(t.url=t.url.replace(/:80/,""));const r=[t.url,Object.keys(t.headers).sort().filter(t=>t.match(/^x-epi2me/i)).map(e=>`${e}:${t.headers[e]}`).join("\n")].join("\n"),o=m.createHmac("sha1",s.apisecret).update(r).digest("hex");t.headers["X-EPI2ME-SignatureV0"]=o},s=async t=>{const e=t?t.data:null;if(!e)return Promise.reject(new Error("unexpected non-json response"));if(t&&t.status>=400){let s=`Network error ${t.status}`;return e.error&&(s=e.error),504===t.status&&(s="Please check your network connection and try again."),Promise.reject(new Error(s))}return e.error?Promise.reject(new Error(e.error)):Promise.resolve(e)};return{version:"3.0.926",headers:(s,r)=>{const{log:o}=t({log:{debug:()=>{}}},r);let n=r;if(n||(n={}),s.headers=t({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-Client":n.user_agent||"api","X-EPI2ME-Version":n.agent_version||tt.version},s.headers,n.headers),"signing"in n&&!n.signing||e(s,n),n.proxy){const t=n.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/),e=t[2],r=t[3],i={host:t[4],port:t[5]};e&&r&&(i.proxyAuth=`${e}:${r}`),n.proxy.match(/^https/)?(o.debug("using HTTPS over HTTPS proxy",JSON.stringify(i)),s.httpsAgent=w({proxy:i})):(o.debug("using HTTPS over HTTP proxy",JSON.stringify(i)),s.httpsAgent=y({proxy:i})),s.proxy=!1}},head:async(e,s)=>{const{log:r}=t({log:{debug:()=>{}}},s);let o,n=s.url,i=e;s.skip_url_mangle?o=i:(i=`/${i}`,n=n.replace(/\/+$/,""),i=i.replace(/\/+/g,"/"),o=n+i);const a={url:o,gzip:!0};let h;tt.headers(a,s);try{if(r.debug(`HEAD ${a.url}`),h=await g.head(a.url,a),h&&h.status>=400){let t=`Network error ${h.status}`;return 504===h.status&&(t="Please check your network connection and try again."),Promise.reject(new Error(t))}}catch(c){return Promise.reject(c)}return Promise.resolve(h)},get:async(e,r)=>{const{log:o}=t({log:{debug:()=>{}}},r);let n,i=r.url,a=e;r.skip_url_mangle?n=a:(a=`/${a}`,i=i.replace(/\/+$/,""),a=a.replace(/\/+/g,"/"),n=i+a);const h={url:n,gzip:!0};let c;tt.headers(h,r);try{o.debug(`GET ${h.url}`),c=await g.get(h.url,h)}catch(l){return Promise.reject(l)}return s(c,r)},post:async(e,r,o)=>{const{log:n}=t({log:{debug:()=>{}}},o);let i=o.url;i=i.replace(/\/+$/,"");const a={url:`${i}/${e.replace(/\/+/g,"/")}`,gzip:!0,data:r,headers:{}};if(o.legacy_form){const e=[],s=t({json:JSON.stringify(r)},r);Object.keys(s).sort().forEach(t=>{e.push(`${t}=${escape(s[t])}`)}),a.data=e.join("&"),a.headers["Content-Type"]="application/x-www-form-urlencoded"}tt.headers(a,o);const{data:h}=a;let c;delete a.data;try{n.debug(`POST ${a.url}`),c=await g.post(a.url,h,a)}catch(l){return Promise.reject(l)}return o.handler?o.handler(c):s(c,o)},put:async(e,r,o,n)=>{const{log:i}=t({log:{debug:()=>{}}},n);let a=n.url;a=a.replace(/\/+$/,"");const h={url:`${a}/${e.replace(/\/+/g,"/")}/${r}`,gzip:!0,data:o,headers:{}};if(n.legacy_form){const e=[],s=t({json:JSON.stringify(o)},o);Object.keys(s).sort().forEach(t=>{e.push(`${t}=${escape(s[t])}`)}),h.data=e.join("&"),h.headers["Content-Type"]="application/x-www-form-urlencoded"}tt.headers(h,n);const{data:c}=h;let l;delete h.data;try{i.debug(`PUT ${h.url}`),l=await g.put(h.url,c,h)}catch(u){return Promise.reject(u)}return s(l,n)},convertResponseToObject(t){if("object"===typeof t)return t;try{return JSON.parse(t)}catch(e){throw new Error(`exception parsing chain JSON ${String(e)}`)}}}}();class et{constructor(s){this.createContext=e=>{const{apikey:s,apisecret:r,url:o}=this.options;return t({apikey:s,apisecret:r,url:o},e)},this.query=t=>({context:e={},variables:s={},options:r={}}={})=>{const o=this.createContext(e);let n;return n="string"===typeof t?h`
        ${t}
      `:"function"===typeof t?h`
        ${t(I)}
      `:t,this.client.query(Object.assign(Object.assign({query:n,variables:s},r),{context:o}))},this.mutate=t=>({context:e={},variables:s={},options:r={}}={})=>{const o=this.createContext(e);let n;return n="string"===typeof t?h`
        ${t}
      `:t,this.client.mutate(Object.assign(Object.assign({mutation:n,variables:s},r),{context:o}))},this.resetCache=()=>{this.client.resetStore()},this.workflows=this.query(h`
    query allWorkflows($page: Int, $pageSize: Int, $isActive: Int, $orderBy: String, $region: String) {
      allWorkflows(page: $page, pageSize: $pageSize, isActive: $isActive, orderBy: $orderBy, region: $region) {
        ${I}
        results {
          ${"\nidWorkflow\nname\ndescription\nsummary\nrev\n"}
        }
      }
    }
  `),this.workflowPages=async t=>{let e=t,s=await this.workflows({variables:{page:e}});const r=async t=>(e=t,s=await this.workflows({variables:{page:e}}),s);return{data:s,next:()=>r(e+1),previous:()=>r(e-1),first:()=>r(1),last:()=>r(0)}},this.workflow=this.query(h`
    query workflow($idWorkflow: ID!) {
      workflow(idWorkflow: $idWorkflow) {
        ${"\nidWorkflow\nname\ndescription\nsummary\nrev\n"}
      }
    }
   `),this.workflowInstances=this.query(h`
  query allWorkflowInstances($page: Int, $pageSize: Int, $shared: Boolean, $idUser: ID, $orderBy: String) {
    allWorkflowInstances(page: $page, pageSize: $pageSize, shared: $shared, idUser: $idUser, orderBy: $orderBy) {
      ${I}
      results {
        ${S}
      }
    }
  }
   `),this.workflowInstance=this.query(h`
      query workflowInstance($idWorkflowInstance: ID!) {
        workflowInstance(idWorkflowInstance: $idWorkflowInstance) {
          ${S}
        }
      }
   `),this.startWorkflow=this.mutate(h`
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
  `),this.stopWorkflow=this.mutate(h`
    mutation stopWorkflowInstance($idWorkflowInstance: ID!) {
      stopData: stopWorkflowInstance(idWorkflowInstance: $idWorkflowInstance) {
        success
        message
      }
    }
  `),this.instanceToken=this.mutate(h`
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
  `),this.user=this.query(h`
    query user {
      me {
        username
        realname
        useraccountSet {
          idUserAccount
        }
      }
    }
  `),this.updateUser=this.mutate(h`
    mutation updateUser($idRegionPreferred: ID!) {
      updateUser(idRegionPreferred: $idRegionPreferred) {
        idRegionPreferred
      }
    }
  `),this.register=this.mutate(h`
    mutation registerToken($code: String!, $description: String) {
      registerToken(code: $code, description: $description) {
        apikey
        apisecret
        description
      }
    }
  `),this.status=this.query(h`
    query status {
      status {
        portalVersion
        remoteAddr
        serverTime
        minimumAgent
        dbVersion
      }
    }
  `),this.healthCheck=()=>tt.get("/status",Object.assign(Object.assign({},this.options),{log:{debug:()=>{}}})),this.regions=this.query(h`
    query regions {
      regions {
        idRegion
        description
        name
      }
    }
  `),this.options=e({agent_version:tt.version,local:!1,url:$,user_agent:"EPI2ME API",signing:!0},s),this.options.url=this.options.url.replace(/:\/\//,"://graphql."),this.options.url=this.options.url.replace(/\/$/,""),this.log=this.options.log,this.client=Y}}const st=(t,e)=>{const s=["","K","M","G","T","P","E","Z"];let r=e||0,o=t||0;return o>=1e3?(o/=1e3,r+=1,r>=s.length?"???":st(o,r)):0===r?`${o}${s[r]}`:`${o.toFixed(1)}${s[r]}`};class rt{constructor(t){this.options=e({agent_version:tt.version,local:!1,url:$,user_agent:"EPI2ME API",signing:!0},t),this.log=this.options.log,this.cachedResponses={}}async list(t){const e=t.match(/^[a-z_]+/i)[0];return tt.get(t,this.options).then(t=>t[`${e}s`])}async read(t,e){return tt.get(`${t}/${e}`,this.options)}async user(){return this.options.local?{accounts:[{id_user_account:"none",number:"NONE",name:"None"}]}:tt.get("user",this.options)}async status(){return tt.get("status",this.options)}async jwt(){return tt.post("authenticate",{},t({handler:t=>t.headers["x-epi2me-jwt"]?Promise.resolve(t.headers["x-epi2me-jwt"]):Promise.reject(new Error("failed to fetch JWT"))},this.options))}async instanceToken(s,r){return tt.post("token",t(r,{id_workflow_instance:s}),e({},this.options,{legacy_form:!0}))}async installToken(t){return tt.post("token/install",{id_workflow:t},e({},this.options,{legacy_form:!0}))}async attributes(){return this.list("attribute")}async workflows(){return this.list("workflow")}async amiImages(){if(this.options.local)throw new Error("amiImages unsupported in local mode");return this.list("ami_image")}async amiImage(t,e){let s,r,o;if(t&&e instanceof Object?(s=t,r=e,o="update"):t instanceof Object&&!e?(r=t,o="create"):(o="read",s=t),this.options.local)throw new Error("ami_image unsupported in local mode");if("update"===o)return tt.put("ami_image",s,r,this.options);if("create"===o)return tt.post("ami_image",r,this.options);if(!s)throw new Error("no id_ami_image specified");return this.read("ami_image",s)}async workflow(e,r,o){let n,i,a,h;if(e&&r&&o instanceof Function?(n=e,i=r,a=o,h="update"):e&&r instanceof Object&&!(r instanceof Function)?(n=e,i=r,h="update"):e instanceof Object&&r instanceof Function?(i=e,a=r,h="create"):e instanceof Object&&!r?(i=e,h="create"):(h="read",n=e,a=r instanceof Function?r:null),"update"===h)try{const t=await tt.put("workflow",n,i,this.options);return a?a(null,t):Promise.resolve(t)}catch(p){return a?a(p):Promise.reject(p)}if("create"===h)try{const t=await tt.post("workflow",i,this.options);return a?a(null,t):Promise.resolve(t)}catch(p){return a?a(p):Promise.reject(p)}if(!n){const t=new Error("no workflow id specified");return a?a(t):Promise.reject(t)}const c={};try{const e=await this.read("workflow",n);if(e.error)throw new Error(e.error);t(c,e)}catch(p){return this.log.error(`${n}: error fetching workflow ${String(p)}`),a?a(p):Promise.reject(p)}t(c,{params:{}});try{const e=await tt.get(`workflow/config/${n}`,this.options);if(e.error)throw new Error(e.error);t(c,e)}catch(p){return this.log.error(`${n}: error fetching workflow config ${String(p)}`),a?a(p):Promise.reject(p)}const l=s(c.params,{widget:"ajax_dropdown"}),u=[...l.map((t,e)=>{const s=l[e];return new Promise((t,e)=>{const r=s.values.source.replace("{{EPI2ME_HOST}}","").replace(/&?apikey=\{\{EPI2ME_API_KEY\}\}/,"");tt.get(r,this.options).then(e=>{const r=e[s.values.data_root];return r&&(s.values=r.map(t=>({label:t[s.values.items.label_key],value:t[s.values.items.value_key]}))),t()}).catch(t=>(this.log.error(`failed to fetch ${r}`),e(t)))})})];try{return await Promise.all(u),a?a(null,c):Promise.resolve(c)}catch(p){return this.log.error(`${n}: error fetching config and parameters ${String(p)}`),a?a(p):Promise.reject(p)}}async startWorkflow(t){return tt.post("workflow_instance",t,e({},this.options,{legacy_form:!0}))}async stopWorkflow(t){return tt.put("workflow_instance/stop",t,null,e({},this.options,{legacy_form:!0}))}async workflowInstances(t){return t&&t.run_id?tt.get(`workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=${t.run_id};`,this.options).then(t=>t.data.map(t=>({id_workflow_instance:t.id_ins,id_workflow:t.id_flo,run_id:t.run_id,description:t.desc,rev:t.rev}))):this.list("workflow_instance")}async workflowInstance(t){return this.read("workflow_instance",t)}async workflowConfig(t){return tt.get(`workflow/config/${t}`,this.options)}async register(t,s){return tt.put("reg",t,{description:s||`${k.userInfo().username}@${k.hostname()}`},e({},this.options,{signing:!1}))}async datasets(t){let e=t;return e||(e={}),e.show||(e.show="mine"),this.list(`dataset?show=${e.show}`)}async dataset(t){return this.options.local?this.datasets().then(e=>e.find(e=>e.id_dataset===t)):this.read("dataset",t)}async fetchContent(t){const s=e({},this.options,{skip_url_mangle:!0,headers:{"Content-Type":""}});let r;try{if(r=(await tt.head(t,s)).headers.etag,r&&this.cachedResponses[t]&&this.cachedResponses[t].etag===r)return this.cachedResponses[t].response}catch(n){this.log.warn(`Failed to HEAD request ${t}: ${String(n)}`)}const o=await tt.get(t,s);return r&&(this.cachedResponses[t]={etag:r,response:o}),o}}class ot{constructor(e,s){this.debounces={},this.debounceWindow=t({debounceWindow:2e3},s).debounceWindow,this.log=t({log:{debug:()=>{}}},s).log,e.jwt().then(t=>{this.socket=v(s.url,{transportOptions:{polling:{extraHeaders:{Cookie:`x-epi2me-jwt=${t}`}}}}),this.socket.on("connect",()=>{this.log.debug("socket ready")})}).catch(t=>{this.log.error("socket connection failed - JWT authentication error")})}debounce(e,s){const r=t(e)._uuid;if(r){if(this.debounces[r])return;this.debounces[r]=1,setTimeout(()=>{delete this.debounces[r]},this.debounceWindow)}s&&s(e)}watch(t,e){if(!this.socket)return this.log.debug(`socket not ready. requeueing watch on ${t}`),void setTimeout(()=>{this.watch(t,e)},1e3);this.socket.on(t,t=>this.debounce(t,e))}emit(t,e){if(!this.socket)return this.log.debug(`socket not ready. requeueing emit on ${t}`),void setTimeout(()=>{this.emit(t,e)},1e3);this.log.debug(`socket emit ${t} ${JSON.stringify(e)}`),this.socket.emit(t,e)}}class nt{constructor(e){let s;if(s="string"===typeof e||"object"===typeof e&&e.constructor===String?JSON.parse(e):e||{},s.endpoint&&(s.url=s.endpoint,delete s.endpoint),s.log){if(!r([s.log.info,s.log.warn,s.log.error,s.log.debug,s.log.json],o))throw new Error("expected log object to have error, debug, info, warn and json methods");this.log=s.log}else this.log={info:t=>{console.info(`[${(new Date).toISOString()}] INFO: ${t}`)},debug:t=>{console.debug(`[${(new Date).toISOString()}] DEBUG: ${t}`)},warn:t=>{console.warn(`[${(new Date).toISOString()}] WARN: ${t}`)},error:t=>{console.error(`[${(new Date).toISOString()}] ERROR: ${t}`)},json:t=>{console.log(JSON.stringify(t))}};this.stopped=!0,this.uploadState$=new i(!1),this.analyseState$=new i(!1),this.reportState$=new i(!1),this.instanceTelemetry$=new i(null),this.experimentalWorkerStatus$=new i(null),this.runningStates$=a(this.uploadState$,this.analyseState$,this.reportState$),this.states={upload:{filesCount:0,success:{files:0,bytes:0,reads:0},types:{},niceTypes:"",progress:{bytes:0,total:0}},download:{progress:{},success:{files:0,reads:0,bytes:0},fail:0,types:{},niceTypes:""},warnings:[]},this.liveStates$=new i(this.states),this.config={options:n(s,b),instance:{id_workflow_instance:s.id_workflow_instance,inputQueueName:null,outputQueueName:null,outputQueueURL:null,discoverQueueCache:{},bucket:null,bucketFolder:null,remote_addr:null,chain:null,key_id:null}},this.config.instance.awssettings={region:this.config.options.region},this.REST=new rt(t({log:this.log},this.config.options)),this.graphQL=new et(t({log:this.log},this.config.options)),this.timers={downloadCheckInterval:null,stateCheckInterval:null,fileCheckInterval:null,transferTimeouts:{},visibilityIntervals:{},summaryTelemetryInterval:null}}async socket(){if(this.mySocket)return this.mySocket;this.mySocket=new ot(this.REST,t({log:this.log},this.config.options));const{id_workflow_instance:e}=this.config.instance;return e&&this.mySocket.watch(`workflow_instance:state:${e}`,t=>{const{instance:e}=this.config;if(e){const{summaryTelemetry:s}=e,r=Object.entries(e.chain.components).sort((t,e)=>t[0]-e[0]).reduce((e,r)=>{const[o,n]=r;if(!t[o])return e;const i=+o,a=i&&Object.keys(s[n.wid])[0]||"ROOT",[h,c,l]=t[o].split(",").map(t=>Math.max(0,+t));return[...e,{running:h,complete:c,error:l,step:i,name:a}]},[]);this.experimentalWorkerStatus$.next(r)}}),this.mySocket}async realtimeFeedback(t,e){(await this.socket()).emit(t,e)}stopTimer(t){this.timers[t]&&(this.log.debug(`clearing ${t} interval`),clearInterval(this.timers[t]),this.timers[t]=null)}async stopAnalysis(){this.stopUpload(),this.stopped=!0;const{id_workflow_instance:t}=this.config.instance;if(t){try{this.config.options.graphQL?await this.graphQL.stopWorkflow({variables:{idWorkflowInstance:t}}):await this.REST.stopWorkflow(t),this.analyseState$.next(!1)}catch(e){return this.log.error(`Error stopping instance: ${String(e)}`),Promise.reject(e)}this.log.info(`workflow instance ${t} stopped`)}return Promise.resolve()}async stopUpload(){this.log.debug("stopping watchers"),["stateCheckInterval","fileCheckInterval"].forEach(t=>this.stopTimer(t)),this.uploadState$.next(!1)}async stopEverything(){this.stopAnalysis(),Object.keys(this.timers.transferTimeouts).forEach(t=>{this.log.debug(`clearing transferTimeout for ${t}`),clearTimeout(this.timers.transferTimeouts[t]),delete this.timers.transferTimeouts[t]}),Object.keys(this.timers.visibilityIntervals).forEach(t=>{this.log.debug(`clearing visibilityInterval for ${t}`),clearInterval(this.timers.visibilityIntervals[t]),delete this.timers.visibilityIntervals[t]}),this.downloadWorkerPool&&(this.log.debug("clearing downloadWorkerPool"),await Promise.all(Object.values(this.downloadWorkerPool)),this.downloadWorkerPool=null),["summaryTelemetryInterval","downloadCheckInterval"].forEach(t=>this.stopTimer(t))}reportProgress(){const{upload:t,download:e}=this.states;this.log.json({progress:{download:e,upload:t}})}storeState(t,e,s,r){const o=r||{};this.states[t]||(this.states[t]={}),this.states[t][e]||(this.states[t][e]={}),"incr"===s?Object.keys(o).forEach(s=>{this.states[t][e][s]=this.states[t][e][s]?this.states[t][e][s]+parseInt(o[s],10):parseInt(o[s],10)}):Object.keys(o).forEach(s=>{this.states[t][e][s]=this.states[t][e][s]?this.states[t][e][s]-parseInt(o[s],10):-parseInt(o[s],10)});try{this.states[t].success.niceReads=st(this.states[t].success.reads)}catch(i){this.states[t].success.niceReads=0}try{this.states[t].progress.niceSize=st(this.states[t].success.bytes+this.states[t].progress.bytes||0)}catch(i){this.states[t].progress.niceSize=0}try{this.states[t].success.niceSize=st(this.states[t].success.bytes)}catch(i){this.states[t].success.niceSize=0}this.states[t].niceTypes=Object.keys(this.states[t].types||{}).sort().map(e=>`${this.states[t].types[e]} ${e}`).join(", ");const n=Date.now();(!this.stateReportTime||n-this.stateReportTime>2e3)&&(this.stateReportTime=n,this.reportProgress()),this.liveStates$.next(Object.assign({},this.states))}uploadState(t,e,s){return this.storeState("upload",t,e,s)}downloadState(t,e,s){return this.storeState("download",t,e,s)}url(){return this.config.options.url}apikey(){return this.config.options.apikey}attr(t,e){if(!(t in this.config.options))throw new Error(`config object does not contain property ${t}`);return e?(this.config.options[t]=e,this):this.config.options[t]}stats(t){return this.states[t]}}nt.version=tt.version,nt.Profile=class{constructor(e){this.allProfileData={},this.defaultEndpoint=process.env.METRICHOR||b.url,e&&(this.allProfileData=t({profiles:{}},e)),this.allProfileData.endpoint&&(this.defaultEndpoint=this.allProfileData.endpoint)}profile(e){return e?t({endpoint:this.defaultEndpoint},t({profiles:{}},this.allProfileData).profiles[e]):{}}profiles(){return Object.keys(this.allProfileData.profiles||{})}},nt.REST=rt,nt.utils=tt;export default nt;
