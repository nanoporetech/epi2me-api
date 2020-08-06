import EPI2ME_FS from "./epi2me-fs";
import { asIndex } from "./runtime-typecast";

import type REST_FS from "./rest-fs";
import type GraphQL from "./graphql";
import type { Logger } from "./Logger";
import type { ObjectDict } from "./ObjectDict";
import type SampleReader from "./sample-reader";
import type { UtilityFS } from "./utils-fs";

/*
Factory seems to be designed with the intention that a version of the EPI2ME
API can be passed in, then used as the base. However, at the moment it only
supports using the EPI2ME_FS
*/
export default class Factory {
  private readonly EPI2ME: typeof EPI2ME_FS;
  private readonly options: ObjectDict;
  private readonly primary: EPI2ME_FS;
  private readonly runningInstances: ObjectDict = {};

  constructor(api: typeof EPI2ME_FS, opts: ObjectDict = {}) {
    this.EPI2ME = api;
    this.options = opts;
    this.primary = this.instantiate();
  }

  get utils (): UtilityFS {
    return this.EPI2ME.utils;
  }

  get version (): string {
    return this.EPI2ME.version;
  }

  get log (): Logger {
    return this.primary.log;
  }

  get REST (): REST_FS {
    return this.primary.REST;
  }

  get graphQL (): GraphQL {
    return this.primary.graphQL;
  }

  get SampleReader (): SampleReader {
    return this.primary.SampleReader;
  }

  private instantiate (options: ObjectDict = {}): EPI2ME_FS {
    return new this.EPI2ME({
      ...this.options,
      ...options
    });
  }

  async startRun(options: ObjectDict, workflowConfig: ObjectDict): Promise<EPI2ME_FS> {
    const inst = this.instantiate(options);
    try {
      const workflowData = await inst.autoStart(workflowConfig);
      const id = asIndex(workflowData.id_workflow_instance);
      this.runningInstances[id] = inst;
    } catch (startErr) {
      this.log.error('Experienced error starting', startErr);
      try {
        await inst.stopEverything();
      } catch (stopErr) {
        this.log.error('Also experienced error stopping', stopErr);
      }
    }
    return inst;
  }

  async startGQLRun(options: ObjectDict, variables: ObjectDict): Promise<EPI2ME_FS> {
    const inst = this.instantiate({ ...options, useGraphQL: true });
    try {
      const workflowData = await inst.autoStartGQL(variables);
      const id = asIndex(workflowData.id_workflow_instance);
      this.runningInstances[id] = inst;
      // TODO does this actually need to be here?
      this.log.debug(workflowData);
    } catch (startErr) {
      this.log.error(`Experienced error starting ${String(startErr)}`);
      try {
        await inst.stopEverything();
      } catch (stopErr) {
        this.log.error(`Also experienced error stopping ${String(stopErr)}`);
      }
    }
    return inst;
  }
}
