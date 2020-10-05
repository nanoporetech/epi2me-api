import { ObjectDict } from './ObjectDict';
import { Index } from './runtime-typecast';

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
  userDefined?: ObjectDict<ObjectDict>;
  instanceAttributes?: InstanceAttribute[];
}
