import type { Observable } from 'rxjs';
import type { Dictionary } from 'ts-runtime-typecheck';
import type { Profile } from './ProfileManager.type';

import { BehaviorSubject, Subject } from 'rxjs';
import { Map as ImmutableMap } from 'immutable';
export class ProfileManager {
  private profiles: Map<string, Profile>;
  private defaultEndpoint: string;

  readonly profiles$: Subject<[string, Profile][]> = new Subject();

  constructor(profiles: Dictionary<Profile>, defaultEndpoint: string) {
    this.profiles = new Map(Object.entries(profiles));
    this.defaultEndpoint = defaultEndpoint;
  }

  private updateProfiles(): void {
    this.profiles$.next(Array.from(this.profiles.entries()));
  }

  create(id: string, credentials: Profile): void {
    if (this.profiles.has(id)) {
      throw new Error(`A profile already exists with the name ${id}.`);
    }
    this.profiles.set(id, {
      ...credentials,
    });
    this.updateProfiles();
  }

  get(id: string, raw = false): Profile | null {
    const profile = this.profiles.get(id);
    if (profile) {
      if (raw) {
        return { ...profile };
      }
      return {
        endpoint: this.defaultEndpoint,
        ...profile,
      };
    }

    return null;
  }

  update(id: string, credentials: Partial<Profile>): void {
    const profile = this.profiles.get(id);
    if (!profile) {
      throw new Error(`No profile exists with the name ${id}.`);
    }

    this.profiles.set(id, {
      ...profile,
      ...credentials,
    });
    this.updateProfiles();
  }

  delete(id: string): void {
    const success = this.profiles.delete(id);
    if (!success) {
      throw new Error(`No profile exists with the name ${id}.`);
    }

    this.updateProfiles();
  }

  profileNames(): Iterable<string> {
    return this.profiles.keys();
  }

  entries$(raw = false): Observable<ImmutableMap<string, Profile>> {
    const subject$ = new BehaviorSubject(ImmutableMap(this.entries(raw)));
    this.profiles$.subscribe(() => subject$.next(ImmutableMap(this.entries(raw))));
    return subject$;
  }

  *entries(raw = false): Iterable<[string, Profile]> {
    for (const [profileName, profile] of this.profiles) {
      if (raw) {
        yield [profileName, { ...profile }];
      } else {
        yield [
          profileName,
          {
            endpoint: this.defaultEndpoint,
            ...profile,
          },
        ];
      }
    }
  }
}
