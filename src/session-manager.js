import {
  merge
} from 'lodash';
import proxy from 'proxy-agent'; // odd one out

export default class SessionManager {
  constructor(idWorkflowInstance, epi2me, children, opts) {
    this.id_workflow_instance = idWorkflowInstance;
    this.children = children;
    this.options = merge(opts);
    this.log = this.options.log;
    this.epi2me = epi2me; // REST API object

    if (!idWorkflowInstance) {
      throw new Error('must specify id_workflow_instance');
    }

    if (!children || !children.length) {
      throw new Error('must specify children to session');
    }
  }

  async session() {
    /* Ignore if session is still valid */
    if (this.sts_expiration && this.sts_expiration > Date.now()) {
      return Promise.resolve();
    }

    this.log.debug('new instance token needed');

    try {
      const token = await this.epi2me.REST.instanceToken(this.id_workflow_instance, this.options);
      this.log.debug(`allocated new instance token expiring at ${token.expiration}`);
      this.sts_expiration = new Date(token.expiration).getTime() - 60 * parseInt(this.options.sessionGrace || '0', 10); // refresh token x mins before it expires

      const configUpdate = {};
      if (this.options.proxy) {
        merge(configUpdate, {
          httpOptions: {
            agent: proxy(this.options.proxy, true),
          },
        });
      }

      merge(
        configUpdate, {
          region: this.options.region,
        },
        token,
      );

      this.children.forEach(child => {
        try {
          child.config.update(configUpdate);
        } catch (e) {
          this.log.warn(`failed to update config on ${String(child)}: ${String(e)}`);
        }
      });
    } catch (err) {
      this.log.warn(`failed to fetch instance token: ${String(err)}`);
    }

    return Promise.resolve();
  }
}
