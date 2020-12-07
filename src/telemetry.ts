import { fetch } from './network/fetch';
import { BehaviorSubject, Subject, timer } from 'rxjs';
import { filter, map, multicast, refCount, switchMap } from 'rxjs/operators';
import { filterDefined } from './operators';

import type { Subscription, Observable } from 'rxjs';
import { Dictionary, isDefined, JSONObject, Optional } from 'ts-runtime-typecheck';
import type { GraphQL } from './graphql';
import type { ReportID, TelemetrySource } from './telemetry.type';

const TELEMETRY_INTERVAL = 30 * 1000;
const SOURCE_EXPIRY_INTERVAL = 1 * 60 * 60 * 1000 - 10 * 1000; // Sources are valid for 1 hour, purposefully expire them a little early ( 10 seconds should do it )
const TELEMETRY_INSTANCES: Map<string, Telemetry> = new Map();

export class Telemetry {
  private readonly id: string;
  private readonly graphQL: GraphQL;
  private readonly reportCount;
  private references = 0;
  private subscription: Subscription;
  private sources$: Observable<TelemetrySource>;

  constructor(id: string, graphql: GraphQL, telemetryNames: Dictionary<Dictionary<string>>) {
    this.id = id;
    this.graphQL = graphql;
    if (TELEMETRY_INSTANCES.has(id)) {
      throw new Error(
        `Telemetry instance ${id} already exists. Ensure all consumers use the "Telemetry.create" to instantiate and "disconnect" when it is not longer needed.`,
      );
    }
    TELEMETRY_INSTANCES.set(id, this);

    const reportNames = Object.entries(telemetryNames).map(([componentId, componentTelemetryDetails]) => ({
      componentId,
      reportName: Object.values(componentTelemetryDetails)[0],
    }));

    this.reportCount = reportNames.length;

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

  static connect(id: string, graphQL: GraphQL, reportNames: Dictionary<Dictionary<string>>): Telemetry {
    let inst = TELEMETRY_INSTANCES.get(id);
    if (!inst) {
      inst = new Telemetry(id, graphQL, reportNames);
      TELEMETRY_INSTANCES.set(id, inst);
    }
    inst.__connect();
    return inst;
  }

  private async getTelemetrySources(reportNames: ReportID[]): Promise<TelemetrySource[]> {
    const response = await this.graphQL.query<Dictionary<TelemetrySource>>(`query {
      ${reportNames.map(({ reportName }, index) => {
        return `_${index}: workflowInstanceTelemetry(idWorkflowInstance:${this.id}, report:"${reportName}") {
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

  private __telemetryUpdates$?: Observable<TelemetrySource>;

  telemetryUpdates$(): Observable<TelemetrySource> {
    if (this.__telemetryUpdates$) {
      return this.__telemetryUpdates$;
    }

    const reportEtag: Map<string, string> = new Map();

    this.__telemetryUpdates$ = timer(0, TELEMETRY_INTERVAL).pipe(
      switchMap(() => this.sources$),
      switchMap(async (source) => {
        const response = await fetch(source.headUrl, { method: 'head' });
        if (!response.ok) {
          return { ...source, etag: '', hasReport: false };
        }
        const etag = response.headers.get('etag');
        if (!etag) {
          throw new Error('Server responded without etag on telemetry HEAD request');
        }
        return { ...source, etag, hasReport: true };
      }),
      filter((a) => {
        const old = reportEtag.get(a.reportId.componentId);
        reportEtag.set(a.reportId.componentId, a.etag);
        return a.etag !== old;
      }),
      multicast(new Subject<TelemetrySource>()),
      refCount(),
    );

    return this.__telemetryUpdates$;
  }

  private __reportReady$?: Observable<Dictionary<TelemetrySource>>;

  reportReady$() {
    if (this.__reportReady$) {
      return this.__reportReady$;
    }
    const aggregationMap: Dictionary<TelemetrySource> = {};
    this.__reportReady$ = this.telemetryUpdates$().pipe(
      // WARN assumes that the componentId is unique for each telemetry item ( correct at time of writing, but backend allows )
      map((source) => {
        aggregationMap[source.reportId.componentId] = source;
        return aggregationMap;
      }),
      filter((map) => Object.keys(map).length === this.reportCount),
      multicast(new BehaviorSubject<Optional<Dictionary<TelemetrySource>>>(null)),
      refCount(),
      filter(isDefined),
    );

    return this.__reportReady$;
  }

  private __telemetryReports$?: Observable<Dictionary<JSONObject>>;

  telemetryReports$(): Observable<Dictionary<JSONObject>> {
    if (this.__telemetryReports$) {
      return this.__telemetryReports$;
    }
    const aggregationMap: Dictionary<JSONObject> = {};
    this.__telemetryReports$ = this.telemetryUpdates$().pipe(
      filter((source) => source.hasReport ?? false),
      // WARN assumes that the componentId is unique for each telemetry item ( correct at time of writing, but backend allows )
      switchMap(async (source) => {
        const response = await fetch(source.getUrl);
        if (!response.ok) {
          return aggregationMap;
        }
        aggregationMap[source.reportId.componentId] = await response.json();
        return aggregationMap;
      }),
      multicast(new BehaviorSubject<Optional<Dictionary<JSONObject>>>(null)),
      refCount(),
      filter(isDefined),
    );

    return this.__telemetryReports$;
  }
}
