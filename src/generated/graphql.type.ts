export type Maybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  DateTime: unknown;
  GenericScalar: unknown;
};

export type AccountObjectType = {
  __typename?: 'AccountObjectType';
  created: Scalars['DateTime'];
  lastModified: Scalars['DateTime'];
  idAccount: Scalars['ID'];
  sfId?: Maybe<Scalars['String']>;
  number: Scalars['String'];
  name?: Maybe<Scalars['String']>;
  isDeleted: Scalars['Int'];
  isShared?: Maybe<Scalars['Boolean']>;
  useraccountSet: Array<UserAccountObjectType>;
  leaders?: Maybe<Array<Maybe<MemberObjectType>>>;
  members?: Maybe<Array<Maybe<MemberObjectType>>>;
};

export type ApiAccessObjectType = {
  __typename?: 'ApiAccessObjectType';
  created: Scalars['DateTime'];
  lastModified: Scalars['DateTime'];
  idApiAccess: Scalars['ID'];
  description: Scalars['String'];
  apikey: Scalars['String'];
  apisecret: Scalars['String'];
  user: RestrictedUserObjectType;
  isActive: Scalars['Int'];
  isDownloadable?: Maybe<Scalars['Boolean']>;
};

export type AttributeParams = {
  name: Scalars['String'];
  value: Scalars['String'];
};

export type AttributeType = {
  __typename?: 'AttributeType';
  idAttribute: Scalars['ID'];
  name: Scalars['String'];
  description: Scalars['String'];
  type: Scalars['String'];
  format: Scalars['String'];
  errorMessage?: Maybe<Scalars['String']>;
  idUserOwner: Scalars['Float'];
  created?: Maybe<Scalars['DateTime']>;
  lastModified?: Maybe<Scalars['DateTime']>;
  isMutable: Scalars['Int'];
  attributevalueSet: Array<AttributeValueType>;
};

export type AttributeValueType = {
  __typename?: 'AttributeValueType';
  idAttributeValue: Scalars['ID'];
  attribute: AttributeType;
  value?: Maybe<Scalars['String']>;
  idUserOwner: Scalars['Float'];
  created?: Maybe<Scalars['DateTime']>;
  lastModified?: Maybe<Scalars['DateTime']>;
  datasetSet: Array<DatasetType>;
  workflowSet: Array<WorkflowType>;
  workflowinstanceSet: Array<WorkflowInstanceType>;
};

export type CreateApiAccessMutation = {
  __typename?: 'CreateApiAccessMutation';
  apiAccess?: Maybe<ApiAccessObjectType>;
};

export type CreateProductMutation = {
  __typename?: 'CreateProductMutation';
  product?: Maybe<ProductType>;
};

export type CreateWorkflowInstanceReportShareMutation = {
  __typename?: 'CreateWorkflowInstanceReportShareMutation';
  idWorkflowInstance?: Maybe<Scalars['ID']>;
  token?: Maybe<Scalars['String']>;
  expiry?: Maybe<Scalars['DateTime']>;
};

export type CreateWorkflowInstanceTagsMutation = {
  __typename?: 'CreateWorkflowInstanceTagsMutation';
  workflowInstance?: Maybe<WorkflowInstanceType>;
  created?: Maybe<Array<TagDataType>>;
  errors?: Maybe<Array<Maybe<ValidationErrorListType>>>;
};

export type DatasetStatusType = {
  __typename?: 'DatasetStatusType';
  idDatasetStatus: Scalars['ID'];
  value: Scalars['String'];
  label?: Maybe<Scalars['String']>;
  created?: Maybe<Scalars['DateTime']>;
  lastModified: Scalars['DateTime'];
  datasetSet: Array<DatasetType>;
};

export type DatasetType = {
  __typename?: 'DatasetType';
  idDataset: Scalars['ID'];
  uuid: Scalars['String'];
  idAccount: Scalars['Float'];
  prefix: Scalars['String'];
  name?: Maybe<Scalars['String']>;
  idUser: Scalars['Float'];
  size: Scalars['Float'];
  summary?: Maybe<Scalars['String']>;
  source?: Maybe<Scalars['String']>;
  componentId: Scalars['String'];
  isConsentedHuman?: Maybe<Scalars['Int']>;
  registrationParams?: Maybe<Scalars['GenericScalar']>;
  datasetStatus: DatasetStatusType;
  created: Scalars['DateTime'];
  lastModified: Scalars['DateTime'];
  attributes: Array<AttributeValueType>;
  workflowinstanceSet: Array<WorkflowInstanceType>;
};

