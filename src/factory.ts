import EPI2ME from "./epi2me";
import EPI2ME_FS from "./epi2me-fs";
import { Logger } from "./Logger";
import GraphQL from "./graphql";
import REST from "./rest";
import SampleReader from "./sample-reader";
import type { Utility } from "./utils";
import type { UtilityFS } from "./utils-fs";
import REST_FS from "./rest-fs";
import { EPI2ME_OPTIONS } from "./epi2me-options";
import { ObjectDict } from "./ObjectDict";
import { asIndex } from "./runtime-typecast";

type API_CTOR = {
  new(optstring: EPI2ME_OPTIONS | string): EPI2ME | EPI2ME_FS;
  version: string;
  utils: Utility | UtilityFS;
};

/*
Factory seems to be designed with the intention that a version of the EPI2ME
API can be passed in, then used as the base. However, other parts
*/
export default class Factory {
  EPI2ME: API_CTOR;
  options: EPI2ME_OPTIONS;
  masterInstance: EPI2ME | EPI2ME_FS;
  log: Logger
  REST: REST | REST_FS;
  graphQL: GraphQL;
  SampleReader?: SampleReader;
  utils: Utility | UtilityFS;
  version: string;
  runningInstances: ObjectDict = {};

  constructor(api: API_CTOR, opts: EPI2ME_OPTIONS) {
    this.EPI2ME = api;
    this.options = opts;

    const inst = new api(this.options);

    this.log = inst.log;
    this.REST = inst.REST;
    this.graphQL = inst.graphQL;

    if (inst instanceof EPI2ME_FS) {
      this.SampleReader = inst.SampleReader;
    }

    this.masterInstance = inst;
    this.utils = api.utils;
    this.version = api.version;
  }

  async startRun(options: EPI2ME_OPTIONS, workflowConfig: ObjectDict): Promise<EPI2ME | EPI2ME_FS> {
    const newInstance = new this.EPI2ME({ ...this.options, ...options });
    if (!(newInstance instanceof EPI2ME_FS)) {
      throw new Error('Factory only works with EPI2ME_FS at this time');
    }
    try {
      const workflowData = await newInstance.autoStart(workflowConfig);
      const id = asIndex(workflowData.id_workflow_instance);
      this.runningInstances[id] = newInstance;
    } catch (startErr) {
      this.log.error('Experienced error starting', startErr);
      try {
        await newInstance.stopEverything();
      } catch (stopErr) {
        this.log.error('Also experienced error stopping', stopErr);
      }
    }
    return newInstance;
  }

  async startGQLRun(options: EPI2ME_OPTIONS, variables: ObjectDict): Promise<EPI2ME | EPI2ME_FS> {
    const newInstance = new this.EPI2ME({ ...this.options, ...options, useGraphQL: true });
    if (!(newInstance instanceof EPI2ME_FS)) {
      throw new Error('Factory only works with EPI2ME_FS at this time');
    }
    try {
      const workflowData = await newInstance.autoStartGQL(variables);
      const id = asIndex(workflowData.id_workflow_instance);
      this.runningInstances[id] = newInstance;
      // TODO does this actually need to be here?
      this.log.debug(workflowData);
    } catch (startErr) {
      this.log.error(`Experienced error starting ${String(startErr)}`);
      try {
        await newInstance.stopEverything();
      } catch (stopErr) {
        this.log.error(`Also experienced error stopping ${String(stopErr)}`);
      }
    }
    return newInstance;
  }
}
