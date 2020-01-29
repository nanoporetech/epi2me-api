import { merge } from 'lodash';
import DEFAULTS from './default_options.json';

export default class Profile {
  constructor(allProfileData, raiseExceptions) {
    this.allProfileData = {};
    this.defaultEndpoint = process.env.METRICHOR || DEFAULTS.endpoint || DEFAULTS.url;
    this.raiseExceptions = raiseExceptions;

    if (allProfileData) {
      this.allProfileData = merge(allProfileData, {
        profiles: {},
      });
    }

    if (this.allProfileData.endpoint) {
      this.defaultEndpoint = this.allProfileData.endpoint;
    }
  }

  profile(id) {
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
