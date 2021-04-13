import { EPI2ME_FS } from './epi2me-fs';
import { BehaviorSubject, Subject, merge } from 'rxjs';
import { withLatestFrom, map, mapTo } from 'rxjs/operators';
import { Map as ImmutableMap } from 'immutable';
import { Telemetry } from './telemetry';

import type { REST_FS } from './rest-fs';
import type { GraphQL } from './graphql';
import type { Logger } from './Logger';
import type { SampleReader } from './sample-reader';
import type { Index, Dictionary } from 'ts-runtime-typecheck';
import type { EPI2ME_OPTIONS } from './epi2me-options';
import type { GQLWorkflowConfig } from './factory.type';

function printError(log: Logger, msg: string, err: unknown): void {
  if (err instanceof Error) {
    log.error(msg, err.stack);
  } else {
    log.error(msg, err);
  }
}

/*
Factory seems to be designed with the intention that a version of the EPI2ME
API can be passed in, then used as the base. However, at the moment it only
supports using the EPI2ME_FS
*/
export class Factory {
  private readonly EPI2ME: typeof EPI2ME_FS;
  private options: Partial<EPI2ME_OPTIONS>;
  private primary: EPI2ME_FS;

  readonly runningInstances$: BehaviorSubject<ImmutableMap<Index, EPI2ME_FS>> = new BehaviorSubject(ImmutableMap());

  private readonly addRunningInstance$: Subject<EPI2ME_FS> = new Subject();
  private readonly removeRunningInstanceById$: Subject<Index> = new Subject();

  constructor(api: typeof EPI2ME_FS, opts: Partial<EPI2ME_OPTIONS> = {}) {
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
    this.runningInstances$.next(ImmutableMap());
    this.primary = this.instantiate();
  }

  getRunningInstance(id: Index): EPI2ME_FS | undefined {
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
    } catch (startErr) {
      printError(this.log, 'Experienced error starting', startErr);
      try {
        await inst.stopEverything();
      } catch (stopErr) {
        printError(this.log, 'Also experienced error stopping', stopErr);
      }
    }
    return inst;
  }

  /**
   * @param {Object<string, any>} options
   * @param {GQLRunVariables} variables { userDefined: { [componentID]: { [paramOverride]: any } } }
   */
  async startGQLRun(options: Dictionary, variables: GQLWorkflowConfig): Promise<EPI2ME_FS> {
    const inst = this.instantiate({ ...options, useGraphQL: true });
    try {
      await inst.autoStartGQL(variables);
      this.manageInstance(inst);
    } catch (startErr) {
      printError(this.log, 'Experienced error starting', startErr);
      try {
        await inst.stopEverything();
      } catch (stopErr) {
        printError(this.log, 'Also experienced error stopping', stopErr);
      }
    }
    return inst;
  }
}
