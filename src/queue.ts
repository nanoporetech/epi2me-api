import type { Subject } from 'rxjs';
import type { Optional } from 'ts-runtime-typecheck';

export function createQueue<T>(
  concurrency: number,
  signal$: Subject<void>,
  fn: (value: T) => Promise<void>,
): (value: T) => void {
  const waiting: Array<T> = [];
  let available = concurrency;
  let stopped = false;

  signal$.subscribe(() => {
    stopped = true;
    waiting.length = 0;
  });

  const runThread = async () => {
    available -= 1;
    let next: Optional<T>;
    while ((next = waiting.shift())) {
      try {
        await fn(next);
      } catch {}
      if (stopped) {
        break;
      }
    }
    available += 1;
  };

  return (value: T) => {
    if (!stopped) {
      waiting.push(value);
      if (available > 0) {
        runThread();
      }
    }
  };
}
