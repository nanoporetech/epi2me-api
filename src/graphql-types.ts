export type Maybe<T> = T | null;
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
  isShared: Scalars['Int'];
  useraccountSet: Array<UserAccountObjectType>;
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
  workflowSet: Array<WorkflowType>;
  workflowinstanceSet: Array<WorkflowInstanceType>;
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
  workflowinstanceSet: Array<WorkflowInstanceType>;
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

export type Mutation = {
  __typename?: 'Mutation';
  startWorkflowInstance?: Maybe<WorkflowInstanceMutation>;
  stopWorkflowInstance?: Maybe<StopWorkflowInstanceMutation>;
  getInstanceToken?: Maybe<InstanceTokenMutation>;
  registerToken?: Maybe<RegisterTokenMutation>;
  updateUser?: Maybe<UpdateUserMutation>;
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

export type MutationGetInstanceTokenArgs = {
  idWorkflowInstance: Scalars['ID'];
  readOnly?: Maybe<Scalars['Boolean']>;
};

export type MutationRegisterTokenArgs = {
  code: Scalars['String'];
  description?: Maybe<Scalars['String']>;
};

export type MutationUpdateUserArgs = {
  idRegionPreferred: Scalars['ID'];
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

export type Query = {
  __typename?: 'Query';
  allWorkflowInstances?: Maybe<PaginatedWorkflowInstanceType>;
  workflowInstance?: Maybe<WorkflowInstanceType>;
  allWorkflows?: Maybe<PaginatedWorkflowType>;
  allDatasets?: Maybe<PaginatedDatasetType>;
  workflow?: Maybe<WorkflowType>;
  status?: Maybe<StatusType>;
  regions?: Maybe<Array<Maybe<RegionType>>>;
  allUsers?: Maybe<Array<Maybe<UserObjectType>>>;
  allUserAccounts?: Maybe<Array<Maybe<UserAccountObjectType>>>;
  me?: Maybe<UserObjectType>;
};

export type QueryAllWorkflowInstancesArgs = {
  idUser?: Maybe<Scalars['ID']>;
  shared?: Maybe<Scalars['Boolean']>;
  page?: Maybe<Scalars['Int']>;
  pageSize?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<Scalars['String']>;
};

export type QueryWorkflowInstanceArgs = {
  idWorkflowInstance: Scalars['ID'];
};

export type QueryAllWorkflowsArgs = {
  isActive?: Maybe<Scalars['Int']>;
  attrsFilter?: Maybe<AttributeParams>;
  region?: Maybe<Scalars['String']>;
  page?: Maybe<Scalars['Int']>;
  pageSize?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<Scalars['String']>;
};

export type QueryAllDatasetsArgs = {
  page?: Maybe<Scalars['Int']>;
  pageSize?: Maybe<Scalars['Int']>;
  orderBy?: Maybe<Scalars['String']>;
};

export type QueryWorkflowArgs = {
  idWorkflow: Scalars['ID'];
};

export type RegionType = {
  __typename?: 'RegionType';
  idRegion: Scalars['ID'];
  provider?: Maybe<Scalars['String']>;
  name: Scalars['String'];
  description: Scalars['String'];
  workflowimageSet: Array<WorkflowImageType>;
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

export type UpdateUserMutation = {
  __typename?: 'UpdateUserMutation';
  idRegionPreferred?: Maybe<Scalars['ID']>;
};

export type UserAccountObjectType = {
  __typename?: 'UserAccountObjectType';
  created: Scalars['DateTime'];
  lastModified: Scalars['DateTime'];
  idUserAccount: Scalars['ID'];
  user: UserObjectType;
  account: AccountObjectType;
  role: Scalars['String'];
  agreementNumber?: Maybe<Scalars['String']>;
  isActive: Scalars['Int'];
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
  attributes: Array<AttributeValueType>;
  dataset: Array<DatasetType>;
  telemetry?: Maybe<Scalars['GenericScalar']>;
  mappedTelemetry?: Maybe<Scalars['GenericScalar']>;
  keyId?: Maybe<Scalars['String']>;
  state?: Maybe<Scalars['String']>;
};

export type WorkflowRelationshipType = {
  __typename?: 'WorkflowRelationshipType';
  idWorkflowTree: Scalars['ID'];
  workflow: WorkflowType;
  workflowParent: WorkflowType;
};

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
  aggregationConfig?: Maybe<Scalars['GenericScalar']>;
  reports: Array<ReportType>;
  attributes: Array<AttributeValueType>;
  workflowImages: Array<WorkflowImageType>;
  workflowRelationshipParent: Array<WorkflowRelationshipType>;
  workflowRelationshipChildren: Array<WorkflowRelationshipType>;
  isNested?: Maybe<Scalars['Boolean']>;
  params?: Maybe<Scalars['GenericScalar']>;
  mappedAttributes?: Maybe<Scalars['GenericScalar']>;
};

export type ResponseAllWorkflows = {
  allWorkflows: PaginatedWorkflowType;
};

export type ResponseWorkflow = {
  workflow: WorkflowType;
};

export type ResponseAllWorkflowInstances = {
  allWorkflowInstances: PaginatedWorkflowInstanceType;
};

export type ResponseWorkflowInstance = {
  workflowInstance: WorkflowInstanceType;
};

export type ResponseStartWorkflow = {
  startData: WorkflowInstanceMutation;
};

export type ResponseStopWorkflowInstance = {
  stopData: StopWorkflowInstanceMutation;
};

export type ResponseGetInstanceToken = {
  token: InstanceTokenMutation;
};

export type ResponseUser = {
  me: UserObjectType;
};

export type ResponseUpdateUser = {
  updateUser: UpdateUserMutation;
};

export type ResponseRegisterToken = {
  registerToken: RegisterTokenMutation;
};

export type ResponseStatus = {
  status: StatusType;
};

export type ResponseRegions = {
  regions: RegionType[];
};
