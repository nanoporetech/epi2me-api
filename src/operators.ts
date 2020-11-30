import { Observable } from 'rxjs';
import { Dictionary, isDefined } from 'ts-runtime-typecheck';

import type { OperatorFunction } from 'rxjs';
import type { Optional } from 'ts-runtime-typecheck';

export function filterDefined<T>(): OperatorFunction<Optional<T>, T> {
  return (source$: Observable<Optional<T>>): Observable<T> => {
    return new Observable(({ next, complete, error }) => {
      source$.subscribe({
        next(value) {
          if (isDefined(value)) {
            next(value);
          }
        },
        complete,
        error,
      });
    });
  };
}

// PLEASE TEST ME
export function recordDelta<V>(): OperatorFunction<Dictionary<V>, Dictionary<V>> {
  return (source$: Observable<Dictionary<V>>): Observable<Dictionary<V>> => {
    let previous: Dictionary<V> = {};
    return new Observable(({ next, complete, error }) => {
      source$.subscribe({
        next(record) {
          const output: Dictionary<V> = {};
          for (const [key, value] of Object.entries(record)) {
            if (previous[key] !== value) {
              output[key] = value;
            }
          }
          previous = record;
          next(output);
        },
        complete,
        error,
      });
    });
  };
}
