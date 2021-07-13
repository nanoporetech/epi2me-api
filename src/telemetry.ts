import type { Dictionary, JSONObject, Optional } from 'ts-runtime-typecheck';
import type { ExtendedTelemetrySource, ReportID, TelemetryNames, TelemetrySource } from './telemetry.type';
import type { Observable } from 'rxjs';

import { fetch } from './network/fetch';
import { BehaviorSubject, interval, timer } from 'rxjs';
import {
  delayWhen,
  distinctUntilChanged,
  filter,
  map,
  multicast,
  refCount,
  retryWhen,
  switchMap,
  withLatestFrom,
} from 'rxjs/operators';
import { isDefined } from 'ts-runtime-typecheck';
import { GraphQL } from './graphql';

const TELEMETRY_INTERVAL = 30 * 1000;
const EXPIRY_GRACE_PERIOD = 5000;
const TELEMETRY_INSTANCES: Map<string, Telemetry> = new Map();

function cacheSubject$<T>(): BehaviorSubject<T | null> {
  return new BehaviorSubject<T | null>(null);
}

export class Telemetry {
  private readonly sources: () => Promise<TelemetrySource[]>;
  readonly updates$: Observable<ExtendedTelemetrySource[]>;
  readonly reports$: Observable<{ report: JSONObject | null; id: string }[]>;
  readonly anyReportsReady$: Observable<boolean>;

  constructor(id: string, graphql: GraphQL, telemetryNames: TelemetryNames) {
    /*
      NOTE this used to flatten sources so that each pipeline dealt with only
      1 report at a time, and then aggregated them as needed. This caused more
      complexity that was really needed. Also it highlighted the cancellation
      behavior in switchMap (quote from docs below) which causes unresolvable
      issues in that design. Mainly that spreading an array of values into a
      pipeline then performing async actions on them causes all but the last
      value in the pipe to be cancelled.
      
      https://www.learnrxjs.io/learn-rxjs/operators/transformation/switchmap#why-use-switchmap

      "The main difference between switchMap and other flattening operators is
      the cancelling effect. On each emission the previous inner observable
      (the result of the function you supplied) is cancelled and the new
      observable is subscribed. You can remember this by the phrase switch to
      a new observable."
    */

    // get the sources for the telemetry reports on this instance ( automatically updates when the sources expire )
    this.sources = this.getSources$(graphql, id, telemetryNames);

    // for updates to actually trigger on the first interval the timer MUST be a BehaviourSubject
    const intervalSubject$ = interval(TELEMETRY_INTERVAL).pipe(multicast(new BehaviorSubject(0)), refCount());

    // poll the sources to see if any have changed, emits all the sources if any have
    this.updates$ = intervalSubject$.pipe(
      switchMap(() => this.sources()),
      switchMap(async (sources) => {
        return Promise.all(
          sources.map(async (source) => {
            const response = await fetch(source.headUrl, { method: 'head' });
            if (!response.ok) {
              // when no report is available yet the head request produces a 404
              return { ...source, etag: '', hasReport: false };
            }
            // a change in the etag means a report has been updated, so add it to the output for comparison later
            const etag = response.headers.get('etag');
            if (!etag) {
              throw new Error('Server responded without etag on telemetry HEAD request');
            }
            return { ...source, etag, hasReport: true };
          }),
        );
      }),
      // after recieving an error from the network request above retry after 5 seconds ( note: error is not logged )
      retryWhen((errors$) => errors$.pipe(delayWhen(() => timer(5000)))),
      // only emit if one of the etags has changed
      distinctUntilChanged((previousSources, sources) =>
        previousSources.every((previous, index) => previous.etag === sources[index].etag),
      ),
      multicast(cacheSubject$<ExtendedTelemetrySource[]>()),
      refCount(),
      filter(isDefined),
    );

    // observe the updates$ to see if any report is currently available
    this.anyReportsReady$ = this.updates$.pipe(
      map((sources) => sources.some((source) => source.hasReport)),
      distinctUntilChanged(),
    );

    // used to compare against previous values within the reports$ pipeline
    const previousSourceList$ = cacheSubject$<ExtendedTelemetrySource[]>();
    const aggregatedReports$ = cacheSubject$<(JSONObject | null)[]>();

    const updateSourceList = async (existing: ExtendedTelemetrySource[]) => {
      const newSources = await this.sources();
      return existing.map(({ etag, hasReport }, i) => {
        const newSource = newSources[i];

        return {
          ...newSource,
          etag,
          hasReport,
        };
      });
    };

    this.reports$ = this.updates$.pipe(
      withLatestFrom(previousSourceList$, aggregatedReports$),
      switchMap(async ([sources, previous, reports]) => {
        const previousSources = previous ?? [];

        // NOTE this checks for expired sources
        const updatedSources = await updateSourceList(sources);
        const results: (JSONObject | null)[] = await Promise.all(
          updatedSources.map(async (current, index) => {
            // if there is no report we shouldn't try to get it
            if (!current.hasReport) {
              return null;
            }

            // first run, or has changed. we should fetch the report content
            if (!reports || current.etag !== previousSources[index]?.etag) {
              const response = await fetch(current.getUrl);
              if (!response.ok) {
                throw new Error('Unable to retrieve report content');
              }
              return response.json() as Promise<JSONObject>;
              // otherwise return the previous value
            } else {
              return reports[index];
            }
          }),
        );

        // update the "previous value" subjects
        previousSourceList$.next(updatedSources);
        aggregatedReports$.next(results);

        // emit as an array as so not to reorder the components
        return results.map((report, index) => {
          const { reportId } = sources[index];
          return {
            report,
            id: reportId.componentId,
          };
        });
      }),
      // after recieving an error from the network request above retry after 5 seconds ( note: error is not logged )
      retryWhen((errors$) => errors$.pipe(delayWhen(() => timer(5000)))),
      multicast(cacheSubject$<{ report: JSONObject | null; id: string }[]>()),
      refCount(),
      filter(isDefined),
    );
  }

