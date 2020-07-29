/*
  This is a safer way of creating arbitrary option objects in TS
  It's similar to `{ [key: string]: unknown }`
  in that it allows an object to have any number of unnamed fields
  keyed with a string, but ensures they have a type of unknown
  so we don't end up with accidental "any" values

  NOTE the T | undefined type is to ensure that if someone accesses
  say a.b they understand that .b might not exist, and hence could
  be undefined. Unfortunately this has the effect when iterating
  over values that the values are (incorrectly) a union type, but
  it's worth the frustration for the additional safety it gives.
*/
export type ObjectDict<T = unknown> = Record<string, T | undefined>;
