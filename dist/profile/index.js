/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2019
 */

"use strict";function _interopDefault(e){return e&&"object"===typeof e&&"default"in e?e.default:e}var os=require("os"),fs=_interopDefault(require("fs-extra")),path=_interopDefault(require("path")),lodash=require("lodash");class Profile{constructor(e){this.prefsFile=e||Profile.profilePath(),this.profileCache={};try{const e=fs.readJSONSync(this.prefsFile);this.profileCache=lodash.merge(e.profiles,{})}catch(r){}}static profilePath(){return path.join(os.homedir(),".epi2me.json")}profile(e,r){if(e&&r){const i=lodash.merge(this.profileCache,{[e]:r});fs.writeJSONSync(this.prefsFile,{profiles:i}),this.profileCache=i}return e&&this.profileCache[e]||{}}profiles(){return Object.keys(this.profileCache||{})}}module.exports=Profile;
