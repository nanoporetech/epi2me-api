export interface TelemetrySource {
  getUrl: string;
  headUrl: string;
  instanceId: string;
  reportId: ReportID;
}

export type ReportID = [componentID: string, reportName: string];