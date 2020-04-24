export namespace Epi2meProfileNS {
  export interface IProfileCredentials {
    apikey?: string;
    apisecret?: string;
    url?: string;
    billing_account?: string;
    compute_account?: string;
  }

  export interface AllProfileData {
    [profileName: string]: IProfileCredentials;
  }

  export type IProfileConstructor = new (allProfileData?: AllProfileData, raiseExceptions?: any) => Profile;

  export type IProfileName = string;
}

interface InternalAllProfileData {
  profiles?: Epi2meProfileNS.AllProfileData;
  endpoint?: string;
}
export default class Profile {
  allProfileData: InternalAllProfileData;
  defaultEndpoint: string;
  constructor(allProfileData: Epi2meProfileNS.AllProfileData);
  profile(id: Epi2meProfileNS.IProfileName): Epi2meProfileNS.IProfileCredentials;
  profiles(): Epi2meProfileNS.IProfileName[];
}
export {};
