export * from './index.type';
export type UtilityFS = typeof utils;

import { EPI2ME_FS as EPI2ME } from './epi2me-fs';
import { utilsFS as utils } from './utils-fs';

export { REST_FS as REST } from './rest-fs';
export { Factory } from './factory';
export { GraphQLFS } from './graphql-fs';
export { GraphQL } from './graphql';
export { ProfileManager } from './ProfileManager';
export { instantiateProfileManager } from './instantiateProfileManager';
export { EPI2ME, utils };
export * as Helpers from './helpers';
export * as FileExtension from './file_extensions';

export const version = utils.version;
export const EPI2ME_HOME = EPI2ME.EPI2ME_HOME;
