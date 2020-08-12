import { merge } from 'lodash';
import DEFAULTS from './default_options.json';

export interface ProfileCredentials {
  apikey?: string;
  apisecret?: string;
  endpoint?: string;
  url?: string;
  billing_account?: string;
  compute_account?: string;
}

export interface AllProfileData {
  [profileName: string]: ProfileCredentials;
}

export interface InternalAllProfileData {
  profiles?: AllProfileData;
  endpoint?: string;
}

export default class Profile {
  defaultEndpoint: string;
  allProfileData: InternalAllProfileData = {};

  public constructor(allProfileData: AllProfileData) {
    // this.allProfileData = {};
    this.defaultEndpoint = process.env.METRICHOR || DEFAULTS.url;

    if (allProfileData) {
      this.allProfileData = merge({ profiles: {} }, allProfileData);
    }

    if (this.allProfileData.endpoint) {
      this.defaultEndpoint = this.allProfileData.endpoint;
    }
  }

  public profile(id: string): ProfileCredentials {
    if (id) {
      return merge(
        {
          endpoint: this.defaultEndpoint,
        },
        merge({ profiles: {} }, this.allProfileData).profiles[id],
      );
    }

    return {};
  }

  public profiles(): string[] {
    return Object.keys(this.allProfileData.profiles || {});
  }
}
