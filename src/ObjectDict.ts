/*
  This is a safer way of creating arbitrary option objects in TS
  It's similar to `{ [key: string]: unknown }`
  in that it allows an object to have any number of unnamed fields
  keyed with a string, but ensures they have a type of unknown
  so we don't end up with accidental "any" values
*/
export type ObjectDict<T = unknown> = Record<string, T | undefined>;