  private async getTelemetrySources(graphql: GraphQL, id: string, reportNames: ReportID[]): Promise<TelemetrySource[]> {
    const createFragment = (report: string, index: number) => {
      return `_${index}: workflowInstanceTelemetry(idWorkflowInstance:${id}, report:"${report}") {
        getUrl
        headUrl
        expiresIn
      }`;
    };
    const response = await graphql.query<Dictionary<TelemetrySource>>(`query {
      ${reportNames.map(({ reportName }, index) => createFragment(reportName, index))}
    }`)({
      options: {
        fetchPolicy: GraphQL.NETWORK_ONLY,
      },
    });

    // WARN is this the correct behavior??
    if (response.error) {
      throw new Error(response.error.message);
    }

    return Object.values(response.data).map(({ getUrl, headUrl, expiresIn }, index) => ({
      getUrl,
      headUrl,
      instanceId: id,
      expiresIn,
      reportId: reportNames[index],
    }));
  }

  private getSources$(graphql: GraphQL, id: string, telemetryNames: TelemetryNames): () => Promise<TelemetrySource[]> {
    let expires = 0;
    let sources: Optional<TelemetrySource[]> = null;

    const reportNames = Object.entries(telemetryNames).map(([componentId, componentTelemetryDetails]) => ({
      componentId,
      reportName: Object.values(componentTelemetryDetails)[0],
    }));

    return async () => {
      const startTime = Date.now();

      if (startTime < expires && sources) {
        return sources;
      }

      sources = await this.getTelemetrySources(graphql, id, reportNames);
      const expiresIn = sources.reduce((acc, source) => Math.min(acc, source.expiresIn), Infinity) * 1000;
      expires = startTime + expiresIn - EXPIRY_GRACE_PERIOD;
      return sources;
    };
  }

  // ensures we don't get more than 1 instance of telemetry for a epi2me instance
  static connect(id: string, graphQL: GraphQL, reportNames: TelemetryNames): Telemetry {
    let inst = TELEMETRY_INSTANCES.get(id);
    if (!inst) {
      inst = new Telemetry(id, graphQL, reportNames);
      TELEMETRY_INSTANCES.set(id, inst);
    }
    return inst;
  }
}
