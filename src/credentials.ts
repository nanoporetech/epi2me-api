import { isDefined, asString } from 'ts-runtime-typecheck';
import { Credentials } from 'aws-sdk';
import type { AWSError } from 'aws-sdk';
import type { InstanceTokenMutation } from './generated/graphql.type';

export class Epi2meCredentials extends Credentials {
  region = '';

  private readonly sessionGrace: number;
  private fetchToken: () => Promise<InstanceTokenMutation>;

  constructor(fetchTokenHandler: () => Promise<InstanceTokenMutation>, sessionGrace = 0) {
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

    if (isDefined(accessKeyId) && isDefined(secretAccessKey) && isDefined(sessionToken)) {
      this.accessKeyId = accessKeyId;
      this.secretAccessKey = secretAccessKey;
      this.sessionToken = sessionToken;
      this.region = region ?? '';

      const stsExpiration = new Date(asString(expiration)).getTime() - 1000 * this.sessionGrace ?? 0; // refresh token x seconds before it expires

      this.expireTime = new Date(stsExpiration);
    }
  };

  refresh = (callback: (err?: AWSError) => void): void => {
    this.refreshPromise().then(
      () => callback(),
      (err) => callback(err),
    );
  };
}
