import { fetch } from './network/fetch';
import { BehaviorSubject, timer } from 'rxjs';
import { filter, multicast, switchMap } from 'rxjs/operators';
import { filterDefined } from './operators';

import type { Subscription, Observable } from 'rxjs';
import type { Dictionary, JSONObject, Optional } from 'ts-runtime-typecheck';
import type { GraphQL } from './graphql';
import type { ReportID, TelemetrySource } from './telemetry.type';

const SOURCE_EXPIRY_INTERVAL = 1 * 60 * 60 * 1000 - 10 * 1000; // Sources are valid for 1 hour, purposefully expire them a little early ( 10 seconds should do it )
const TELEMETRY_INSTANCES: Map<string, Telemetry> = new Map();

export class Telemetry {
  private readonly id: string;
  private readonly graphQL: GraphQL;
  private references = 0;
  private subscription: Subscription;
  private sources$: Observable<TelemetrySource>;

  constructor(id: string, graphql: GraphQL, reportNames: ReportID[]) {
    this.id = id;
    this.graphQL = graphql;
    if (TELEMETRY_INSTANCES.has(id)) {
      throw new Error(
        `Telemetry instance ${id} already exists. Ensure all consumers use the "Telemetry.create" to instantiate and "disconnect" when it is not longer needed.`,
      );
    }
    TELEMETRY_INSTANCES.set(id, this);

    // WARN if the interval changes on the server this will cause problems...
    const sources$ = timer(0, SOURCE_EXPIRY_INTERVAL).pipe(switchMap(() => this.getTelemetrySources(reportNames)));
    const subject$ = new BehaviorSubject<Optional<TelemetrySource[]>>(null);

    this.subscription = sources$.subscribe(subject$); // does this actually sub or does it create a pipe? Maybe do dumb subscription
    this.sources$ = subject$.pipe(
      filterDefined(),
      switchMap((sources) => sources),
    );
  }

  __connect(): void {
    this.references += 1;
  }

  disconnect(): void {
    this.references -= 1;
    if (this.references <= 0) {
      this.subscription.unsubscribe();
      TELEMETRY_INSTANCES.delete(this.id);
    }
  }

  static connect(id: string, graphQL: GraphQL, reportNames: ReportID[]): Telemetry {
    let inst = TELEMETRY_INSTANCES.get(id);
    if (!inst) {
      inst = new Telemetry(id, graphQL, reportNames);
      TELEMETRY_INSTANCES.set(id, inst);
    }
    inst.__connect();
    return inst;
  }

  async getTelemetrySources(reportNames: ReportID[]): Promise<TelemetrySource[]> {
    const response = await this.graphQL.query<Dictionary<TelemetrySource>>(`query {
      ${reportNames.map((report, index) => {
        return `_${index}: workflowInstanceTelemetry(idWorkflowInstance:${this.id}, report:"${report}") {
            getUrl
            headUrl
            expiresIn
          }`;
      })}
    }`)();

    // TODO check for error ?

    return Object.values(response.data).map(({ getUrl, headUrl }, index) => ({
      getUrl,
      headUrl,
      instanceId: this.id,
      reportId: reportNames[index],
    }));
  }

  telemetryUpdates$(interval: number): Observable<TelemetrySource> {
    const reportEtag = new Map();

    return timer(0, interval).pipe(
      switchMap(() => this.sources$),
      switchMap(async (source) => {
        const response = await fetch(source.headUrl, { method: 'head' });
        if (!response.ok) {
          return null;
        }
        const etag = response.headers.get('etag');
        if (!etag) {
          throw new Error('Server responded without etag on telemetry HEAD request');
        }
        return { ...source, etag };
      }),
      filterDefined(),
      filter((a) => {
        const old = reportEtag.get(a.reportId[0]);
        reportEtag.set(a.reportId, a.etag);
        return a.etag !== old;
      }),
    );
  }

  telemetryReports$(interval: number): Observable<Dictionary<JSONObject>> {
    const aggregationMap: Dictionary<JSONObject> = {};
    return this.telemetryUpdates$(interval).pipe(
      switchMap(async (source) => {
        const response = await fetch(source.getUrl);
        if (!response.ok) {
          return aggregationMap;
        }
        aggregationMap[source.reportId[0]] = await response.json();
        return aggregationMap;
      }),
      multicast(new BehaviorSubject<Optional<Dictionary<JSONObject>>>(null)),
      filterDefined(),
    );
  }
}
