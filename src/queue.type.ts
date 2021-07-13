import type { Observable } from 'rxjs';

export interface Queue<T> {
  add(value: T): void;
  empty$: Observable<void>;
}
