import { Observable } from 'rxjs';
import { Dictionary, isDefined } from 'ts-runtime-typecheck';

import type { OperatorFunction } from 'rxjs';
import type { Optional } from 'ts-runtime-typecheck';

// PLEASE TEST ME

/*
  filterDefined
    removes any nullish values from the stream

  const source = new Subject
  source.pipe(filterDefined).subscribe(console.log)  

  source.next(12);
  // 12
  source.next();
  source.next(null);
  source.next('hello');
  // 'hello'
  source.next(undefined);
  source.next(false);
  // false
*/
export function filterDefined<T>(): OperatorFunction<Optional<T>, T> {
  return (source$: Observable<Optional<T>>): Observable<T> => {
    return new Observable((subscriber) => {
      source$.subscribe({
        next(value) {
          if (isDefined(value)) {
            subscriber.next(value);
          }
        },
        complete: subscriber.complete.bind(subscriber),
        error: subscriber.error.bind(subscriber),
      });
    });
  };
}

/*
  recordDelta
    compares the record with the previous record. only key values that have changed are emitted

  const source = new Subject
  source.pipe(recordDelta).subscribe(console.log)  

  source.next({ a: 1, b: 'hello', c: false });
  // { a: 1, b: 'hello', c: false }
  source.next({ a: 2, b: 'hello', c: false });
  // { a: 2 }
  source.next({ a: 2, b: 'world', c: true });
  // { b: 'world', c: true }

*/
export function recordDelta<V>(): OperatorFunction<Dictionary<V>, Dictionary<V>> {
  return (source$: Observable<Dictionary<V>>): Observable<Dictionary<V>> => {
    let previous: Dictionary<V> = {};
    return new Observable((subscriber) => {
      source$.subscribe({
        next(record) {
          const output: Dictionary<V> = {};
          for (const [key, value] of Object.entries(record)) {
            if (previous[key] !== value) {
              output[key] = value;
            }
          }
          previous = record;
          subscriber.next(output);
        },
        complete: subscriber.complete.bind(subscriber),
        error: subscriber.error.bind(subscriber),
      });
    });
  };
}
