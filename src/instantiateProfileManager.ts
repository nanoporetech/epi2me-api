import type { Logger } from './Logger.type';
import type { Profile } from './ProfileManager.type';
import type { Dictionary, Optional } from 'ts-runtime-typecheck';

import { asStruct, isOptDictionaryOf, isOptIndex, isOptString, isStruct } from 'ts-runtime-typecheck';
import { ProfileManager } from './ProfileManager';
import { url as DEFAULT_ENDPOINT } from './default_options.json';

// WARN uses Node.js stuff here
import { promises as fs } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { Subject } from 'rxjs';

function getDefaultEndpoint() {
  return process.env.METRICHOR || DEFAULT_ENDPOINT;
}

function getDefaultProfilePath() {
  return join(homedir(), '.epi2me.json');
}

const isProfile = isStruct({
  apikey: isOptString,
  apisecret: isOptString,
  endpoint: isOptString,
  billing_account: isOptIndex,
  compute_account: isOptIndex,
});

const asProfileFileStructure = asStruct({
  profiles: isOptDictionaryOf(isProfile),
  endpoint: isOptString,
});

export async function instantiateProfileManager({
  filepath = getDefaultProfilePath(),
  defaultEndpoint = getDefaultEndpoint(),
  logger,
}: {
  filepath?: string;
  defaultEndpoint?: string;
  logger?: Pick<Logger, 'critical'>;
} = {}): Promise<{ manager: ProfileManager; syncSuccess$: Subject<boolean> }> {
  // NOTe use undefined to ensure these are not placed into the file if not set
  let profiles: Optional<Dictionary<Profile>> = undefined;
  let endpoint: Optional<string> = undefined;

  // Attempt to read the profile data back from file
  try {
    const contents = await fs.readFile(filepath, 'utf8');
    // Parse and validate the file
    ({ profiles, endpoint } = asProfileFileStructure(JSON.parse(contents)));
  } catch (error) {
    // Don't throw if the file doesn't exist
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }

  const manager = new ProfileManager(profiles ?? {}, endpoint ?? defaultEndpoint);
  const syncSuccess$ = new Subject<boolean>();

  // Observe any changes to the profiles, and serialize to disc
  manager.profiles$.subscribe((profileList) => {
    const profiles: Dictionary<Profile> = {};
    for (const [id, profile] of profileList) {
      profiles[id] = profile;
    }
    fs.writeFile(
      filepath,
      JSON.stringify({
        profiles,
        endpoint,
      }),
    ).then(
      () => {
        syncSuccess$.next(true);
      },
      (err) => {
        syncSuccess$.next(false);
        if (logger) {
          logger.critical('PROFILE_PERSIST', 'Failed to serialize profiles to disc ' + err.message);
        }
      },
    );
  });

  return {
    manager,
    syncSuccess$,
  };
}
