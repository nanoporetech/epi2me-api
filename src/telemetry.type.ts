export interface TelemetrySource {
  getUrl: string;
  headUrl: string;
  instanceId: string;
  reportId: ReportID;
  hasReport?: boolean;
}

export interface ReportID {
  componentId: string;
  reportName: string;
}
