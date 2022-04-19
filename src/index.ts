export * from './index.type';

import { DEFAULT_OPTIONS } from './default_options';
import { EPI2ME_FS as EPI2ME } from './epi2me-fs';

export { Factory } from './factory';
export { GraphQLFS } from './graphql-fs';
export { GraphQL } from './graphql';
export { ProfileManager } from './ProfileManager';
export { SampleReader, getExperiments, getSampleDirectory } from './sample-reader';
export { instantiateProfileManager } from './instantiateProfileManager';
export { EPI2ME };
export { registerProfile } from './registerProfile';
export * as Helpers from './helpers';
export * as FileExtension from './file_extensions';

export const version = DEFAULT_OPTIONS.agent_version;
export const EPI2ME_HOME = EPI2ME.EPI2ME_HOME;
