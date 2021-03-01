import { Subject } from 'rxjs';

import type { Dictionary } from 'ts-runtime-typecheck';
import type { Profile } from './ProfileManager.type';

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

  get(id: string): Profile | null {
    const profile = this.profiles.get(id);
    if (profile) {
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
}
