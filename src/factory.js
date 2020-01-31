export default class Factory {
  constructor(EPI2ME, opts) {
    this.EPI2ME = EPI2ME;
    this.options = opts;
    this.masterInstance = new this.EPI2ME(this.options);
    this.log = this.masterInstance.log;
    this.REST = this.masterInstance.REST;
    this.graphQL = this.masterInstance.graphQL;
    this.runningInstances = {};
  }

  async startRun(workflowConfig) {
    const newInstance = new this.EPI2ME(this.options);
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
}
