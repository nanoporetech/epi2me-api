import type { AWSError } from 'aws-sdk';
import type { InstanceTokenMutation } from './generated/graphql.type';

import { asString, assertDefined } from 'ts-runtime-typecheck';
import { Credentials } from 'aws-sdk';
import { Duration } from './Duration';

export class Epi2meCredentials extends Credentials {
  region = '';

  private readonly sessionGrace: Duration;
  private fetchToken: () => Promise<InstanceTokenMutation>;

  constructor(fetchTokenHandler: () => Promise<InstanceTokenMutation>, sessionGrace: Duration = Duration.Seconds(0)) {
    super({
      accessKeyId: '',
      sessionToken: '',
      secretAccessKey: '',
    });

    if (!fetchTokenHandler || !(typeof fetchTokenHandler === 'function')) {
      throw new Error('fetchTokenHandler: () => Promise<InstanceTokenMutation> is a required argument');
    }
    this.fetchToken = fetchTokenHandler;
    this.sessionGrace = sessionGrace;
  }

  refreshPromise = async (): Promise<void> => {
    if (!this.needsRefresh()) {
      return;
    }
    const { accessKeyId, secretAccessKey, sessionToken, expiration, region } = await this.fetchToken();

    assertDefined(accessKeyId, 'accessKeyId');
    assertDefined(secretAccessKey, 'secretAccessKey');
    assertDefined(sessionToken, 'sessionToken');
    assertDefined(expiration, 'expiration');

    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.sessionToken = sessionToken;
    this.region = region ?? '';

    this.expireTime = Duration.FromDate(asString(expiration)).subtract(this.sessionGrace).toDate();
  };

  refresh = (callback: (err?: AWSError) => void): void => {
    this.refreshPromise().then(
      () => callback(),
      (err) => callback(err),
    );
  };
}
