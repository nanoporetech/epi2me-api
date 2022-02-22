import { asDefined } from "ts-runtime-typecheck";

export async function syncify<T>(fn: () => Promise<T>): Promise<() => T> {
  let value: T;
  let error: unknown;
  try {
    value = await fn();
  } catch (err) {
    error = err;
  }
  return () => {
    if (error) {
      throw error;
    }
    return asDefined(value);
  };
}
