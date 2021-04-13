import { Subject } from 'rxjs';
import type { Optional } from 'ts-runtime-typecheck';
import type { Observable } from 'rxjs';

export interface Queue<T> {
  add(value: T): void;
  empty$: Observable<void>;
}

export function createQueue<T>(
  { concurrency = 1, signal$ }: { concurrency?: number; signal$?: Subject<void> },
  fn: (value: T) => Promise<void>,
): Queue<T> {
  const waiting: Array<T> = [];
  const empty$ = new Subject<void>();
  let available = concurrency;
  let stopped = false;

  signal$?.subscribe(() => {
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
    if (available === concurrency) {
      empty$.next();
      // either stopped or queue is empty
    }
  };

  return {
    add: (value: T) => {
      if (!stopped) {
        waiting.push(value);
        if (available > 0) {
          runThread();
        }
      }
    },
    empty$,
  };
}
