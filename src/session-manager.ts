import { merge } from 'lodash';
import proxy from 'proxy-agent'; // odd one out
import { Logger } from './Logger';
import { REST } from './rest';
import { GraphQL } from './graphql';
import { Index, asDictionary, isIndex, Dictionary, makeNumber } from 'ts-runtime-typecheck';
import { EPI2ME_OPTIONS } from './epi2me-options';

export default class SessionManager {
  readonly log: Logger;
  readonly REST: REST;
  readonly graphQL: GraphQL;
  readonly options: EPI2ME_OPTIONS;

  readonly id_workflow_instance: Index;
  readonly children: { config: { update: (option: Dictionary) => void } }[];

  sts_expiration?: number;

  constructor(
    idWorkflowInstance: Index,
    REST: REST,
    children: { config: { update: (option: Dictionary) => void } }[],
    opts: Partial<EPI2ME_OPTIONS>,
    graphQL: GraphQL,
  ) {
    this.id_workflow_instance = idWorkflowInstance;
    this.children = children;
    this.options = merge(opts);
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
      let token;
      if (this.options.useGraphQL) {
        const instanceTokenOptions = { variables: { idWorkflowInstance: this.id_workflow_instance } };
        const result = await this.graphQL.instanceToken(instanceTokenOptions);
        token = asDictionary(result.data?.token);
      } else {
        token = await this.REST.instanceToken(this.id_workflow_instance, this.options);
      }

      if (!isIndex(token.expiration) && !(token.expiration instanceof Date)) {
        throw new Error('Invalid token expiration type');
      }

      this.log.debug(`allocated new instance token expiring at ${token.expiration}`);

      this.sts_expiration = new Date(token.expiration).getTime() - 60 * makeNumber(this.options.sessionGrace ?? '0'); // refresh token x mins before it expires

      const configUpdate: Dictionary = {};
      if (this.options.proxy) {
        merge(configUpdate, {
          httpOptions: {
            agent: proxy(this.options.proxy),
          },
        });
      }

      merge(
        configUpdate,
        {
          region: this.options.region,
        },
        token,
      );

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
