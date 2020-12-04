export interface TelemetrySource {
  getUrl: string;
  headUrl: string;
  instanceId: string;
  reportId: ReportID;
}

export interface ReportID {
  componentId: string;
  reportName: string;
}
