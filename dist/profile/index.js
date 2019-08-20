/**
 * Copyright Metrichor Ltd. (An Oxford Nanopore Technologies Company) 2019
 */

"use strict";function _interopDefault(e){return e&&"object"===typeof e&&"default"in e?e.default:e}var os=require("os"),fs=_interopDefault(require("fs-extra")),path=_interopDefault(require("path")),lodash=require("lodash");class Profile{constructor(e,r){this.prefsFile=e||Profile.profilePath(),this.profileCache={},this.raiseExceptions=r;try{const e=fs.readJSONSync(this.prefsFile);this.profileCache=lodash.merge(e.profiles,{})}catch(i){if(this.raiseExceptions)throw i}}static profilePath(){return path.join(os.homedir(),".epi2me.json")}profile(e,r){if(e&&r){const t=lodash.merge(this.profileCache,{[e]:r});try{fs.writeJSONSync(this.prefsFile,{profiles:t})}catch(i){if(this.raiseExceptions)throw i}this.profileCache=t}return e&&this.profileCache[e]||{}}profiles(){return Object.keys(this.profileCache||{})}}module.exports=Profile;
