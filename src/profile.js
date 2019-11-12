import { homedir } from 'os';
import fs from 'fs-extra';
import path from 'path';
import { merge } from 'lodash';
import DEFAULTS from './default_options.json';

export default class Profile {
  constructor(prefsFile, raiseExceptions) {
    this.prefsFile = prefsFile || Profile.profilePath();
    this.allProfileData = {};
    this.defaultEndpoint = process.env.METRICHOR || DEFAULTS.endpoint || DEFAULTS.url;
    this.raiseExceptions = raiseExceptions;

    try {
      this.allProfileData = merge(fs.readJSONSync(this.prefsFile), {
        profiles: {},
      });

      if (this.allProfileData.endpoint) {
        this.defaultEndpoint = this.allProfileData.endpoint;
      }
    } catch (err) {
      if (this.raiseExceptions) {
        throw err;
      }
    }
  }

  static profilePath() {
    return path.join(homedir(), '.epi2me.json');
  }

  profile(id, obj) {
    if (id && obj) {
      merge(this.allProfileData, {
        profiles: {
          [id]: obj,
        },
      });
      try {
        fs.writeJSONSync(this.prefsFile, this.allProfileData);
      } catch (err) {
        if (this.raiseExceptions) {
          throw err;
        }
      }
    }

    if (id) {
      return merge(
        {
          endpoint: this.defaultEndpoint,
        },
        this.allProfileData.profiles[id],
      );
    }

    return {};
  }

  profiles() {
    return Object.keys(this.allProfileData.profiles || {});
  }
}
