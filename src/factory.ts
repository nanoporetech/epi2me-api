import EPI2ME_FS from './epi2me-fs';
import { asIndex } from './runtime-typecast';

import type REST_FS from './rest-fs';
import type GraphQL from './graphql';
import type { Logger } from './Logger';
import type { ObjectDict } from './ObjectDict';
import type SampleReader from './sample-reader';
import type { UtilityFS } from './utils-fs';
import type { Index } from './runtime-typecast';
import type { EPI2ME_OPTIONS } from './epi2me-options';

function printError(log: Logger, msg: string, err: unknown): void {
  if (err instanceof Error) {
    log.error(msg, err.stack);
  } else {
    log.error(msg, err);
  }
}

/*
Factory seems to be designed with the intention that a version of the EPI2ME
API can be passed in, then used as the base. However, at the moment it only
supports using the EPI2ME_FS
*/
export default class Factory {
  private readonly EPI2ME: typeof EPI2ME_FS;
  private options: Partial<EPI2ME_OPTIONS>;
  private primary: EPI2ME_FS;
  private runningInstances: Map<Index, EPI2ME_FS> = new Map();

  constructor(api: typeof EPI2ME_FS, opts: Partial<EPI2ME_OPTIONS> = {}) {
    this.EPI2ME = api;
    this.options = opts;
    this.primary = this.instantiate();
  }

  get utils(): UtilityFS {
    return this.EPI2ME.utils;
  }

  get version(): string {
    return this.EPI2ME.version;
  }

  get log(): Logger {
    return this.primary.log;
  }

  get REST(): REST_FS {
    return this.primary.REST;
  }

  get graphQL(): GraphQL {
    return this.primary.graphQL;
  }

  get sampleReader(): SampleReader {
    return this.primary.SampleReader;
  }

  reset(options: Partial<EPI2ME_OPTIONS> = {}): void {
    this.options = options;
    // WARN what happens to the running instances here?
    this.runningInstances.clear();
    this.primary = this.instantiate();
  }

  getRunningInstance(id: Index): EPI2ME_FS | undefined {
    return this.runningInstances.get(id);
  }

  getAllRunningInstances(): EPI2ME_FS[] {
    return Array.from(this.runningInstances.values());
  }

  private instantiate(options: Partial<EPI2ME_OPTIONS> = {}): EPI2ME_FS {
    return new this.EPI2ME({
      ...this.options,
      ...options,
    });
  }

  async startRun(
    options: Partial<EPI2ME_OPTIONS>,
    workflowConfig: {
      id_workflow: string;
      is_consented_human: 0 | 1;
      user_defined: unknown;
      instance_attributes: unknown;
      compute_account?: string;
      storage_account?: string;
      store_results?: boolean;
    },
  ): Promise<EPI2ME_FS> {
    const inst = this.instantiate(options);
    try {
      const workflowData = await inst.autoStart(workflowConfig);
      const id = asIndex(workflowData.id_workflow_instance);
      this.runningInstances.set(id, inst);
    } catch (startErr) {
      printError(this.log, 'Experienced error starting', startErr);
      try {
        await inst.stopEverything();
      } catch (stopErr) {
        printError(this.log, 'Also experienced error stopping', stopErr);
      }
    }
    return inst;
  }

  /**
   * @param {Object<string, any>} options
   * @param {GQLRunVariables} variables { userDefined: { [componentID]: { [paramOverride]: any } } }
   */
  async startGQLRun(
    options: ObjectDict,
    variables: {
      idWorkflow: Index;
      computeAccountId: Index;
      storageAccountId?: Index;
      isConsentedHuman?: boolean;
      idDataset?: Index;
      storeResults?: boolean;
      region?: string;
      userDefined?: ObjectDict<ObjectDict>;
      instanceAttributes?: { id_attribute: Index; value: string }[];
    },
  ): Promise<EPI2ME_FS> {
    const inst = this.instantiate({ ...options, useGraphQL: true });
    try {
      const workflowData = await inst.autoStartGQL(variables);
      const id = asIndex(workflowData.id_workflow_instance);
      this.runningInstances.set(id, inst);
      // TODO does this actually need to be here?
      this.log.debug(workflowData);
    } catch (startErr) {
      printError(this.log, 'Experienced error starting', startErr);
      try {
        await inst.stopEverything();
      } catch (stopErr) {
        printError(this.log, 'Also experienced error stopping', stopErr);
      }
    }
    return inst;
  }
}
