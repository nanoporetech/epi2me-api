import ProxyAgent from 'proxy-agent';
import { Logger } from './Logger';
import { REST } from './rest';
import { GraphQL } from './graphql';
import { Index, isIndex, makeNumber, asDefined, asOptString, isDefined } from 'ts-runtime-typecheck';
import { SessionManagerOptions } from './session-manager.type';
import AWS from 'aws-sdk';
import { InstanceTokenMutation } from './generated/graphql.type';
import { CredentialsOptions } from 'aws-sdk/lib/credentials';

export default class SessionManager {
  readonly log: Logger;
  readonly REST: REST;
  readonly graphQL: GraphQL;
  readonly options: SessionManagerOptions;

  readonly id_workflow_instance: Index;
  readonly children: { config: AWS.Config }[];

  sts_expiration?: number;

  constructor(
    idWorkflowInstance: Index,
    REST: REST,
    children: { config: AWS.Config }[],
    opts: SessionManagerOptions,
    graphQL: GraphQL,
  ) {
    this.id_workflow_instance = idWorkflowInstance;
    this.children = children;
    this.options = opts;
    this.log = this.options.log;
    this.REST = REST; // EPI2ME REST API object
    this.graphQL = graphQL; // EPI2ME graphQL API object

    if (!children || !children.length) {
      throw new Error('must specify children to session');
    }
  }

  async session(): Promise<void> {
    /* Ignore if session is still valid */
    if (this.sts_expiration && this.sts_expiration > Date.now()) {
      return;
    }

    this.log.debug('new instance token needed');

    try {
      let token: InstanceTokenMutation;
      if (this.options.useGraphQL) {
        const instanceTokenOptions = { variables: { idWorkflowInstance: this.id_workflow_instance } };
        const result = await this.graphQL.instanceToken(instanceTokenOptions);
        token = asDefined(result.data?.token);
      } else {
        token = await this.REST.instanceToken(this.id_workflow_instance, this.options);
      }

      if (!isIndex(token.expiration) && !(token.expiration instanceof Date)) {
        throw new Error('Invalid token expiration type');
      }

      this.log.debug(`allocated new instance token expiring at ${token.expiration}`);

      this.sts_expiration = new Date(token.expiration).getTime() - 60 * makeNumber(this.options.sessionGrace ?? '0'); // refresh token x mins before it expires

      let credentials: CredentialsOptions | null = null;

      if (isDefined(token.accessKeyId) && isDefined(token.secretAccessKey)) {
        credentials = {
          accessKeyId: token.accessKeyId,
          secretAccessKey: token.secretAccessKey,
          sessionToken: asOptString(token.sessionToken),
        };
      }

      const configUpdate: Parameters<AWS.Config['update']>[0] = {
        credentials,
        region: asOptString(token.region),
      };

      if (this.options.proxy) {
        // NOTE AWS SDK explicitly does a deep merge on httpOptions
        // so this won't squash any options that have already been set
        configUpdate.httpOptions = {
          agent: ProxyAgent(this.options.proxy),
        };
      }

      configUpdate.region = this.options.region;

      for (const child of this.children) {
        try {
          child.config.update(configUpdate);
        } catch (e) {
          this.log.warn(`failed to update config on ${String(child)}: ${String(e)}`);
        }
      }
    } catch (err) {
      this.log.warn(`failed to fetch instance token: ${String(err)}`);
    }
  }
}
