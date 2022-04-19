import type { SinonStub } from 'sinon';
import { invariant } from 'ts-runtime-typecheck';

export function isSinonStub<P extends unknown[], R>(fn: (...args: P) => R): fn is SinonStub<P, R> {
  // WARN does not work for sinon spies or fakes, only stubs
  return typeof fn === 'function' && ('restore' in fn || fn.name === 'functionStub');
}

export function asSinonStub<P extends unknown[], R>(fn: (...args: P) => R): SinonStub<P, R> {
  invariant(isSinonStub(fn), `Expected ${fn} to be a SinonStub`);
  return fn;
}
