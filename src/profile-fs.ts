import { homedir } from 'os';
import { merge } from 'lodash';
import fs from 'fs-extra';
import path from 'path';
import Profile from './profile';
import { Epi2meProfileNS } from './types/profile';

interface InternalAllProfileData {
  profiles?: Epi2meProfileNS.AllProfileData;
  endpoint?: string;
}
export default class ProfileFS extends Profile {
  prefsFile: string;
  allProfileData: InternalAllProfileData;
  raiseExceptions: boolean;

  constructor(prefsFile?: string, raiseExceptions?: boolean) {
    super({});

    this.raiseExceptions = raiseExceptions;
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

  static profilePath(): string {
    return path.join(homedir(), '.epi2me.json');
  }

  profile(
    id: Epi2meProfileNS.IProfileName,
    obj?: Epi2meProfileNS.IProfileCredentials,
  ): Epi2meProfileNS.IProfileCredentials {
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
}
