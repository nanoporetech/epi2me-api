export interface Timer {
  cancel(): void;
  reset(duration?: number): void;
}
