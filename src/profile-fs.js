import {
  homedir
} from 'os';
import {
  merge
} from 'lodash';
import fs from 'fs-extra';
import path from 'path';
import Profile from './profile';

export default class ProfileFS extends Profile {
  constructor(prefsFile, raiseExceptions) {
    super({}, raiseExceptions);

    this.prefsFile = prefsFile || ProfileFS.profilePath();
    this.allProfileData = {};

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
      return merge({
          endpoint: this.defaultEndpoint,
        },
        this.allProfileData.profiles[id],
      );
    }

    return {};
  }
}
