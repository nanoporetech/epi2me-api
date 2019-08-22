import { homedir } from 'os';
import fs from 'fs-extra';
import path from 'path';
import { merge } from 'lodash';
import DEFAULTS from './default_options.json';

export default class Profile {
  constructor(prefsFile) {
    this.prefsFile = prefsFile || Profile.profilePath();
    this.profileCache = {};
    this.defaultEndpoint = process.env.METRICHOR || DEFAULTS.endpoint;

    try {
      const allProfiles = fs.readJSONSync(this.prefsFile);
      this.profileCache = merge(allProfiles.profiles, {});
      if (allProfiles.endpoint) {
        this.defaultEndpoint = allProfiles.endpoint;
      }
    } catch (ignore) {
      // no file or corrupt file - ignore
    }
  }

  static profilePath() {
    return path.join(homedir(), '.epi2me.json');
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
      return merge(
        {
          endpoint: this.defaultEndpoint,
        },
        this.profileCache[id],
      );
    }

    return {};
  }

  profiles() {
    return Object.keys(this.profileCache || {});
  }
}
