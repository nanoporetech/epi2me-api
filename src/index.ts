import { EPI2ME_FS as EPI2ME } from './epi2me-fs';
import { utilsFS as utils } from './utils-fs';
import { REST_FS as REST } from './rest-fs';
import SessionManager from './session-manager';
import { ProfileFS as Profile } from './profile-fs';
import { Factory } from './factory';
import { GraphQLFS } from './graphql-fs';
import { GraphQL } from './graphql';

import type { UtilityFS } from './utils-fs';
import type { EPI2ME_OPTIONS as Options } from './epi2me-options';
import type { Logger } from './Logger';
import type * as graphQLSchema from './graphql-types';
import type { SampleReader } from './sample-reader';

export { EPI2ME, REST, GraphQL, GraphQLFS, utils, SessionManager, Profile, Factory };
export * as Helpers from './helpers';
export const version = utils.version;
export const EPI2ME_HOME = EPI2ME.EPI2ME_HOME;

export * as FileExtension from './file_extensions';

export type { UtilityFS, Options, Logger, graphQLSchema, SampleReader };
