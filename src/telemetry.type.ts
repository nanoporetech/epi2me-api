import type { Dictionary } from 'ts-runtime-typecheck';

export interface TelemetrySource {
  getUrl: string;
  headUrl: string;
  instanceId: string;
  reportId: ReportID;
  expiresIn: number;
}

export interface ExtendedTelemetrySource extends TelemetrySource {
  hasReport?: boolean;
  etag?: string;
}

export interface ReportID {
  componentId: string;
  reportName: string;
}

export type TelemetryNames = Dictionary<Dictionary<string>>;
