import Profile from './profile';
import { Epi2meProfileNS } from './types';
interface InternalAllProfileData {
    profiles?: Epi2meProfileNS.AllProfileData;
    endpoint?: string;
}
export default class ProfileFS extends Profile {
    prefsFile: string;
    allProfileData: InternalAllProfileData;
    raiseExceptions: boolean;
    constructor(prefsFile?: string, raiseExceptions?: boolean);
    static profilePath(): string;
    profile(id: Epi2meProfileNS.IProfileName, obj?: Epi2meProfileNS.IProfileCredentials): Epi2meProfileNS.IProfileCredentials;
}
export {};
