import { asStruct, isDefined, isOptString, isString, isStruct, Optional } from 'ts-runtime-typecheck';
import type { Logger } from './Logger.type';

export interface NodeError {
  message: string;
  stack?: Optional<string>;
  code?: Optional<string>;
}

export function panic(txt: string): never;
export function panic(template: TemplateStringsArray, ...values: unknown[]): never;
export function panic(template: string | TemplateStringsArray, ...values: unknown[]): never {
  if (typeof template === 'string') {
    throw new Error(template);
  }
  if (template.length === 1) {
    throw new Error(template[0]);
  }

  const child = values.find((el) => el instanceof Error);
  const parts: string[] = [];

  for (let i = 0; i < values.length; i += 1) {
    parts.push(template[i], values[i] + '');
  }
  parts.push(template[template.length - 1]);

  throw new NestedError(parts.join(''), child);
}

export class NestedError extends Error {
  readonly parent?: string;

  constructor(msg: string);
  constructor(msg: string, parent: Error);
  constructor(msg: string, parent: unknown);
  constructor(msg: string, parent?: unknown) {
    super(msg);
    if (isDefined(parent)) {
      if (parent instanceof Error) {
        const msg =
          parent instanceof NestedError ? parent.stack : `${NestedError.resolveCallstack(this.stack, parent)}\n`;
        this.stack = `${msg}\n  > ${this.message}`;
        this.parent = parent instanceof NestedError ? parent.errorStack : parent.message;
      } else {
        this.stack = `${parent}\n\n  > ${this.message}`;
        this.parent = `${parent}`;
      }
    }
  }

  get errorStack(): string {
    return NestedError.formatMessage(this.message, this.parent);
  }

  private static resolveCallstack(stack: string | undefined, parent: Error) {
    if (!stack || !parent.stack) {
      return `(unknown error)`;
    }

    const callstack = stack.split('\n');
    const parentStack = parent.stack.split('\n');
    const message = parentStack.shift();

    const actualStack = [message];

    // Ignore first 2 as they cannot be common ( error message and construction location )
    for (let i = 2; i < callstack.length; i += 1) {
      for (const frame of parentStack) {
        if (frame === callstack[0]) {
          return actualStack.join('\n');
        }
        // normalize indentation for call frames
        actualStack.push(frame.startsWith('    ') ? frame : `    ${frame}`);
      }
    }

    // WARN no matching stack...
    return parent.stack;
  }

  static formatMessage(msg: string, err?: unknown): string {
    if (err instanceof NestedError) {
      return `${err.errorStack}\n  > ${msg}`;
    }
    if (err instanceof Error) {
      return `${err.message}\n  > ${msg}`;
    }
    if (isDefined(err)) {
      return `${err}\n  > ${msg}`;
    }
    return msg;
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

export async function expectToThrow(fn: () => Promise<unknown>, expected?: string): Promise<void> {
  try {
    await fn();
    return Promise.reject(new Error('Expected to throw'));
  } catch (err) {
    const errMessage = getErrorMessage(err);
    if (isDefined(expected) && !errMessage.includes(expected)) {
      panic`Expected to throw "${expected}" but received "${err}"`;
    }
  }
}

export function wrapAndLogError(msg: string, err: unknown, log: Logger): NestedError {
  const wrappedError = new NestedError(msg, err);
  log.error(wrappedError.message);
  return wrappedError;
}
