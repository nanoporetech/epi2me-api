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

  export type IProfileConstructor = new (allProfileData?: AllProfileData, raiseExceptions?: any) => IAPIProfileInstance;

  export type IProfileName = string;

  export interface IAPIProfileInstance {
    profile(profileName: IProfileName, credentials?: IProfileCredentials): IProfileCredentials;
    profiles(): IProfileName[];
  }
}
