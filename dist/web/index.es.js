/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2020
 */

import{BehaviorSubject as e,combineLatest as t}from"rxjs";import s from"graphql-tag";import{InMemoryCache as r}from"apollo-cache-inmemory";import o from"apollo-client";import{ApolloLink as n,execute as i}from"apollo-link";import{createHttpLink as a}from"apollo-link-http";import{buildAxiosFetch as c}from"@lifeomic/axios-fetch";import l from"axios";import h from"crypto";import{merge as u,assign as p,countBy as f}from"lodash";import{httpsOverHttps as d,httpsOverHttp as g}from"tunnel";import m from"os";import w from"socket.io-client";var y=!1,v="https://epi2me.nanoporetech.com",k="EPI2ME API",b="eu-west-1",$=5,S=1200,I=1200,E=5,T=3,O=60,j=600,x=20,_=30,A=3,C="data+telemetry",P=[".fastq",".fq",".fastq.gz",".fq.gz"],R=!0,W="/data";const q="\npage\npages\nhasNext\nhasPrevious\ntotalCount\n",D="\nidWorkflowInstance\nstartDate\nworkflowImage{\n  workflow\n  {\n    rev\n    name\n  }\n}\n";var U="undefined"!==typeof globalThis?globalThis:"undefined"!==typeof window?window:"undefined"!==typeof global?global:"undefined"!==typeof self?self:{};function z(e,t,s){return e(s={path:t,exports:{},require:function(e,t){return function(){throw new Error("Dynamic requires are not currently supported by @rollup/plugin-commonjs")}((void 0===t||null===t)&&s.path)}},s.exports),s.exports}var H=z((function(e,t){!function(s){var r=t&&!t.nodeType&&t,o=e&&!e.nodeType&&e,n="object"==typeof U&&U;n.global!==n&&n.window!==n&&n.self!==n||(s=n);var i,a,c=2147483647,l=/^xn--/,h=/[^\x20-\x7E]/,u=/[\x2E\u3002\uFF0E\uFF61]/g,p={overflow:"Overflow: input needs wider integers to process","not-basic":"Illegal input >= 0x80 (not a basic code point)","invalid-input":"Invalid input"},f=Math.floor,d=String.fromCharCode;function g(e){throw RangeError(p[e])}function m(e,t){for(var s=e.length,r=[];s--;)r[s]=t(e[s]);return r}function w(e,t){var s=e.split("@"),r="";return s.length>1&&(r=s[0]+"@",e=s[1]),r+m((e=e.replace(u,".")).split("."),t).join(".")}function y(e){for(var t,s,r=[],o=0,n=e.length;o<n;)(t=e.charCodeAt(o++))>=55296&&t<=56319&&o<n?56320==(64512&(s=e.charCodeAt(o++)))?r.push(((1023&t)<<10)+(1023&s)+65536):(r.push(t),o--):r.push(t);return r}function v(e){return m(e,(function(e){var t="";return e>65535&&(t+=d((e-=65536)>>>10&1023|55296),e=56320|1023&e),t+=d(e)})).join("")}function k(e,t){return e+22+75*(e<26)-((0!=t)<<5)}function b(e,t,s){var r=0;for(e=s?f(e/700):e>>1,e+=f(e/t);e>455;r+=36)e=f(e/35);return f(r+36*e/(e+38))}function $(e){var t,s,r,o,n,i,a,l,h,u,p,d=[],m=e.length,w=0,y=128,k=72;for((s=e.lastIndexOf("-"))<0&&(s=0),r=0;r<s;++r)e.charCodeAt(r)>=128&&g("not-basic"),d.push(e.charCodeAt(r));for(o=s>0?s+1:0;o<m;){for(n=w,i=1,a=36;o>=m&&g("invalid-input"),((l=(p=e.charCodeAt(o++))-48<10?p-22:p-65<26?p-65:p-97<26?p-97:36)>=36||l>f((c-w)/i))&&g("overflow"),w+=l*i,!(l<(h=a<=k?1:a>=k+26?26:a-k));a+=36)i>f(c/(u=36-h))&&g("overflow"),i*=u;k=b(w-n,t=d.length+1,0==n),f(w/t)>c-y&&g("overflow"),y+=f(w/t),w%=t,d.splice(w++,0,y)}return v(d)}function S(e){var t,s,r,o,n,i,a,l,h,u,p,m,w,v,$,S=[];for(m=(e=y(e)).length,t=128,s=0,n=72,i=0;i<m;++i)(p=e[i])<128&&S.push(d(p));for(r=o=S.length,o&&S.push("-");r<m;){for(a=c,i=0;i<m;++i)(p=e[i])>=t&&p<a&&(a=p);for(a-t>f((c-s)/(w=r+1))&&g("overflow"),s+=(a-t)*w,t=a,i=0;i<m;++i)if((p=e[i])<t&&++s>c&&g("overflow"),p==t){for(l=s,h=36;!(l<(u=h<=n?1:h>=n+26?26:h-n));h+=36)$=l-u,v=36-u,S.push(d(k(u+$%v,0))),l=f($/v);S.push(d(k(l,0))),n=b(s,w,r==o),s=0,++r}++s,++t}return S.join("")}if(i={version:"1.3.2",ucs2:{decode:y,encode:v},decode:$,encode:S,toASCII:function(e){return w(e,(function(e){return h.test(e)?"xn--"+S(e):e}))},toUnicode:function(e){return w(e,(function(e){return l.test(e)?$(e.slice(4).toLowerCase()):e}))}},r&&o)if(e.exports==r)o.exports=i;else for(a in i)i.hasOwnProperty(a)&&(r[a]=i[a]);else s.punycode=i}(U)}));function F(e,t){return Object.prototype.hasOwnProperty.call(e,t)}var N=function(e,t,s,r){t=t||"&",s=s||"=";var o={};if("string"!==typeof e||0===e.length)return o;var n=/\+/g;e=e.split(t);var i=1e3;r&&"number"===typeof r.maxKeys&&(i=r.maxKeys);var a=e.length;i>0&&a>i&&(a=i);for(var c=0;c<a;++c){var l,h,u,p,f=e[c].replace(n,"%20"),d=f.indexOf(s);d>=0?(l=f.substr(0,d),h=f.substr(d+1)):(l=f,h=""),u=decodeURIComponent(l),p=decodeURIComponent(h),F(o,u)?Array.isArray(o[u])?o[u].push(p):o[u]=[o[u],p]:o[u]=p}return o},L=function(e){switch(typeof e){case"string":return e;case"boolean":return e?"true":"false";case"number":return isFinite(e)?e:"";default:return""}},M=function(e,t,s,r){return t=t||"&",s=s||"=",null===e&&(e=void 0),"object"===typeof e?Object.keys(e).map((function(r){var o=encodeURIComponent(L(r))+s;return Array.isArray(e[r])?e[r].map((function(e){return o+encodeURIComponent(L(e))})).join(t):o+encodeURIComponent(L(e[r]))})).join(t):r?encodeURIComponent(L(r))+s+encodeURIComponent(L(e)):""},G=z((function(e,t){t.decode=t.parse=N,t.encode=t.stringify=M})),B=function(e,t){return ne(e,!1,!0).resolve(t)};function J(){this.protocol=null,this.slashes=null,this.auth=null,this.host=null,this.port=null,this.hostname=null,this.hash=null,this.search=null,this.query=null,this.pathname=null,this.path=null,this.href=null}var K=/^([a-z0-9.+-]+:)/i,X=/:[0-9]*$/,Q=["{","}","|","\\","^","`"].concat(["<",">",'"',"`"," ","\r","\n","\t"]),V=["'"].concat(Q),Y=["%","/","?",";","#"].concat(V),Z=["/","?","#"],ee=/^[a-z0-9A-Z_-]{0,63}$/,te=/^([a-z0-9A-Z_-]{0,63})(.*)$/,se={javascript:!0,"javascript:":!0},re={javascript:!0,"javascript:":!0},oe={http:!0,https:!0,ftp:!0,gopher:!0,file:!0,"http:":!0,"https:":!0,"ftp:":!0,"gopher:":!0,"file:":!0};function ne(e,t,s){if(e&&ae(e)&&e instanceof J)return e;var r=new J;return r.parse(e,t,s),r}function ie(e){return"string"===typeof e}function ae(e){return"object"===typeof e&&null!==e}function ce(e){return null===e}J.prototype.parse=function(e,t,s){if(!ie(e))throw new TypeError("Parameter 'url' must be a string, not "+typeof e);var r=e;r=r.trim();var o=K.exec(r);if(o){var n=(o=o[0]).toLowerCase();this.protocol=n,r=r.substr(o.length)}if(s||o||r.match(/^\/\/[^@\/]+@[^@\/]+/)){var i="//"===r.substr(0,2);!i||o&&re[o]||(r=r.substr(2),this.slashes=!0)}if(!re[o]&&(i||o&&!oe[o])){for(var a,c,l=-1,h=0;h<Z.length;h++){-1!==(u=r.indexOf(Z[h]))&&(-1===l||u<l)&&(l=u)}-1!==(c=-1===l?r.lastIndexOf("@"):r.lastIndexOf("@",l))&&(a=r.slice(0,c),r=r.slice(c+1),this.auth=decodeURIComponent(a)),l=-1;for(h=0;h<Y.length;h++){var u;-1!==(u=r.indexOf(Y[h]))&&(-1===l||u<l)&&(l=u)}-1===l&&(l=r.length),this.host=r.slice(0,l),r=r.slice(l),this.parseHost(),this.hostname=this.hostname||"";var p="["===this.hostname[0]&&"]"===this.hostname[this.hostname.length-1];if(!p)for(var f=this.hostname.split(/\./),d=(h=0,f.length);h<d;h++){var g=f[h];if(g&&!g.match(ee)){for(var m="",w=0,y=g.length;w<y;w++)g.charCodeAt(w)>127?m+="x":m+=g[w];if(!m.match(ee)){var v=f.slice(0,h),k=f.slice(h+1),b=g.match(te);b&&(v.push(b[1]),k.unshift(b[2])),k.length&&(r="/"+k.join(".")+r),this.hostname=v.join(".");break}}}if(this.hostname.length>255?this.hostname="":this.hostname=this.hostname.toLowerCase(),!p){var $=this.hostname.split("."),S=[];for(h=0;h<$.length;++h){var I=$[h];S.push(I.match(/[^A-Za-z0-9_-]/)?"xn--"+H.encode(I):I)}this.hostname=S.join(".")}var E=this.port?":"+this.port:"",T=this.hostname||"";this.host=T+E,this.href+=this.host,p&&(this.hostname=this.hostname.substr(1,this.hostname.length-2),"/"!==r[0]&&(r="/"+r))}if(!se[n])for(h=0,d=V.length;h<d;h++){var O=V[h],j=encodeURIComponent(O);j===O&&(j=escape(O)),r=r.split(O).join(j)}var x=r.indexOf("#");-1!==x&&(this.hash=r.substr(x),r=r.slice(0,x));var _=r.indexOf("?");if(-1!==_?(this.search=r.substr(_),this.query=r.substr(_+1),t&&(this.query=G.parse(this.query)),r=r.slice(0,_)):t&&(this.search="",this.query={}),r&&(this.pathname=r),oe[n]&&this.hostname&&!this.pathname&&(this.pathname="/"),this.pathname||this.search){E=this.pathname||"",I=this.search||"";this.path=E+I}return this.href=this.format(),this},J.prototype.format=function(){var e=this.auth||"";e&&(e=(e=encodeURIComponent(e)).replace(/%3A/i,":"),e+="@");var t=this.protocol||"",s=this.pathname||"",r=this.hash||"",o=!1,n="";this.host?o=e+this.host:this.hostname&&(o=e+(-1===this.hostname.indexOf(":")?this.hostname:"["+this.hostname+"]"),this.port&&(o+=":"+this.port)),this.query&&ae(this.query)&&Object.keys(this.query).length&&(n=G.stringify(this.query));var i=this.search||n&&"?"+n||"";return t&&":"!==t.substr(-1)&&(t+=":"),this.slashes||(!t||oe[t])&&!1!==o?(o="//"+(o||""),s&&"/"!==s.charAt(0)&&(s="/"+s)):o||(o=""),r&&"#"!==r.charAt(0)&&(r="#"+r),i&&"?"!==i.charAt(0)&&(i="?"+i),t+o+(s=s.replace(/[?#]/g,(function(e){return encodeURIComponent(e)})))+(i=i.replace("#","%23"))+r},J.prototype.resolve=function(e){return this.resolveObject(ne(e,!1,!0)).format()},J.prototype.resolveObject=function(e){if(ie(e)){var t=new J;t.parse(e,!1,!0),e=t}var s=new J;if(Object.keys(this).forEach((function(e){s[e]=this[e]}),this),s.hash=e.hash,""===e.href)return s.href=s.format(),s;if(e.slashes&&!e.protocol)return Object.keys(e).forEach((function(t){"protocol"!==t&&(s[t]=e[t])})),oe[s.protocol]&&s.hostname&&!s.pathname&&(s.path=s.pathname="/"),s.href=s.format(),s;if(e.protocol&&e.protocol!==s.protocol){if(!oe[e.protocol])return Object.keys(e).forEach((function(t){s[t]=e[t]})),s.href=s.format(),s;if(s.protocol=e.protocol,e.host||re[e.protocol])s.pathname=e.pathname;else{for(var r=(e.pathname||"").split("/");r.length&&!(e.host=r.shift()););e.host||(e.host=""),e.hostname||(e.hostname=""),""!==r[0]&&r.unshift(""),r.length<2&&r.unshift(""),s.pathname=r.join("/")}if(s.search=e.search,s.query=e.query,s.host=e.host||"",s.auth=e.auth,s.hostname=e.hostname||e.host,s.port=e.port,s.pathname||s.search){var o=s.pathname||"",n=s.search||"";s.path=o+n}return s.slashes=s.slashes||e.slashes,s.href=s.format(),s}var i=s.pathname&&"/"===s.pathname.charAt(0),a=e.host||e.pathname&&"/"===e.pathname.charAt(0),c=a||i||s.host&&e.pathname,l=c,h=s.pathname&&s.pathname.split("/")||[],u=(r=e.pathname&&e.pathname.split("/")||[],s.protocol&&!oe[s.protocol]);if(u&&(s.hostname="",s.port=null,s.host&&(""===h[0]?h[0]=s.host:h.unshift(s.host)),s.host="",e.protocol&&(e.hostname=null,e.port=null,e.host&&(""===r[0]?r[0]=e.host:r.unshift(e.host)),e.host=null),c=c&&(""===r[0]||""===h[0])),a)s.host=e.host||""===e.host?e.host:s.host,s.hostname=e.hostname||""===e.hostname?e.hostname:s.hostname,s.search=e.search,s.query=e.query,h=r;else if(r.length)h||(h=[]),h.pop(),h=h.concat(r),s.search=e.search,s.query=e.query;else if(null!=e.search){if(u)s.hostname=s.host=h.shift(),(m=!!(s.host&&s.host.indexOf("@")>0)&&s.host.split("@"))&&(s.auth=m.shift(),s.host=s.hostname=m.shift());return s.search=e.search,s.query=e.query,ce(s.pathname)&&ce(s.search)||(s.path=(s.pathname?s.pathname:"")+(s.search?s.search:"")),s.href=s.format(),s}if(!h.length)return s.pathname=null,s.search?s.path="/"+s.search:s.path=null,s.href=s.format(),s;for(var p=h.slice(-1)[0],f=(s.host||e.host)&&("."===p||".."===p)||""===p,d=0,g=h.length;g>=0;g--)"."==(p=h[g])?h.splice(g,1):".."===p?(h.splice(g,1),d++):d&&(h.splice(g,1),d--);if(!c&&!l)for(;d--;d)h.unshift("..");!c||""===h[0]||h[0]&&"/"===h[0].charAt(0)||h.unshift(""),f&&"/"!==h.join("/").substr(-1)&&h.push("");var m,w=""===h[0]||h[0]&&"/"===h[0].charAt(0);u&&(s.hostname=s.host=w?"":h.length?h.shift():"",(m=!!(s.host&&s.host.indexOf("@")>0)&&s.host.split("@"))&&(s.auth=m.shift(),s.host=s.hostname=m.shift()));return(c=c||s.host&&h.length)&&!w&&h.unshift(""),h.length?s.pathname=h.join("/"):(s.pathname=null,s.path=null),ce(s.pathname)&&ce(s.search)||(s.path=(s.pathname?s.pathname:"")+(s.search?s.search:"")),s.auth=e.auth||s.auth,s.slashes=s.slashes||e.slashes,s.href=s.format(),s},J.prototype.parseHost=function(){var e=this.host,t=X.exec(e);t&&(":"!==(t=t[0])&&(this.port=t.substr(1)),e=e.substr(0,e.length-t.length)),e&&(this.hostname=e)};const le=(...e)=>{},he={debug:le,error:le,info:le,warn:le},ue={info(...e){console.info(`[${(new Date).toISOString()}] INFO:`,...e)},debug(...e){console.debug(`[${(new Date).toISOString()}] DEBUG:`,...e)},warn(...e){console.warn(`[${(new Date).toISOString()}] WARN:`,...e)},error(...e){console.error(`[${(new Date).toISOString()}] ERROR:`,...e)}},pe=(()=>{const e=(e,t={})=>{if(e.headers||(e.headers={}),!t.apikey||!t.apisecret)return;e.headers["X-EPI2ME-APIKEY"]=t.apikey,e.headers["X-EPI2ME-SIGNATUREDATE"]=(new Date).toISOString();const s=[Object.keys(e.headers).sort().filter(e=>e.match(/^x-epi2me/i)).map(t=>`${t}:${e.headers[t]}`).join("\n"),e.body].join("\n"),r=h.createHmac("sha1",t.apisecret).update(s).digest("hex");e.headers["X-EPI2ME-SIGNATUREV0"]=r};return{version:"3.0.1749",setHeaders:(t,s={})=>{var r,o;if(t.headers=u({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-CLIENT":s.user_agent||"api","X-EPI2ME-VERSION":s.agent_version||pe.version},t.headers,s.headers),(null===(r=s.signing)||void 0===r||r)&&e(t,s),s.proxy){const e=s.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/);if(!e)throw new Error("Failed to parse Proxy URL");const r=e[2],n=e[3],i={host:e[4],port:+e[5]};r&&n&&(i.proxyAuth=`${r}:${n}`);const a=null!==(o=s.log)&&void 0!==o?o:he;s.proxy.match(/^https/)?(a.debug("using HTTPS over HTTPS proxy",JSON.stringify(i)),t.httpsAgent=d({proxy:i})):(a.debug("using HTTPS over HTTP proxy",JSON.stringify(i)),t.httpsAgent=g({proxy:i})),t.proxy=!1}}}})(),fe=c(l),de=new Set(["get","delete","head","options","post","put","patch","link","unlink"]);function ge({apikey:e,apisecret:t}){return(s,r={})=>{let o;if(r.method&&(n=r.method,!de.has(n.toLowerCase())))throw new Error(`Invalid method ${r.method}`);var n;return o=r,pe.setHeaders(o,{apikey:e,apisecret:t,signing:!0}),fe(s,r)}}const me=new o({link:new n(e=>{const{apikey:t,apisecret:s,url:r}=e.getContext(),o=ge({apikey:t,apisecret:s}),n=a({uri:B(r,"/graphql"),fetch:o,headers:{keys:{apikey:t,apisecret:s}}});return i(n,e)}),cache:new r});function we(e){return"object"===typeof e&&!1===Array.isArray(e)}function ye(e){return"function"===typeof e}function ve(e){return Array.isArray(e)}function ke(e){return"undefined"===typeof e}function be(e){return null===e||"undefined"===typeof e}function $e(e,t){if(function(e){return"string"===typeof e}(e))return e;if(be(e)&&"undefined"!==typeof t)return t;throw new Error(`Unable to cast ${typeof e} to String`)}function Se(e,t){if(function(e){return"number"===typeof e}(e))return e;if(be(e)&&"undefined"!==typeof t)return t;throw new Error(`Unable to cast ${typeof e} to Number`)}function Ie(e,t){if(function(e){return"number"===typeof e||"string"===typeof e}(e))return e;if(be(e)&&"undefined"!==typeof t)return t;throw new Error(`Unable to cast ${typeof e} to Index`)}function Ee(e,t){if(we(e))return e;if(be(e)&&"undefined"!==typeof t)return t;throw new Error(`Unable to cast ${typeof e} to Indexable`)}function Te(e,t){if(function(e){return"boolean"===typeof e}(e))return e;if(be(e)&&"undefined"!==typeof t)return t;throw new Error(`Unable to cast ${typeof e} to Boolean`)}function Oe(e,t){if(ve(e))return e;if(be(e)&&"undefined"!==typeof t)return t;throw new Error(`Unable to cast ${typeof e} to Array`)}function je(e,t){if(we(e))return e;if(be(e)&&"undefined"!==typeof t)return t;throw new Error(`Unable to cast ${typeof e} to Record`)}function xe(e,t){if(ye(e))return e;if(be(e)&&"undefined"!==typeof t)return t;throw new Error(`Unable to cast ${typeof e} to Function`)}function _e(e,t,s){if(be(e)&&"undefined"!==typeof s)return s;if(ve(e))return e.map(t);throw new Error(`Unable to cast ${typeof e} to Array`)}function Ae(e){if(!be(e))return $e(e)}function Ce(e){if(!be(e))return Se(e)}function Pe(e){if(!be(e))return Ie(e)}function Re(e){if(!be(e))return Te(e)}function We(e){if(!be(e))return xe(e)}l.defaults.validateStatus=e=>e<=504;const qe=function(){const e={sign:(e,t)=>{var s,r;if(!t)return;if(e.headers||(e.headers={}),!t.apikey)return;if(e.headers["X-EPI2ME-ApiKey"]=t.apikey,!t.apisecret)return;e.headers["X-EPI2ME-SignatureDate"]=(new Date).toISOString(),(null===(s=e.url)||void 0===s?void 0:s.match(/^https:/))&&(e.url=e.url.replace(/:443/,"")),(null===(r=e.url)||void 0===r?void 0:r.match(/^http:/))&&(e.url=e.url.replace(/:80/,""));const o=[e.url,Object.keys(e.headers).sort().filter(e=>e.match(/^x-epi2me/i)).map(t=>`${t}:${e.headers[t]}`).join("\n")].join("\n"),n=h.createHmac("sha1",t.apisecret).update(o).digest("hex");e.headers["X-EPI2ME-SignatureV0"]=n},responseHandler(e){const t=e?je(e.data):null;if(!t)throw new Error("unexpected non-json response");if(e&&e.status>=400){let s=`Network error ${e.status}`;throw t.error&&(s=t.error+""),504===e.status&&(s="Please check your network connection and try again."),new Error(s)}if(t.error)throw new Error(t.error+"");return t}};return{version:"3.0.1749",headers(t,s){var r,o;if(t.headers=u({Accept:"application/json","Content-Type":"application/json","X-EPI2ME-Client":s.user_agent||"api","X-EPI2ME-Version":s.agent_version||qe.version},t.headers,s.headers),(null===(r=s.signing)||void 0===r||r)&&e.sign(t,s),s.proxy){const e=s.proxy.match(/https?:\/\/((\S+):(\S+)@)?(\S+):(\d+)/);if(!e)throw new Error("Failed to parse Proxy URL");const r=e[2],n=e[3],i={host:e[4],port:parseInt(e[5],10)};r&&n&&(i.proxyAuth=`${r}:${n}`);const a=null!==(o=s.log)&&void 0!==o?o:he;s.proxy.match(/^https/)?(a.debug("using HTTPS over HTTPS proxy",JSON.stringify(i)),t.httpsAgent=d({proxy:i})):(a.debug("using HTTPS over HTTP proxy",JSON.stringify(i)),t.httpsAgent=g({proxy:i})),t.proxy=!1}},async head(e,t){var s;const r={url:this.mangleURL(e,t)};if(this.headers(r,t),!r.url)throw new Error("unreachable: url argument in HEAD was deleted");(null!==(s=t.log)&&void 0!==s?s:he).debug("HEAD",r.url);const o=await l.head(r.url,r);if(o&&o.status>=400){if(504===o.status)throw new Error("Please check your network connection and try again.");throw new Error(`Network error ${o.status}`)}return o},async get(t,s){var r;const o={url:this.mangleURL(t,s)};if(this.headers(o,s),!o.url)throw new Error("unreachable: url argument in GET was deleted");(null!==(r=s.log)&&void 0!==r?r:he).debug("GET",o.url);const n=await l.get(o.url,o);return e.responseHandler(n)},async post(t,s,r){var o;let n=r.url;n=n.replace(/\/+$/,"");const i={url:`${n}/${t.replace(/\/+/g,"/")}`,data:s,headers:{}};r.legacy_form&&this.processLegacyForm(i,s),this.headers(i,r);const{data:a}=i;delete i.data;const c=null!==(o=r.log)&&void 0!==o?o:he;if(!i.url)throw new Error("unreachable: url argument in POST was deleted");c.debug("POST",i.url);const h=await l.post(i.url,a,i);return r.handler?r.handler(h):e.responseHandler(h)},async put(t,s,r,o){var n;let i=o.url;i=i.replace(/\/+$/,"");const a={url:`${i}/${t.replace(/\/+/g,"/")}/${s}`,data:r,headers:{}};o.legacy_form&&this.processLegacyForm(a,r),this.headers(a,o);const{data:c}=a;delete a.data;const h=null!==(n=o.log)&&void 0!==n?n:he;if(!a.url)throw new Error("unreachable: url argument in PUT was deleted");h.debug("PUT",a.url);const u=await l.put(a.url,c,a);return e.responseHandler(u)},mangleURL(e,t){let s=t.url;return t.skip_url_mangle?e:(e=`/${e}`,s=s.replace(/\/+$/,""),s+(e=e.replace(/\/+/g,"/")))},processLegacyForm(e,t){const s=[],r=u({json:JSON.stringify(t)},t);Object.keys(r).sort().forEach(e=>{s.push(`${e}=${escape(r[e]+"")}`)}),e.data=s.join("&"),e.headers["Content-Type"]="application/x-www-form-urlencoded"},convertResponseToObject(e){if("object"===typeof e)return e;try{return JSON.parse(e)}catch(t){throw new Error(`exception parsing chain JSON ${String(t)}`)}}}}();class De{constructor(e){this.client=me,this.createContext=e=>{const{apikey:t,apisecret:s,url:r}=this.options;return Object.assign({apikey:t,apisecret:s,url:r},e)},this.resetCache=()=>{this.client.resetStore()},this.workflows=this.query(s`
    query allWorkflows($page: Int, $pageSize: Int, $isActive: Int, $orderBy: String, $region: String) {
      allWorkflows(page: $page, pageSize: $pageSize, isActive: $isActive, orderBy: $orderBy, region: $region) {
        ${q}
        results {
          ${"\nidWorkflow\nname\ndescription\nsummary\nrev\n"}
        }
      }
    }
  `),this.workflowPages=async e=>{let t=e,s=await this.workflows({variables:{page:t}});const r=async e=>(t=e,s=await this.workflows({variables:{page:t}}),s);return{data:s,next:()=>r(t+1),previous:()=>r(t-1),first:()=>r(1),last:()=>r(0)}},this.workflow=this.query(s`
    query workflow($idWorkflow: ID!) {
      workflow(idWorkflow: $idWorkflow) {
        ${"\nidWorkflow\nname\ndescription\nsummary\nrev\n"}
      }
    }
   `),this.workflowInstances=this.query(s`
  query allWorkflowInstances($page: Int, $pageSize: Int, $shared: Boolean, $idUser: ID, $orderBy: String) {
    allWorkflowInstances(page: $page, pageSize: $pageSize, shared: $shared, idUser: $idUser, orderBy: $orderBy) {
      ${q}
      results {
        ${D}
      }
    }
  }
   `),this.workflowInstance=this.query(s`
      query workflowInstance($idWorkflowInstance: ID!) {
        workflowInstance(idWorkflowInstance: $idWorkflowInstance) {
          ${D}
        }
      }
   `),this.startWorkflow=this.mutate(s`
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
  `),this.stopWorkflow=this.mutate(s`
    mutation stopWorkflowInstance($idWorkflowInstance: ID!) {
      stopData: stopWorkflowInstance(idWorkflowInstance: $idWorkflowInstance) {
        success
        message
      }
    }
  `),this.instanceToken=this.mutate(s`
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
  `),this.user=this.query(s`
    query user {
      me {
        username
        realname
        useraccountSet {
          idUserAccount
        }
      }
    }
  `),this.updateUser=this.mutate(s`
    mutation updateUser($idRegionPreferred: ID!) {
      updateUser(idRegionPreferred: $idRegionPreferred) {
        idRegionPreferred
      }
    }
  `),this.register=this.mutate(s`
    mutation registerToken($code: String!, $description: String) {
      registerToken(code: $code, description: $description) {
        apikey
        apisecret
        description
      }
    }
  `),this.status=this.query(s`
    query status {
      status {
        portalVersion
        remoteAddr
        serverTime
        minimumAgent
        dbVersion
      }
    }
  `),this.regions=this.query(s`
    query regions {
      regions {
        idRegion
        description
        name
      }
    }
  `);let t=e.url;t=t.replace(/:\/\//,"://graphql."),t=t.replace(/\/$/,"");const{apikey:r,apisecret:o,log:n,local:i,signing:a}=e;this.options={url:t,agent_version:e.agent_version,local:i,user_agent:e.user_agent,signing:a,apikey:r,apisecret:o},this.log=n}query(e){return t=>{var r,o,n;const i=null!==(r=null===t||void 0===t?void 0:t.context)&&void 0!==r?r:{},a=null!==(o=null===t||void 0===t?void 0:t.variables)&&void 0!==o?o:{},c=null!==(n=null===t||void 0===t?void 0:t.options)&&void 0!==n?n:{},l=this.createContext(i);let h;return h="string"===typeof e?s`
          ${e}
        `:"function"===typeof e?s`
          ${e(q)}
        `:e,this.client.query(Object.assign(Object.assign({query:h,variables:a},c),{context:l}))}}mutate(e){return t=>{var r,o,n;const i=null!==(r=null===t||void 0===t?void 0:t.context)&&void 0!==r?r:{},a=null!==(o=null===t||void 0===t?void 0:t.variables)&&void 0!==o?o:{},c=null!==(n=null===t||void 0===t?void 0:t.options)&&void 0!==n?n:{},l=this.createContext(i);let h;return h="string"===typeof e?s`
          ${e}
        `:e,this.client.mutate(Object.assign(Object.assign({mutation:h,variables:a},c),{context:l}))}}async healthCheck(){return{status:Te((await qe.get("/status",Object.assign(Object.assign({},this.options),{log:{debug:le}}))).status)}}}De.NETWORK_ONLY="network-only",De.CACHE_FIRST="cache-first",De.CACHE_AND_NETWORK="cache-and-network",De.CACHE_ONLY="cache-only",De.NO_CACHE="no-cache";const Ue=(e,t)=>{const s=["","K","M","G","T","P","E","Z"];let r=t||0,o=e||0;return o>=1e3?(o/=1e3,r+=1,r>=s.length?"???":Ue(o,r)):0===r?`${o}${s[r]}`:`${o.toFixed(1)}${s[r]}`};class ze{constructor(e){this.cachedResponses=new Map,this.options=e,this.log=this.options.log}async list(e){const t=e.match(/^[a-z_]+/i);if(!t)throw new Error("Failed to parse entity identifier");return Oe((await qe.get(e,this.options))[`${t[0]}s`])}read(e,t){return qe.get(`${e}/${t}`,this.options)}async user(){return this.options.local?{accounts:[{id_user_account:"none",number:"NONE",name:"None"}]}:qe.get("user",this.options)}async status(){return qe.get("status",this.options)}async jwt(){return $e(await qe.post("authenticate",{},Object.assign(Object.assign({},this.options),{handler:async e=>{if(e.headers["x-epi2me-jwt"])return e.headers["x-epi2me-jwt"];throw new Error("failed to fetch JWT")}})))}async instanceToken(e,t){return qe.post("token",u(t,{id_workflow_instance:e}),p({},this.options,{legacy_form:!0}))}async installToken(e){return qe.post("token/install",{id_workflow:e},p({},this.options,{legacy_form:!0}))}attributes(){return this.list("attribute")}async workflows(e){const t=this.list("workflow");if(e)try{e(null,await t)}catch(s){e(s,null)}return t}amiImages(){if(this.options.local)throw new Error("amiImages unsupported in local mode");return this.list("ami_image")}amiImage(e,t){if(this.options.local)throw new Error("ami_image unsupported in local mode");return t instanceof Object?this.updateAmiImage($e(e),je(t)):e instanceof Object?qe.post("ami_image",je(e),this.options):this.read("ami_image",$e(e))}updateAmiImage(e,t){return qe.put("ami_image",e,t,this.options)}createAmiImage(e){return qe.post("ami_image",e,this.options)}readAmiImage(e){return this.read("ami_image",e)}async workflow(e,t,s){if(e&&t&&s instanceof Function)return this.updateWorkflow($e(e),je(t),s);if(e&&t instanceof Object&&!(t instanceof Function))return this.updateWorkflow($e(e),je(t));if(e instanceof Object&&t instanceof Function)return this.createWorkflow(je(e),t);if(e instanceof Object&&!t)return this.createWorkflow(je(e));const r=Ae(e),o=We(t);if(!r){const e=new Error("no workflow id specified");return o?o(e):Promise.reject(e)}const n={};try{const e=await this.read("workflow",r);if(e.error)throw new Error(e.error+"");u(n,e)}catch(c){return this.log.error(`${r}: error fetching workflow ${String(c)}`),o?o(c):Promise.reject(c)}u(n,{params:{}});try{const e=await qe.get(`workflow/config/${r}`,this.options);if(e.error)throw new Error(e.error+"");u(n,e)}catch(c){return this.log.error(`${r}: error fetching workflow config ${String(c)}`),o?o(c):Promise.reject(c)}const i=ve(n.params)?Oe(n.params):je(n.params),a=[...Object.values(i).map(e=>je(e)).filter(e=>"ajax_dropdown"===e.widget).map(e=>new Promise((t,s)=>{if(ke(e))throw new Error("parameter is undefined");const r=je(e.values),o=je(r.items),n=$e(r.source).replace("{{EPI2ME_HOST}}","").replace(/&?apikey=\{\{EPI2ME_API_KEY\}\}/,"");qe.get(n,this.options).then(s=>{const n=Pe(r.data_root),i=function(e,t){if(!be(e))return _e(e,t)}(ke(n)?n:s[n],Ee);return i&&(e.values=i.map(e=>({label:e[Ie(o.label_key)],value:e[Ie(o.value_key)]}))),t()}).catch(e=>(this.log.error(`failed to fetch ${n}`),s(e)))}))];try{return await Promise.all(a),o?o(null,n):n}catch(c){return this.log.error(`${r}: error fetching config and parameters ${String(c)}`),o?o(c):Promise.reject(c)}}async updateWorkflow(e,t,s){const r=qe.put("workflow",e,t,this.options);if(s)try{s(null,await r)}catch(o){s(o)}return r}async createWorkflow(e,t){const s=qe.post("workflow",e,this.options);if(t)try{t(null,await s)}catch(r){f(r)}return s}async startWorkflow(e){return qe.post("workflow_instance",e,Object.assign(Object.assign({},this.options),{legacy_form:!0}))}async stopWorkflow(e){return qe.put("workflow_instance/stop",e.toString(),{},Object.assign(Object.assign({},this.options),{legacy_form:!0}))}async workflowInstances(e){if(!e||!e.run_id)return this.list("workflow_instance");return _e((await qe.get(`workflow_instance/wi?show=all&columns[0][name]=run_id;columns[0][searchable]=true;columns[0][search][regex]=true;columns[0][search][value]=${e.run_id};`,this.options)).data,je).map(e=>({id_workflow_instance:e.id_ins,id_workflow:e.id_flo,run_id:e.run_id,description:e.desc,rev:e.rev}))}async workflowInstance(e){return this.read("workflow_instance",e+"")}async workflowConfig(e){return qe.get(`workflow/config/${e}`,this.options)}async register(e,t){return qe.put("reg",e,{description:t||`${m.userInfo().username}@${m.hostname()}`},p({},this.options,{signing:!1}))}async datasets(e={}){if(ye(e))throw new Error("Unexpected callback instead of query");return e.show||(e.show="mine"),_e(await this.list(`dataset?show=${e.show}`),je)}async dataset(e){if(!this.options.local)return this.read("dataset",e);return _e(await this.datasets(),je).find(t=>t.id_dataset===e)}async fetchContent(e){const t=p({},this.options,{skip_url_mangle:!0,headers:{"Content-Type":""}});let s;try{s=(await qe.head(e,t)).headers.etag;const r=this.cachedResponses.get(e);if(s&&r&&r.etag===s)return r.response}catch(o){this.log.warn(`Failed to HEAD request ${e}: ${String(o)}`)}const r=await qe.get(e,t);return s&&this.cachedResponses.set(e,{etag:s,response:r}),r}}class He{constructor(e,t){var s;this.debounces=new Set,this.debounceWindow=null!==(s=t.debounceWindow)&&void 0!==s?s:2e3,this.log=t.log,this.initialise(e,t.url)}async initialise(e,t){try{const s=await e.jwt();this.socket=w(t,{transportOptions:{polling:{extraHeaders:{Cookie:`x-epi2me-jwt=${s}`}}}}),this.socket.on("connect",()=>{this.log.debug("socket ready")})}catch(s){this.log.error("socket connection failed - JWT authentication error")}}debounce(e,t){const s=u(e)._uuid;if(s){if(this.debounces.has(s))return;this.debounces.add(s),setTimeout(()=>{this.debounces.delete(s)},this.debounceWindow)}t&&t(e)}watch(e,t){if(!this.socket)return this.log.debug(`socket not ready. requeueing watch on ${e}`),void setTimeout(()=>{this.watch(e,t)},1e3);this.socket.on(e,e=>this.debounce(e,t))}emit(e,t){if(!this.socket)return this.log.debug(`socket not ready. requeueing emit on ${e}`),void setTimeout(()=>{this.emit(e,t)},1e3);this.log.debug(`socket emit ${e} ${JSON.stringify(t)}`),this.socket.emit(e,t)}}class Fe{constructor(s={}){let r;if(this.stopped=!0,this.uploadState$=new e(!1),this.analyseState$=new e(!1),this.reportState$=new e(!1),this.runningStates$=t(this.uploadState$,this.analyseState$,this.reportState$),this.instanceTelemetry$=new e(null),this.experimentalWorkerStatus$=new e(null),this.states={download:{progress:{bytes:0,total:0,niceSize:0},success:{files:0,bytes:0,reads:0,niceReads:0,niceSize:0},types:{},fail:0,niceTypes:""},upload:{progress:{bytes:0,total:0,niceSize:0},success:{files:0,bytes:0,reads:0,niceReads:0,niceSize:0},types:{},filesCount:0,niceTypes:""},warnings:[]},this.timers={transferTimeouts:{},visibilityIntervals:{}},this.liveStates$=new e(this.states),"string"===typeof s){const e=je(JSON.parse(s));r=Fe.parseOptObject(e)}else r=Fe.parseOptObject(s);this.config={options:r,instance:{id_workflow_instance:r.id_workflow_instance,discoverQueueCache:{},awssettings:{region:r.region}}},this.log=r.log,this.REST=new ze(r),this.graphQL=new De(r)}static parseOptObject(e){const t=$e(e.url,v),s={agent_version:$e(e.agent_version,qe.version),log:this.resolveLogger(e.log),local:Te(e.local,y),url:$e(e.endpoint,t),region:$e(e.region,b),user_agent:$e(e.user_agent,k),sessionGrace:Se(e.sessionGrace,$),uploadTimeout:Se(e.uploadTimeout,S),downloadTimeout:Se(e.downloadTimeout,I),fileCheckInterval:Se(e.fileCheckInterval,E),downloadCheckInterval:Se(e.downloadCheckInterval,T),stateCheckInterval:Se(e.stateCheckInterval,O),inFlightDelay:Se(e.inFlightDelay,j),waitTimeSeconds:Se(e.waitTimeSeconds,x),waitTokenError:Se(e.waitTokenError,_),transferPoolSize:Se(e.transferPoolSize,A),downloadMode:$e(e.downloadMode,C),filetype:_e(e.filetype,$e,P),signing:Te(e.signing,R),sampleDirectory:$e(e.sampleDirectory,W),useGraphQL:Re(e.useGraphQL),apikey:Ae(e.apikey),apisecret:Ae(e.apisecret),id_workflow_instance:Pe(e.id_workflow_instance),debounceWindow:Ce(e.debounceWindow),proxy:Ae(e.proxy),inputFolders:_e(e.inputFolders,$e,[]),outputFolder:Ae(e.outputFolder),awsAcceleration:Ae(e.awsAcceleration),agent_address:Ae(e.agent_address),telemetryCb:We(e.telemetryCb),dataCb:We(e.dataCb),remoteShutdownCb:We(e.remoteShutdownCb)};return e.inputFolder&&s.inputFolders.push($e(e.inputFolder)),s}static resolveLogger(e){if(!we(e))return ue;try{return{info:xe(e.info),debug:xe(e.debug),warn:xe(e.warn),error:xe(e.error)}}catch(t){throw new Error("expected log object to have error, debug, info and warn methods")}}async socket(){if(this.mySocket)return this.mySocket;this.mySocket=new He(this.REST,this.config.options);const{id_workflow_instance:e}=this.config.instance;return e&&this.mySocket.watch(`workflow_instance:state:${e}`,e=>{var t,s;const{instance:r}=this.config,o=function(e){if(!be(e))return je(e)}(null===(t=r.chain)||void 0===t?void 0:t.components);if(o){const t=je(r.summaryTelemetry),n=Object.entries(o).sort((e,t)=>parseInt(e[0],10)-parseInt(t[0],10)),i=Ee(e),a=[];for(const[e,r]of n)if(e in i){const o=+e;let n="ROOT";if(0!==o){const e=Ie(je(r).wid);n=null!==(s=Object.keys(je(t[e]))[0])&&void 0!==s?s:"ROOT"}const[c,l,h]=$e(i[e]).split(",").map(e=>Math.max(0,+e));a.push({running:c,complete:l,error:h,step:o,name:n})}this.experimentalWorkerStatus$.next(a)}}),this.mySocket}async realtimeFeedback(e,t){(await this.socket()).emit(e,t)}setTimer(e,t,s){if(this.timers[e])throw new Error(`An interval with the name ${e} has already been created`);this.timers[e]=function(e,t){const s=setInterval(t,e);return()=>clearInterval(s)}(t,s)}stopTimer(e){const t=this.timers[e];t&&(this.log.debug(`clearing ${e} interval`),t(),delete this.timers[e])}stopTimeout(e,t){const s=this.timers[e][t];s&&(s(),delete this.timers[e][t])}async stopAnalysis(){this.stopUpload(),this.stopped=!0;const{id_workflow_instance:e}=this.config.instance;if(e){try{this.config.options.useGraphQL?await this.graphQL.stopWorkflow({variables:{idWorkflowInstance:e}}):await this.REST.stopWorkflow(e),this.analyseState$.next(!1)}catch(t){throw this.log.error(`Error stopping instance: ${String(t)}`),t}this.log.info(`workflow instance ${e} stopped`)}}stopUpload(){this.log.debug("stopping watchers"),this.stopTimer("stateCheckInterval"),this.stopTimer("fileCheckInterval"),this.uploadState$.next(!1)}async stopEverything(){this.stopAnalysis();for(const e in this.timers.transferTimeouts){this.log.debug(`clearing transferTimeout for ${e}`);const t=this.timers.transferTimeouts[e];t&&t(),delete this.timers.transferTimeouts[e]}for(const e in this.timers.visibilityIntervals){this.log.debug(`clearing visibilityInterval for ${e}`);const t=this.timers.visibilityIntervals[e];t&&t(),delete this.timers.visibilityIntervals[e]}this.downloadWorkerPool&&(this.log.debug("clearing downloadWorkerPool"),await Promise.all(Object.values(this.downloadWorkerPool)),delete this.downloadWorkerPool),this.stopTimer("summaryTelemetryInterval"),this.stopTimer("downloadCheckInterval")}reportProgress(){const{upload:e,download:t}=this.states;this.log.debug({progress:{download:t,upload:e}})}uploadState(e,t,s){var r,o;const n=null!==(r=this.states.upload)&&void 0!==r?r:{progress:{bytes:0,total:0,niceSize:0},success:{files:0,bytes:0,reads:0,niceReads:0,niceSize:0},types:{},filesCount:0,niceTypes:""};"success"===e?this.updateSuccessState(n.success,t,s):"types"===e?this.updateTypesState(n.types,t,s):this.updateProgressState(n.progress,t,s);try{n.success.niceReads=Ue(this.states.upload.success.reads)}catch(a){n.success.niceReads=0}try{n.progress.niceSize=Ue(null!==(o=n.success.bytes+n.progress.bytes)&&void 0!==o?o:0)}catch(a){n.progress.niceSize=0}try{n.success.niceSize=Ue(this.states.upload.success.bytes)}catch(a){n.success.niceSize=0}n.niceTypes=Object.keys(this.states.upload.types||{}).sort().map(e=>`${this.states.upload.types[e]} ${e}`).join(", ");const i=Date.now();(!this.stateReportTime||i-this.stateReportTime>2e3)&&(this.stateReportTime=i,this.reportProgress()),this.liveStates$.next(Object.assign({},this.states))}downloadState(e,t,s){var r,o;const n=null!==(r=this.states.download)&&void 0!==r?r:{progress:{bytes:0,total:0,niceSize:0},success:{files:0,bytes:0,reads:0,niceReads:0,niceSize:0},types:{},fail:0,niceTypes:""};"success"===e?this.updateSuccessState(n.success,t,s):"types"===e?this.updateTypesState(n.types,t,s):this.updateProgressState(n.progress,t,s);try{n.success.niceReads=Ue(this.states.upload.success.reads)}catch(a){n.success.niceReads=0}try{n.progress.niceSize=Ue(null!==(o=n.success.bytes+n.progress.bytes)&&void 0!==o?o:0)}catch(a){n.progress.niceSize=0}try{n.success.niceSize=Ue(this.states.upload.success.bytes)}catch(a){n.success.niceSize=0}n.niceTypes=Object.keys(this.states.upload.types||{}).sort().map(e=>`${this.states.upload.types[e]} ${e}`).join(", ");const i=Date.now();(!this.stateReportTime||i-this.stateReportTime>2e3)&&(this.stateReportTime=i,this.reportProgress()),this.liveStates$.next(Object.assign({},this.states))}updateSuccessState(e,t,s){var r;const o=new Set(["files","bytes","reads"]);for(const n of Object.keys(s)){const i=("incr"===t?1:-1)*(null!==(r=s[n])&&void 0!==r?r:0);if(o.has(n)){const t=n;e[t]=e[t]+i}}}updateTypesState(e,t,s){var r;for(const o of Object.keys(s)){const n=("incr"===t?1:-1)*(null!==(r=s[o])&&void 0!==r?r:0);e[o]=Se(e[o],0)+n}}updateProgressState(e,t,s){var r;const o=new Set(["bytes","total"]);for(const n of Object.keys(s)){const i=("incr"===t?1:-1)*(null!==(r=s[n])&&void 0!==r?r:0);if(o.has(n)){const t=n;e[t]=e[t]+i}}}url(){return this.config.options.url}apikey(){return this.config.options.apikey}attr(e,t){if(!t)return this.config.options[e];switch(e){case"url":case"region":case"user_agent":case"downloadMode":case"sampleDirectory":case"apikey":case"apisecret":this.config.options[e]=$e(t);break;case"id_workflow_instance":case"sessionGrace":case"uploadTimeout":case"fileCheckInterval":case"downloadCheckInterval":case"stateCheckInterval":case"inFlightDelay":case"waitTimeSeconds":case"waitTokenError":case"transferPoolSize":case"debounceWindow":this.config.options[e]=Se(t);break;case"signing":case"useGraphQL":case"local":this.config.options[e]=Te(t);break;case"filetype":this.config.options[e]=_e(t,$e);break;default:throw new Error('Cannot modify the "log" attribute')}return this}stats(e){return this.states[e]}}Fe.version=qe.version,Fe.Profile=class{constructor(e){this.allProfileData={},this.defaultEndpoint=process.env.METRICHOR||v,e&&(this.allProfileData=u({profiles:{}},e)),this.allProfileData.endpoint&&(this.defaultEndpoint=this.allProfileData.endpoint)}profile(e){return e?u({endpoint:this.defaultEndpoint},u({profiles:{}},this.allProfileData).profiles[e]):{}}profiles(){return Object.keys(this.allProfileData.profiles||{})}},Fe.REST=ze,Fe.utils=qe;export default Fe;