export type DeactivateApiAccessMutation = {
  __typename?: 'DeactivateApiAccessMutation';
  apiAccess?: Maybe<LimitedApiAccessObjectType>;
};

export type DeleteWorkflowInstanceTagsMutation = {
  __typename?: 'DeleteWorkflowInstanceTagsMutation';
  workflowInstance?: Maybe<WorkflowInstanceType>;
  deleted?: Maybe<Array<Maybe<TagDataOutputType>>>;
  errors?: Maybe<Array<Maybe<ValidationErrorListType>>>;
};

export type DocumentationSectionInputType = {
  title?: Maybe<Scalars['String']>;
  section?: Maybe<Scalars['String']>;
  format?: Maybe<Scalars['String']>;
  content?: Maybe<Scalars['String']>;
};

export type DocumentationType = {
  __typename?: 'DocumentationType';
  published?: Maybe<Scalars['DateTime']>;
  languageCode?: Maybe<Scalars['String']>;
  title?: Maybe<Scalars['String']>;
  section?: Maybe<Scalars['String']>;
  format?: Maybe<Scalars['String']>;
  content?: Maybe<Scalars['String']>;
};

export type EditWorkflowInstanceTagsMutation = {
  __typename?: 'EditWorkflowInstanceTagsMutation';
  workflowInstance?: Maybe<WorkflowInstanceType>;
  edited?: Maybe<Array<TagDataType>>;
  errors?: Maybe<Array<Maybe<ValidationErrorListType>>>;
};

export type ErrorType = {
  __typename?: 'ErrorType';
  field: Scalars['String'];
  messages: Array<Scalars['String']>;
};

export type GenerateRegTokenMutation = {
  __typename?: 'GenerateRegTokenMutation';
  code?: Maybe<Scalars['String']>;
  expires?: Maybe<Scalars['DateTime']>;
};

export type InstanceTokenMutation = {
  __typename?: 'InstanceTokenMutation';
  idWorkflowInstance?: Maybe<Scalars['ID']>;
  accessKeyId?: Maybe<Scalars['String']>;
  secretAccessKey?: Maybe<Scalars['String']>;
  sessionToken?: Maybe<Scalars['String']>;
  expiration?: Maybe<Scalars['DateTime']>;
  region?: Maybe<Scalars['String']>;
};

export type LimitedApiAccessObjectType = {
  __typename?: 'LimitedApiAccessObjectType';
  created: Scalars['DateTime'];
  lastModified: Scalars['DateTime'];
  idApiAccess: Scalars['ID'];
  description: Scalars['String'];
  apikey: Scalars['String'];
  user: RestrictedUserObjectType;
  isActive: Scalars['Int'];
};

export type LinkWorkflowToProductMutation = {
  __typename?: 'LinkWorkflowToProductMutation';
  workflowProduct?: Maybe<WorkflowProductType>;
};

export type MemberObjectType = {
  __typename?: 'MemberObjectType';
  user?: Maybe<RestrictedUserObjectType>;
  role?: Maybe<Scalars['String']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  startWorkflowInstance?: Maybe<WorkflowInstanceMutation>;
  stopWorkflowInstance?: Maybe<StopWorkflowInstanceMutation>;
  createWorkflowInstanceReportShare?: Maybe<CreateWorkflowInstanceReportShareMutation>;
  getInstanceToken?: Maybe<InstanceTokenMutation>;
  setUserFavouriteWorkflow?: Maybe<UpdateUserFavouriteWorkflowMutation>;
  setWorkflowInstanceIsArchived?: Maybe<SetWorkflowInstanceIsArchivedMutation>;
  createWorkflowInstanceTags?: Maybe<CreateWorkflowInstanceTagsMutation>;
  editWorkflowInstanceTags?: Maybe<EditWorkflowInstanceTagsMutation>;
  deleteWorkflowInstanceTags?: Maybe<DeleteWorkflowInstanceTagsMutation>;
  createProduct?: Maybe<CreateProductMutation>;
  linkWorkflowToProduct?: Maybe<LinkWorkflowToProductMutation>;
  publishProductDocumentation?: Maybe<PublishProductDocumentationMutation>;
  registerToken?: Maybe<RegisterTokenMutation>;
  generateRegToken?: Maybe<GenerateRegTokenMutation>;
  updateUser?: Maybe<UpdateUserMutation>;
  deactivateApiKey?: Maybe<DeactivateApiAccessMutation>;
  createApiKey?: Maybe<CreateApiAccessMutation>;
  updateAccountShared?: Maybe<UpdateAccountSharedMutation>;
};

