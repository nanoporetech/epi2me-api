import type { Duration } from './Duration';

export interface Timer {
  cancel(): void;
  reset(duration?: Duration): void;
}
