import { UnknownFunction } from 'ts-runtime-typecheck';

/*
NOTE this exists mostly because TS is having a really hard time to decide
which version the timer functions we are using (the return type of Node.js
timers is an object not a number) and in some cases appears to be using
both in one file, preventing compilation.
*/
export type DisposeTimer = () => void;
export function createInterval(duration: number, cb: UnknownFunction): DisposeTimer {
  const id = setInterval(cb, duration);
  return (): void => clearInterval(id);
}

export function createTimeout(duration: number, cb: UnknownFunction): DisposeTimer {
  const id = setTimeout(cb, duration);
  return (): void => clearTimeout(id);
}
