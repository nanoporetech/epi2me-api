import type { Dictionary, Index, Optional } from 'ts-runtime-typecheck';

export interface Profile {
  apikey?: Optional<string>;
  apisecret?: Optional<string>;
  endpoint?: Optional<string>;
  billing_account?: Optional<Index>;
  compute_account?: Optional<Index>;
}

export interface ProfileFileStructure {
  profiles: Optional<Dictionary<Profile>>;
  endpoint: Optional<string>;
}
