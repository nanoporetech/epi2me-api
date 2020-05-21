export default class Factory {
  constructor(EPI2ME, opts) {
    this.EPI2ME = EPI2ME;
    this.options = opts;
    this.masterInstance = new EPI2ME(this.options);
    this.log = this.masterInstance.log;
    this.REST = this.masterInstance.REST;
    this.graphQL = this.masterInstance.graphQL;
    this.SampleReader = this.masterInstance.SampleReader;
    this.utils = EPI2ME.utils;
    this.version = EPI2ME.version;
    this.runningInstances = {};
  }

  async startRun(options, workflowConfig) {
    const newInstance = new this.EPI2ME({ ...this.options, ...options });
    try {
      const workflowData = await newInstance.autoStart(workflowConfig);
      this.runningInstances[workflowData.id_workflow_instance] = newInstance;
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

  async startGQLRun(options, variables) {
    const newInstance = new this.EPI2ME({ ...this.options, ...options, graphQL: true });
    try {
      const workflowData = await newInstance.autoStartGQL(variables);
      this.runningInstances[workflowData.id_workflow_instance] = newInstance;
      console.log(workflowData);
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
