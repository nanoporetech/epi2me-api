import { isFunction, isBoolean, isString, isNumber, isArray, isObject } from 'lodash';
import { ObjectDict } from './ObjectDict';

export function isRecord(obj: unknown): obj is ObjectDict {
  return typeof obj === "object" && Array.isArray(obj) === false;
}

export { isFunction, isBoolean, isString, isNumber, isArray };

/*
  All of these helpers are made to _validate_ the types of an unknown
  value. As such they DO NOT convert the type, only ensure it is correct.

  // Incorrect usage
  let a: unknown = "12";
  let b: number = asNumber(a); // throws "Unable to cast unknown object to Number"

  // Correct usage
  let c: unknown = 12;
  let d: number = asNumber(c);

  The standard helpers all take an optional fallback value, which is used if the
  unknown object is of an undefined type.

  Additionally there are variant functions which will return an optional value
  depending on if the unknown value is defined or not.
*/

export function asString(obj: unknown, fallback?: string): string {
  if (isString(obj)) {
    return obj;
  }
  if (typeof obj === "undefined" && typeof fallback !== "undefined") {
    return fallback;
  }
  throw new Error("Unable to cast unknown object to String");
}

export function asNumber(obj: unknown, fallback?: number): number {
  if (isNumber(obj)) {
    return obj as number;
  }
  if (typeof obj === "undefined" && typeof fallback !== "undefined") {
    return fallback;
  }
  throw new Error("Unable to cast unknown object to Number");
}

type Index = number | string;

export function asIndex(obj: unknown, fallback?: Index): Index {
  if (isNumber(obj) || isString(obj)) {
    return obj as Index;
  }
  if (typeof obj === "undefined" && typeof fallback !== "undefined") {
    return fallback;
  }
  throw new Error("Unable to cast unknown object to Index");
}

export function asIndexable(obj: unknown, fallback?: Record<Index, unknown>): Record<Index, unknown> {
  if (isObject(obj)) {
    return obj as Record<Index, unknown>;
  }
  if (typeof obj === "undefined" && typeof fallback !== "undefined") {
    return fallback;
  }
  throw new Error("Unable to cast unknown object to Indexable");
}

export function asBoolean(obj: unknown, fallback?: boolean): boolean {
  if (isBoolean(obj)) {
    return obj;
  }
  if (typeof obj === "undefined" && typeof fallback !== "undefined") {
    return fallback;
  }
  throw new Error("Unable to cast unknown object to Boolean");
}

export function asArray(obj: unknown, fallback?: unknown[]): unknown[] {
  if (isArray(obj)) {
    return obj as unknown[];
  }
  if (typeof obj === "undefined" && typeof fallback !== "undefined") {
    return fallback;
  }
  throw new Error("Unable to cast unknown object to Array");
}

export function asRecord(obj: unknown, fallback?: ObjectDict): ObjectDict {
  if (isRecord(obj)) {
    return obj;
  }
  if (typeof obj === "undefined" && typeof fallback !== "undefined") {
    return fallback;
  }
  throw new Error("Unable to cast unknown object to Record");
}

export function asFunction(obj: unknown, fallback?: Function): Function {
  if (isFunction(obj)) {
    return obj;
  }
  if (typeof obj === "undefined" && typeof fallback !== "undefined") {
    return fallback;
  }
  throw new Error("Unable to cast unknown object to Function");
}

export function asArrayRecursive<T>(obj: unknown, visitor: (obj: unknown) => T, fallback?: T[]): T[] {
  if (typeof obj === "undefined" && typeof fallback !== "undefined") {
    return fallback;
  }
  if (isArray(obj)) {
    return obj.map(visitor);
  }
  throw new Error("Unable to cast unknown object to Array");
}

export function asRecordRecursive<T>(obj: unknown, visitor: (obj: unknown) => T, fallback?: ObjectDict<T>): ObjectDict<T> {
  if (typeof obj === "undefined" && typeof fallback !== "undefined") {
    return fallback;
  }
  if (typeof obj === "object" && Array.isArray(obj) === false) {
    const source = asRecord(obj);
    const record: ObjectDict<T> = {};
    for (const key in obj) {
      record[key] = visitor(source[key]);
    }
    return record;
  }
  throw new Error("Unable to cast unknown object to Record");
}

export function asOptString(obj: unknown): string | undefined {
  if (typeof obj === "undefined") {
    return obj;
  }
  return asString(obj);
}

export function asOptNumber(obj: unknown): number | undefined {
  if (typeof obj === "undefined") {
    return obj;
  }
  return asNumber(obj);
}

export function asOptBoolean(obj: unknown): boolean | undefined {
  if (typeof obj === "undefined") {
    return obj;
  }
  return asBoolean(obj);
}

export function asOptArray(obj: unknown): unknown[] | undefined {
  if (typeof obj === "undefined") {
    return obj;
  }
  return asArray(obj);
}

export function asOptRecord(obj: unknown): ObjectDict | undefined {
  if (typeof obj === "undefined") {
    return obj;
  }
  return asRecord(obj);
}

export function asOptFunction(obj: unknown): Function | undefined {
  if (typeof obj === "undefined") {
    return obj;
  }
  return asFunction(obj);
}

export function asOptArrayRecursive<T>(obj: unknown, visitor: (obj: unknown) => T): T[] | undefined {
  if (typeof obj === "undefined") {
    return obj;
  }
  return asArrayRecursive(obj, visitor);
}

export function asOptRecordRecursive<T>(obj: unknown, visitor: (obj: unknown) => T): ObjectDict<T> | undefined {
  if (typeof obj === "undefined") {
    return obj;
  }
  return asRecordRecursive(obj, visitor);
}