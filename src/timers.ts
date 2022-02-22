import type { Duration } from './Duration';
import type { Timer } from './timer.type';
/*
NOTE this partially exists because TS is having a really hard time to decide
which version the timer functions we are using (the return type of Node.js
timers is an object not a number) and in some cases appears to be using
both in one file, preventing compilation.
*/
export function createInterval(duration: Duration, cb: VoidFunction): Timer {
  let id = setInterval(cb, duration.milliseconds);

  return {
    cancel() {
      clearInterval(id);
    },
    reset(newDuration = duration) {
      clearInterval(id);
      id = setInterval(cb, newDuration.milliseconds);
    },
  };
}

export function createTimeout(duration: Duration, cb: VoidFunction): Timer {
  let id = setTimeout(cb, duration.milliseconds);

  return {
    cancel() {
      clearTimeout(id);
    },
    reset(newDuration = duration) {
      clearTimeout(id);
      id = setTimeout(cb, newDuration.milliseconds);
    },
  };
}

export function sleep(duration: Duration): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, duration.milliseconds);
  });
}