export type MutationStartWorkflowInstanceArgs = {
  computeAccountId: Scalars['ID'];
  idDataset?: Maybe<Scalars['ID']>;
  idWorkflow: Scalars['ID'];
  instanceAttributes?: Maybe<Array<Maybe<Scalars['GenericScalar']>>>;
  isConsentedHuman?: Maybe<Scalars['Boolean']>;
  region?: Maybe<Scalars['String']>;
  storageAccountId?: Maybe<Scalars['ID']>;
  storeResults?: Maybe<Scalars['Boolean']>;
  userDefined?: Maybe<Scalars['GenericScalar']>;
};

export type MutationStopWorkflowInstanceArgs = {
  idWorkflowInstance: Scalars['ID'];
};

export type MutationCreateWorkflowInstanceReportShareArgs = {
  idWorkflowInstance: Scalars['ID'];
};

export type MutationGetInstanceTokenArgs = {
  idWorkflowInstance: Scalars['ID'];
  readOnly?: Maybe<Scalars['Boolean']>;
};

export type MutationSetUserFavouriteWorkflowArgs = {
  idRegion?: Maybe<Scalars['ID']>;
  idWorkflow: Scalars['ID'];
  isFavourite: Scalars['Boolean'];
};

export type MutationSetWorkflowInstanceIsArchivedArgs = {
  idWorkflowInstance: Scalars['ID'];
  isArchived?: Maybe<Scalars['Boolean']>;
};

export type MutationCreateWorkflowInstanceTagsArgs = {
  createList?: Maybe<Array<TagDataCreateInputType>>;
  idWorkflowInstance: Scalars['ID'];
};

export type MutationEditWorkflowInstanceTagsArgs = {
  editList?: Maybe<Array<TagDataEditInputType>>;
  idWorkflowInstance: Scalars['ID'];
};

export type MutationDeleteWorkflowInstanceTagsArgs = {
  deleteList?: Maybe<Array<Scalars['ID']>>;
  idWorkflowInstance: Scalars['ID'];
};

export type MutationCreateProductArgs = {
  isPublic?: Maybe<Scalars['Boolean']>;
  name: Scalars['String'];
  orgContactEmail?: Maybe<Scalars['String']>;
  orgContactName?: Maybe<Scalars['String']>;
  orgName?: Maybe<Scalars['String']>;
  orgUrl?: Maybe<Scalars['String']>;
  tagline?: Maybe<Scalars['String']>;
};

export type MutationLinkWorkflowToProductArgs = {
  exampleUrl?: Maybe<Scalars['String']>;
  idProduct?: Maybe<Scalars['ID']>;
  idWorkflow: Scalars['ID'];
  productName?: Maybe<Scalars['ID']>;
};

export type MutationPublishProductDocumentationArgs = {
  idWorkflow: Scalars['ID'];
  languageCode?: Maybe<Scalars['String']>;
  sections: Array<Maybe<DocumentationSectionInputType>>;
};

export type MutationRegisterTokenArgs = {
  code: Scalars['String'];
  description?: Maybe<Scalars['String']>;
};

export type MutationUpdateUserArgs = {
  idRegionPreferred?: Maybe<Scalars['ID']>;
  realname?: Maybe<Scalars['String']>;
};

export type MutationDeactivateApiKeyArgs = {
  idApiAccess?: Maybe<Scalars['ID']>;
};

export type MutationCreateApiKeyArgs = {
  description?: Maybe<Scalars['String']>;
};

export type MutationUpdateAccountSharedArgs = {
  idAccount: Scalars['ID'];
  isShared: Scalars['Boolean'];
};

export type PaginatedDatasetType = PaginatedInterface & {
  __typename?: 'PaginatedDatasetType';
  page?: Maybe<Scalars['Int']>;
  pages?: Maybe<Scalars['Int']>;
  hasNext?: Maybe<Scalars['Boolean']>;
  hasPrevious?: Maybe<Scalars['Boolean']>;
  totalCount?: Maybe<Scalars['Int']>;
  results?: Maybe<Array<Maybe<DatasetType>>>;
};

