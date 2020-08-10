import EPI2ME from './epi2me-fs';
import utils from './utils-fs';
import REST from './rest-fs';
import SessionManager from './session-manager';
import Profile from './profile-fs';
import Factory from './factory';

import type { UtilityFS } from './utils-fs';
import type GraphQL from './graphql';
import type { EPI2ME_OPTIONS as Options } from './epi2me-options';
import type { Logger } from './Logger';
import type * as graphQLSchema from './graphql-types';

export { EPI2ME, REST, utils, SessionManager, Profile, Factory };
export const version = utils.version;
export const EPI2ME_HOME = EPI2ME.EPI2ME_HOME;

export type { UtilityFS, GraphQL, Options, Logger, graphQLSchema };