/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2019
 */

"use strict";function _interopDefault(e){return e&&"object"===typeof e&&"default"in e?e.default:e}var fs=_interopDefault(require("fs-extra")),path=_interopDefault(require("path")),lodash=require("lodash");function profilePath(){return path.join(process.env.HOME,".epi2me.json")}class Profile{constructor(e){this.prefsFile=e||profilePath(),this.profileCache={};try{const e=fs.readJSONSync(this.prefsFile);this.profileCache=lodash.merge(e.profiles,{})}catch(r){}}profile(e,r){if(e&&r){const t=lodash.merge(this.profileCache,{[e]:r});fs.writeJSONSync(this.prefsFile,{profiles:t}),this.profileCache=t}return e&&this.profileCache[e]||{}}profiles(){return Object.keys(this.profileCache||{})}}module.exports=Profile;
