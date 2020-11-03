import type { Index, Dictionary } from 'ts-runtime-typecheck';

export interface InstanceAttribute {
  id_attribute: Index;
  value: string;
}

export interface GQLWorkflowConfig {
  idWorkflow: Index;
  computeAccountId: Index;
  storageAccountId?: Index;
  isConsentedHuman?: boolean;
  idDataset?: Index;
  storeResults?: boolean;
  region?: string;
  userDefined?: Dictionary<Dictionary>;
  instanceAttributes?: InstanceAttribute[];
}
