export class gRPC_EPI2ME {
 public workflowApi:

 constructor(public host: string) {
  const url = `http://${host}:8080`;

  this.workflowApi = new workflowApi(url);
}

public close() {
  this.workflowApi.close();
}

}
