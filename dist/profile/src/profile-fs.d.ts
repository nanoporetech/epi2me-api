import Profile, { InternalAllProfileData, ProfileCredentials } from './profile';
export default class ProfileFS extends Profile {
    prefsFile: string;
    allProfileData: InternalAllProfileData;
    raiseExceptions: boolean;
    constructor(prefsFile?: string, raiseExceptions?: boolean);
    static profilePath(): string;
    profile(id: string, obj?: ProfileCredentials): ProfileCredentials;
}
