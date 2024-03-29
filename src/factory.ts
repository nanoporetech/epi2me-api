import type { REST_FS } from './rest-fs';
import type { GraphQL } from './graphql';
import type { Logger } from './Logger.type';
import type { SampleReader } from './sample-reader';
import type { Index, Dictionary } from 'ts-runtime-typecheck';
import type { EPI2ME_OPTIONS } from './epi2me-options.type';
import { EPI2ME_FS } from './epi2me-fs';

import { BehaviorSubject, Subject, merge } from 'rxjs';
import { withLatestFrom, map, mapTo } from 'rxjs/operators';
import { Map as ImmutableMap } from 'immutable';
import { Telemetry } from './telemetry';
import { wrapAndLogError } from './NodeError';
import type { StartWorkflowMutationVariables } from './generated/graphql';

/*
Factory seems to be designed with the intention that a version of the EPI2ME
API can be passed in, then used as the base. However, at the moment it only
supports using the EPI2ME_FS
*/
export class Factory {
  private readonly EPI2ME: typeof EPI2ME_FS;
  private options: Partial<EPI2ME_OPTIONS>;
  private primary: EPI2ME_FS;

  readonly runningInstances$ = new BehaviorSubject(ImmutableMap<Index, EPI2ME_FS>());

  private readonly addRunningInstance$ = new Subject<EPI2ME_FS>();
  private readonly removeRunningInstanceById$ = new Subject<Index>();

  constructor(api: typeof EPI2ME_FS = EPI2ME_FS, opts: Partial<EPI2ME_OPTIONS> = {}) {
    this.EPI2ME = api;
    this.options = opts;
    this.primary = this.instantiate();

    const addedInstances$ = this.addRunningInstance$.pipe(
      withLatestFrom(this.runningInstances$),
      map(([newInstance, runningInstances]) => {
        return runningInstances.set(newInstance.id, newInstance);
      }),
    );

    const removedInstances$ = this.removeRunningInstanceById$.pipe(
      withLatestFrom(this.runningInstances$),
      map(([instanceId, runningInstances]) => {
        return runningInstances.delete(instanceId);
      }),
    );

    merge(addedInstances$, removedInstances$).subscribe((latestInstances) => {
      this.runningInstances$.next(latestInstances);
    });
  }

  get utils(): typeof EPI2ME_FS.utils {
    return this.EPI2ME.utils;
  }

  get version(): string {
    return this.EPI2ME.version;
  }

  get log(): Logger {
    return this.primary.log;
  }

  get REST(): REST_FS {
    return this.primary.REST;
  }

  get url(): string {
    return this.primary.url();
  }

  get graphQL(): GraphQL {
    return this.primary.graphQL;
  }

  get sampleReader(): SampleReader {
    return this.primary.SampleReader;
  }

  telemetry(id: string, telemetryNames: Dictionary<Dictionary<string>>): Telemetry {
    return Telemetry.connect(id, this.graphQL, telemetryNames);
  }

  reset(options: Partial<EPI2ME_OPTIONS> = {}): void {
    this.options = options;
    // WARN what happens to the running instances here?
    this.runningInstances$.next(ImmutableMap<Index, EPI2ME_FS>());
    this.primary = this.instantiate();
  }

  getRunningInstance(id: Index): EPI2ME_FS | undefined {
    // eslint-disable-next-line rxjs/no-subject-value
    return this.runningInstances$.getValue().get(id);
  }

  private instantiate(options: Partial<EPI2ME_OPTIONS> = {}): EPI2ME_FS {
    return new this.EPI2ME({
      ...this.options,
      ...options,
    });
  }

  private manageInstance(inst: EPI2ME_FS): void {
    this.addRunningInstance$.next(inst);
    // NOTE ensure the 'complete' message from uploadStopped$ is not passed to removeRunningInstanceById$
    inst.analysisStopped$.pipe(mapTo(inst.id)).subscribe((id: Index) => this.removeRunningInstanceById$.next(id));
  }

  async startRun(
    options: Partial<EPI2ME_OPTIONS>,
    workflowConfig: {
      id_workflow: string;
      is_consented_human: 0 | 1;
      user_defined: unknown;
      instance_attributes: unknown;
      compute_account?: Index;
      storage_account?: Index;
      store_results?: boolean;
      workflowAttributes?: Dictionary<string | number | boolean>;
    },
  ): Promise<EPI2ME_FS> {
    const inst = this.instantiate(options);
    try {
      await inst.autoStart(workflowConfig);
      this.manageInstance(inst);
    } catch (err) {
      wrapAndLogError('experienced error starting', err, this.log);
      try {
        await inst.stopEverything();
      } catch (err) {
        wrapAndLogError('also experienced error stopping', err, this.log);
      }
    }
    return inst;
  }

  /**
   * @param {Object<string, any>} options
   * @param {GQLRunVariables} variables { userDefined: { [componentID]: { [paramOverride]: any } } }
   */
  async startGQLRun(options: Partial<EPI2ME_OPTIONS>, variables: StartWorkflowMutationVariables): Promise<EPI2ME_FS> {
    const inst = this.instantiate({ ...options, useGraphQL: true });
    try {
      await inst.autoStartGQL(variables);
      this.manageInstance(inst);
    } catch (err) {
      wrapAndLogError('experienced error starting', err, this.log);
      try {
        await inst.stopEverything();
      } catch (err) {
        wrapAndLogError('also experienced error stopping', err, this.log);
      }
    }
    return inst;
  }
}