export type PaginatedInterface = {
  page?: Maybe<Scalars['Int']>;
  pages?: Maybe<Scalars['Int']>;
  hasNext?: Maybe<Scalars['Boolean']>;
  hasPrevious?: Maybe<Scalars['Boolean']>;
  totalCount?: Maybe<Scalars['Int']>;
};

export type PaginatedProductType = PaginatedInterface & {
  __typename?: 'PaginatedProductType';
  page?: Maybe<Scalars['Int']>;
  pages?: Maybe<Scalars['Int']>;
  hasNext?: Maybe<Scalars['Boolean']>;
  hasPrevious?: Maybe<Scalars['Boolean']>;
  totalCount?: Maybe<Scalars['Int']>;
  results?: Maybe<Array<Maybe<ProductType>>>;
};

export type PaginatedWorkflowInstanceType = PaginatedInterface & {
  __typename?: 'PaginatedWorkflowInstanceType';
  page?: Maybe<Scalars['Int']>;
  pages?: Maybe<Scalars['Int']>;
  hasNext?: Maybe<Scalars['Boolean']>;
  hasPrevious?: Maybe<Scalars['Boolean']>;
  totalCount?: Maybe<Scalars['Int']>;
  results?: Maybe<Array<Maybe<WorkflowInstanceType>>>;
};

export type PaginatedWorkflowType = PaginatedInterface & {
  __typename?: 'PaginatedWorkflowType';
  page?: Maybe<Scalars['Int']>;
  pages?: Maybe<Scalars['Int']>;
  hasNext?: Maybe<Scalars['Boolean']>;
  hasPrevious?: Maybe<Scalars['Boolean']>;
  totalCount?: Maybe<Scalars['Int']>;
  results?: Maybe<Array<Maybe<WorkflowType>>>;
};

export type ProductType = {
  __typename?: 'ProductType';
  idProduct: Scalars['ID'];
  name: Scalars['String'];
  tagline?: Maybe<Scalars['String']>;
  orgName?: Maybe<Scalars['String']>;
  orgContactName?: Maybe<Scalars['String']>;
  orgContactEmail?: Maybe<Scalars['String']>;
  orgUrl?: Maybe<Scalars['String']>;
  isPublic: Scalars['Boolean'];
  created: Scalars['DateTime'];
  lastModified: Scalars['DateTime'];
  workflows: Array<WorkflowType>;
  workflowProducts: Array<WorkflowProductType>;
};

export type PublishProductDocumentationMutation = {
  __typename?: 'PublishProductDocumentationMutation';
  success?: Maybe<Scalars['Boolean']>;
};

export type Query = {
  __typename?: 'Query';
  allProducts?: Maybe<PaginatedProductType>;
  product?: Maybe<ProductType>;
  allWorkflowInstances?: Maybe<PaginatedWorkflowInstanceType>;
  workflowInstance?: Maybe<WorkflowInstanceType>;
  workflowInstanceTelemetry?: Maybe<WorkflowInstanceTelemetry>;
  workflowInstanceRawCsvUrlData?: Maybe<WorkflowCsvPresignedUrlsType>;
  allWorkflows?: Maybe<PaginatedWorkflowType>;
  allDatasets?: Maybe<PaginatedDatasetType>;
  workflow?: Maybe<WorkflowType>;
  status?: Maybe<StatusType>;
  regions?: Maybe<Array<Maybe<RegionType>>>;
  attributes?: Maybe<Array<Maybe<AttributeType>>>;
  allUsers?: Maybe<Array<Maybe<UserObjectType>>>;
  allUserAccounts?: Maybe<Array<Maybe<UserAccountObjectType>>>;
  me?: Maybe<UserObjectType>;
  allApiKeys?: Maybe<Array<Maybe<LimitedApiAccessObjectType>>>;
  account?: Maybe<AccountObjectType>;
  userServiceStatus?: Maybe<ServiceStatusType>;
};

export type QueryAllProductsArgs = {
  search?: Maybe<Scalars['String']>;
  page?: Maybe<Scalars['Int']>;
  pageSize?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<Scalars['String']>;
};

export type QueryProductArgs = {
  idProduct: Scalars['ID'];
};

