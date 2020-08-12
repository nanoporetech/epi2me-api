export interface ProfileCredentials {
    apikey?: string;
    apisecret?: string;
    endpoint?: string;
    url?: string;
    billing_account?: string;
    compute_account?: string;
}
export interface AllProfileData {
    [profileName: string]: ProfileCredentials;
}
export interface InternalAllProfileData {
    profiles?: AllProfileData;
    endpoint?: string;
}
export default class Profile {
    defaultEndpoint: string;
    allProfileData: InternalAllProfileData;
    constructor(allProfileData: AllProfileData);
    profile(id: string): ProfileCredentials;
    profiles(): string[];
}
