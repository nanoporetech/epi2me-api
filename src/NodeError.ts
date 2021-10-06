import { asStruct, isOptString, isString, isStruct, Optional } from 'ts-runtime-typecheck';
import type { Logger } from './Logger.type';

export interface NodeError {
  message: string;
  stack?: Optional<string>;
  code?: Optional<string>;
}

export class NestedError extends Error {
  readonly parent: NodeError;
  constructor(msg: string, err: unknown) {
    super(NestedError.formatMessage(msg, err));
    this.parent = err instanceof Error ? err : new Error(`${err}`);
  }
  static formatMessage(msg: string, err: unknown): string {
    const parentMessage = err instanceof Error ? err.message : `${err}`;
    return `${msg}\n\t${parentMessage}`;
  }
}

const nodeErrorTypePattern = {
  code: isOptString,
  message: isString,
  stack: isOptString,
};

export const isNodeError = isStruct(nodeErrorTypePattern);
export const asNodeError = asStruct(nodeErrorTypePattern);

const nestedErrorTypePattern = {
  message: isString,
  stack: isOptString,
  parent: isNodeError,
};

export const isNestedError = isStruct(nestedErrorTypePattern);
export const asNestedError = asStruct(nestedErrorTypePattern);

export function getErrorMessage(error: unknown): string {
  // do the best we can...
  if (isNodeError(error)) {
    // NodeError is just an optional extension of Error, hence it's compatible with Error
    return error.message;
  }
  return `${error}`; // ... and fall back on dumb string conversion
}

export function wrapAndLogError(msg: string, err: unknown, log: Logger): NestedError {
  const wrappedError = new NestedError(msg, isNodeError(err) ? err : new Error(`${err}`));
  log.error(wrappedError.message);
  return wrappedError;
}