export type QueryAllWorkflowInstancesArgs = {
  idUser?: Maybe<Scalars['ID']>;
  shared?: Maybe<Scalars['Boolean']>;
  search?: Maybe<Scalars['String']>;
  searchField?: Maybe<WorkflowInstanceSearchField>;
  isRunning?: Maybe<Scalars['Boolean']>;
  archived?: Maybe<Scalars['Boolean']>;
  owned?: Maybe<Scalars['Boolean']>;
  attrsFilter?: Maybe<Array<Maybe<AttributeParams>>>;
  page?: Maybe<Scalars['Int']>;
  pageSize?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<Scalars['String']>;
};

export type QueryWorkflowInstanceArgs = {
  idWorkflowInstance: Scalars['ID'];
};

export type QueryWorkflowInstanceTelemetryArgs = {
  idWorkflowInstance: Scalars['ID'];
  report: Scalars['String'];
};

export type QueryWorkflowInstanceRawCsvUrlDataArgs = {
  idWorkflowInstance: Scalars['ID'];
  filename: Scalars['String'];
};

export type QueryAllWorkflowsArgs = {
  isActive?: Maybe<Scalars['Int']>;
  region?: Maybe<Scalars['String']>;
  attrsFilter?: Maybe<AttributeParams>;
  attrFilters?: Maybe<Array<Maybe<AttributeParams>>>;
  search?: Maybe<Scalars['String']>;
  searchField?: Maybe<WorkflowSearchField>;
  page?: Maybe<Scalars['Int']>;
  pageSize?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<Scalars['String']>;
};

export type QueryAllDatasetsArgs = {
  onlyReferences?: Maybe<Scalars['Boolean']>;
  page?: Maybe<Scalars['Int']>;
  pageSize?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<Scalars['String']>;
};

export type QueryWorkflowArgs = {
  idWorkflow: Scalars['ID'];
};

export type QueryAllApiKeysArgs = {
  isActive?: Maybe<Scalars['Boolean']>;
};

export type QueryAccountArgs = {
  idAccount: Scalars['ID'];
};

export type RegionType = {
  __typename?: 'RegionType';
  idRegion: Scalars['ID'];
  provider?: Maybe<Scalars['String']>;
  name: Scalars['String'];
  description: Scalars['String'];
  workflowimageSet: Array<WorkflowImageType>;
  userfavouriteworkflowSet: Array<UserFavouriteWorkflowType>;
};

export type RegisterTokenMutation = {
  __typename?: 'RegisterTokenMutation';
  apikey?: Maybe<Scalars['String']>;
  apisecret?: Maybe<Scalars['String']>;
  description?: Maybe<Scalars['String']>;
};

export type ReportType = {
  __typename?: 'ReportType';
  idReport: Scalars['ID'];
  name: Scalars['String'];
  idOwner: Scalars['Float'];
  url: Scalars['String'];
  revision: Scalars['String'];
  created?: Maybe<Scalars['DateTime']>;
  lastModified: Scalars['DateTime'];
  workflowSet: Array<WorkflowType>;
};

export type RestrictedUserObjectType = {
  __typename?: 'RestrictedUserObjectType';
  created: Scalars['DateTime'];
  lastModified: Scalars['DateTime'];
  idUser: Scalars['ID'];
  username: Scalars['String'];
  realname: Scalars['String'];
  isActive: Scalars['Int'];
  idRegionPreferred: Scalars['Int'];
  apiaccessSet: Array<LimitedApiAccessObjectType>;
};

export type ServiceStatusType = {
  __typename?: 'ServiceStatusType';
  serviceVersion?: Maybe<Scalars['String']>;
  dbVersion?: Maybe<Scalars['String']>;
  minimumAgent?: Maybe<Scalars['String']>;
  remoteAddr?: Maybe<Scalars['String']>;
  serverTime?: Maybe<Scalars['DateTime']>;
};

export type SetWorkflowInstanceIsArchivedMutation = {
  __typename?: 'SetWorkflowInstanceIsArchivedMutation';
  workflowInstance?: Maybe<WorkflowInstanceType>;
};

export type StatusType = {
  __typename?: 'StatusType';
  minimumAgent?: Maybe<Scalars['String']>;
  dbVersion?: Maybe<Scalars['String']>;
  portalVersion?: Maybe<Scalars['String']>;
  remoteAddr?: Maybe<Scalars['String']>;
  serverTime?: Maybe<Scalars['DateTime']>;
};

