import fs from 'fs-extra';
import { merge } from 'lodash';
import { homedir } from 'os';
import path from 'path';
import { InternalAllProfileData, ProfileCredentials, Profile } from './profile';

export class ProfileFS extends Profile {
  prefsFile: string;
  allProfileData: InternalAllProfileData;
  raiseExceptions: boolean;

  constructor(prefsFile?: string, raiseExceptions?: boolean) {
    super({});

    this.raiseExceptions = raiseExceptions ? true : false;
    this.prefsFile = prefsFile || ProfileFS.profilePath();
    this.allProfileData = {};

    try {
      this.allProfileData = merge({ profiles: {} }, fs.readJSONSync(this.prefsFile));

      if (this.allProfileData.endpoint) {
        this.defaultEndpoint = this.allProfileData.endpoint;
      }
    } catch (err) {
      if (this.raiseExceptions) {
        throw err;
      }
    }
  }

  static profilePath(): string {
    return path.join(homedir(), '.epi2me.json');
  }

  profile(id: string, obj?: ProfileCredentials): ProfileCredentials {
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
      if (!this.allProfileData.profiles) {
        throw new Error('cannot read property');
      }

      return merge(
        {
          endpoint: this.defaultEndpoint,
        },
        this.allProfileData.profiles[id],
      );
    }

    return {};
  }
}
