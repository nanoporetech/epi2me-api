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
import type { ApolloQueryResult } from '@apollo/client/core';
import type { Dictionary } from 'ts-runtime-typecheck';

export * from './generated/graphql.type';

export interface ResponseAllWorkflows {
  allWorkflows: PaginatedWorkflowType;
}

export interface ResponseWorkflow {
  workflow: WorkflowType;
}

export interface ResponseAllWorkflowInstances {
  allWorkflowInstances: PaginatedWorkflowInstanceType;
}

export interface ResponseWorkflowInstance {
  workflowInstance: WorkflowInstanceType;
}

export interface ResponseStartWorkflow {
  startData: WorkflowInstanceMutation;
}

export interface ResponseStopWorkflowInstance {
  stopData: StopWorkflowInstanceMutation;
}

export interface ResponseGetInstanceToken {
  token: InstanceTokenMutation;
}

export interface ResponseUser {
  me: UserObjectType;
}

export interface ResponseUpdateUser {
  updateUser: UpdateUserMutation;
}

export interface ResponseRegisterToken {
  registerToken: RegisterTokenMutation;
}

export interface ResponseStatus {
  status: StatusType;
}

export interface ResponseRegions {
  regions: RegionType[];
}

export interface GraphQLConfiguration {
  url: string;
  base_url: string;
  apikey?: string;
  apisecret?: string;
  agent_version: string;
  jwt?: string;
  local: boolean;
  signing: boolean;
}

export interface RequestContext {
  apikey?: string;
  apisecret?: string;
  url: string;
  [key: string]: unknown;
}

export interface QueryOptions<Var = Dictionary, Ctx = Dictionary, Opt = Dictionary> {
  context?: Ctx;
  variables?: Var;
  options?: Opt;
}

export type AsyncAQR<T = unknown> = Promise<ApolloQueryResult<T>>;
