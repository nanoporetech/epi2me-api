import { merge } from 'lodash';
import DEFAULTS from './default_options.json';
import { Epi2meProfileNS } from './types/profile';

interface InternalAllProfileData {
  profiles?: Epi2meProfileNS.AllProfileData;
  endpoint?: string;
}

export default class Profile {
  allProfileData: InternalAllProfileData;
  defaultEndpoint: string;

  public constructor(allProfileData: Epi2meProfileNS.AllProfileData) {
    this.allProfileData = {};
    this.defaultEndpoint = process.env.METRICHOR || DEFAULTS.endpoint || DEFAULTS.url;

    if (allProfileData) {
      this.allProfileData = merge(allProfileData, {
        profiles: {},
      });
    }

    if (this.allProfileData.endpoint) {
      this.defaultEndpoint = this.allProfileData.endpoint;
    }
  }

  public profile(id: Epi2meProfileNS.IProfileName): Epi2meProfileNS.IProfileCredentials {
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

  public profiles(): Epi2meProfileNS.IProfileName[] {
    return Object.keys(this.allProfileData.profiles || {});
  }
}
