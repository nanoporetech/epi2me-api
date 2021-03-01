import type { Dictionary, Optional } from 'ts-runtime-typecheck';

export interface Profile {
  apikey?: Optional<string>;
  apisecret?: Optional<string>;
  endpoint?: Optional<string>;
  billing_account?: Optional<string>;
  compute_account?: Optional<string>;
}

export interface ProfileFileStructure {
  profiles: Optional<Dictionary<Profile>>;
  endpoint: Optional<string>;
}
