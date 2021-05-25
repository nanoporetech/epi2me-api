import type * as graphQLSchema from './graphql-types';

export type { EPI2ME_OPTIONS as Options } from './epi2me-options';
export type { CriticalErrorId, Logger } from './Logger';
export type { SampleReader } from './sample-reader';
export type { Profile } from './ProfileManager.type';
export type { graphQLSchema };
export type UtilityFS = typeof utils;

import SessionManager from './session-manager';
import { EPI2ME_FS as EPI2ME } from './epi2me-fs';
import { utilsFS as utils } from './utils-fs';

export { REST_FS as REST } from './rest-fs';
export { Factory } from './factory';
export { GraphQLFS } from './graphql-fs';
export { GraphQL } from './graphql';
export { ProfileManager } from './ProfileManager';
export { instantiateProfileManager } from './instantiateProfileManager';
export { SessionManager, EPI2ME, utils };
export * as Helpers from './helpers';
export * as FileExtension from './file_extensions';

export const version = utils.version;
export const EPI2ME_HOME = EPI2ME.EPI2ME_HOME;
