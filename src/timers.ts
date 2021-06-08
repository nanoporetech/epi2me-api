import type { Timer } from './timer.type';
/*
NOTE this partially exists because TS is having a really hard time to decide
which version the timer functions we are using (the return type of Node.js
timers is an object not a number) and in some cases appears to be using
both in one file, preventing compilation.
*/
export function createInterval(duration: number, cb: VoidFunction): Timer {
  let id = setInterval(cb, duration);

  return {
    cancel() {
      clearInterval(id);
    },
    reset(newDuration = duration) {
      clearInterval(id);
      id = setInterval(cb, newDuration);
    },
  };
}

export function createTimeout(duration: number, cb: VoidFunction): Timer {
  let id = setTimeout(cb, duration);

  return {
    cancel() {
      clearTimeout(id);
    },
    reset(newDuration = duration) {
      clearTimeout(id);
      id = setTimeout(cb, newDuration);
    },
  };
}

export function sleep(duration: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, duration);
  });
}