export type StopWorkflowInstanceMutation = {
  __typename?: 'StopWorkflowInstanceMutation';
  success?: Maybe<Scalars['Boolean']>;
  message?: Maybe<Scalars['String']>;
};

export type TagDataCreateInputType = {
  idAttribute?: Maybe<Scalars['ID']>;
  attributeName?: Maybe<Scalars['String']>;
  value: Scalars['String'];
};

export type TagDataEditInputType = {
  idAttributeValue: Scalars['ID'];
  value: Scalars['String'];
};

export type TagDataOutputType = {
  __typename?: 'TagDataOutputType';
  idAttributeValue: Scalars['ID'];
  value: Scalars['String'];
};

export type TagDataType = {
  __typename?: 'TagDataType';
  idAttributeValue: Scalars['ID'];
  value?: Maybe<Scalars['String']>;
};

export type UpdateAccountSharedMutation = {
  __typename?: 'UpdateAccountSharedMutation';
  account?: Maybe<AccountObjectType>;
};

export type UpdateUserFavouriteWorkflowMutation = {
  __typename?: 'UpdateUserFavouriteWorkflowMutation';
  wasChanged?: Maybe<Scalars['Boolean']>;
  idRegion?: Maybe<Scalars['ID']>;
  idUser?: Maybe<Scalars['ID']>;
  idWorkflow?: Maybe<Scalars['ID']>;
};

export type UpdateUserMutation = {
  __typename?: 'UpdateUserMutation';
  idRegionPreferred?: Maybe<Scalars['ID']>;
  user?: Maybe<UserObjectType>;
};

export type UserAccountObjectType = {
  __typename?: 'UserAccountObjectType';
  created: Scalars['DateTime'];
  lastModified: Scalars['DateTime'];
  idUserAccount: Scalars['ID'];
  user: RestrictedUserObjectType;
  account: AccountObjectType;
  role: UserAccountRole;
  agreementNumber?: Maybe<Scalars['String']>;
  isActive: Scalars['Int'];
};

export enum UserAccountRole {
  L = 'L',
  P = 'P',
}

export type UserFavouriteWorkflowType = {
  __typename?: 'UserFavouriteWorkflowType';
  idUserFavouriteWorkflow: Scalars['ID'];
  idUser: Scalars['Float'];
  workflow: WorkflowType;
  region: RegionType;
  created: Scalars['DateTime'];
  lastModified: Scalars['DateTime'];
};

export type UserObjectType = {
  __typename?: 'UserObjectType';
  created: Scalars['DateTime'];
  lastModified: Scalars['DateTime'];
  idUser: Scalars['ID'];
  username: Scalars['String'];
  realname: Scalars['String'];
  isActive: Scalars['Int'];
  idRegionPreferred: Scalars['Int'];
  useraccountSet: Array<UserAccountObjectType>;
  apiaccessSet: Array<LimitedApiAccessObjectType>;
};

export type ValidationErrorListType = {
  __typename?: 'ValidationErrorListType';
  input?: Maybe<Scalars['GenericScalar']>;
  errors?: Maybe<Array<Maybe<ErrorType>>>;
};

export type WorkflowCsvFilenameType = {
  __typename?: 'WorkflowCSVFilenameType';
  idWorkflow?: Maybe<Scalars['ID']>;
  filename?: Maybe<Scalars['String']>;
};

export type WorkflowCsvPresignedUrlsType = {
  __typename?: 'WorkflowCSVPresignedUrlsType';
  getUrl?: Maybe<Scalars['String']>;
  headUrl?: Maybe<Scalars['String']>;
  expiresIn?: Maybe<Scalars['Int']>;
};

export type WorkflowImageType = {
  __typename?: 'WorkflowImageType';
  idWorkflowImage: Scalars['ID'];
  region: RegionType;
  workflow: WorkflowType;
  inputqueue?: Maybe<Scalars['String']>;
  userdataCommand?: Maybe<Scalars['String']>;
  userdateScript?: Maybe<Scalars['String']>;
  dockerImage?: Maybe<Scalars['String']>;
  workflowinstanceSet: Array<WorkflowInstanceType>;
};

export type WorkflowInstanceMutation = {
  __typename?: 'WorkflowInstanceMutation';
  bucket?: Maybe<Scalars['String']>;
  idUser?: Maybe<Scalars['Int']>;
  instance?: Maybe<WorkflowInstanceType>;
  remoteAddr?: Maybe<Scalars['String']>;
};

