import type {
  PaginatedWorkflowType,
  PaginatedWorkflowInstanceType,
  WorkflowInstanceType,
  WorkflowInstanceMutation,
  StopWorkflowInstanceMutation,
  InstanceTokenMutation,
  UserObjectType,
  UpdateUserMutation,
  RegisterTokenMutation,
  RegionType,
  WorkflowType,
  StatusType,
} from './generated/graphql.type';

export * from './generated/graphql.type';

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
