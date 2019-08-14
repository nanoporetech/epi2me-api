import fs from 'fs-extra';
import path from 'path';
import {
  merge
} from 'lodash';

function profilePath() {
  return path.join(process.env.HOME, '.epi2me.json');
}

export default class Profile {
  constructor(prefsFile) {
    this.prefsFile = prefsFile || profilePath();
    this.profileCache = {};
    try {
      const allProfiles = fs.readJSONSync(this.prefsFile);
      this.profileCache = merge(allProfiles.profiles, {});
    } catch (ignore) {
      // no file or corrupt file - ignore
    }
  }

  profile(id, obj) {
    if (id && obj) {
      const profileCache = merge(this.profileCache, {
        [id]: obj,
      });
      fs.writeJSONSync(this.prefsFile, {
        profiles: profileCache,
      });
      this.profileCache = profileCache;
    }

    if (id) {
      return this.profileCache[id] || {};
    }

    return {};
  }

  profiles() {
    return Object.keys(this.profileCache || {});
  }
}