export enum WorkflowInstanceSearchField {
  InstanceId = 'INSTANCE_ID',
  WorkflowId = 'WORKFLOW_ID',
  WorkflowName = 'WORKFLOW_NAME',
  WorkflowRev = 'WORKFLOW_REV',
  RunId = 'RUN_ID',
  Attribute = 'ATTRIBUTE',
}

export type WorkflowInstanceTelemetry = {
  __typename?: 'WorkflowInstanceTelemetry';
  getUrl?: Maybe<Scalars['String']>;
  headUrl?: Maybe<Scalars['String']>;
  expiresIn?: Maybe<Scalars['Int']>;
};

export type WorkflowInstanceType = {
  __typename?: 'WorkflowInstanceType';
  idWorkflowInstance: Scalars['ID'];
  idUser: Scalars['Float'];
  startDate: Scalars['DateTime'];
  stopDate?: Maybe<Scalars['DateTime']>;
  workflowImage: WorkflowImageType;
  outputqueue?: Maybe<Scalars['String']>;
  chain?: Maybe<Scalars['GenericScalar']>;
  isConsentedHuman?: Maybe<Scalars['Int']>;
  lastModified?: Maybe<Scalars['DateTime']>;
  isArchived?: Maybe<Scalars['Boolean']>;
  attributes: Array<AttributeValueType>;
  dataset: Array<DatasetType>;
  telemetry?: Maybe<Scalars['GenericScalar']>;
  mappedTelemetry?: Maybe<Scalars['GenericScalar']>;
  telemetryNames?: Maybe<Scalars['GenericScalar']>;
  mappedRawCsvFilenames?: Maybe<Array<Maybe<WorkflowCsvFilenameType>>>;
  keyId?: Maybe<Scalars['String']>;
  state?: Maybe<Scalars['String']>;
};

export type WorkflowProductType = {
  __typename?: 'WorkflowProductType';
  idWorkflowProduct: Scalars['ID'];
  product: ProductType;
  workflow: WorkflowType;
  exampleUrl: Scalars['String'];
  created: Scalars['DateTime'];
  lastModified: Scalars['DateTime'];
};

export type WorkflowRelationshipType = {
  __typename?: 'WorkflowRelationshipType';
  idWorkflowTree: Scalars['ID'];
  workflow: WorkflowType;
  workflowParent: WorkflowType;
};

export enum WorkflowSearchField {
  WorkflowId = 'WORKFLOW_ID',
  WorkflowName = 'WORKFLOW_NAME',
  WorkflowRev = 'WORKFLOW_REV',
  Attribute = 'ATTRIBUTE',
}

export type WorkflowType = {
  __typename?: 'WorkflowType';
  idWorkflow: Scalars['ID'];
  idUserOwner: Scalars['Float'];
  description: Scalars['String'];
  rev: Scalars['String'];
  isActive: Scalars['Int'];
  chain?: Maybe<Scalars['GenericScalar']>;
  config?: Maybe<Scalars['GenericScalar']>;
  dataFields?: Maybe<Scalars['String']>;
  created?: Maybe<Scalars['DateTime']>;
  lastModified?: Maybe<Scalars['DateTime']>;
  name?: Maybe<Scalars['String']>;
  summary?: Maybe<Scalars['String']>;
  doc?: Maybe<Scalars['String']>;
  docs?: Maybe<Scalars['GenericScalar']>;
  aggregationConfig?: Maybe<Scalars['GenericScalar']>;
  reports: Array<ReportType>;
  attributes: Array<AttributeValueType>;
  workflowImages: Array<WorkflowImageType>;
  workflowRelationshipParent: Array<WorkflowRelationshipType>;
  workflowRelationshipChildren: Array<WorkflowRelationshipType>;
  productSet: Array<ProductType>;
  workflowproduct?: Maybe<WorkflowProductType>;
  isNested?: Maybe<Scalars['Boolean']>;
  params?: Maybe<Scalars['GenericScalar']>;
  mappedAttributes?: Maybe<Scalars['GenericScalar']>;
  isUserFavourite?: Maybe<Scalars['Boolean']>;
  documentation?: Maybe<Array<Maybe<DocumentationType>>>;
  documentationUrl?: Maybe<Scalars['String']>;
};
