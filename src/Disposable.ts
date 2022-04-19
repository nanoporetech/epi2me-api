export type DisposableFunction = () => void | Promise<void>;

export interface Disposable {
  dispose: DisposableFunction;
}

export class DisposableCollection implements Disposable {
  private collection = new Set<Disposable>();

  async dispose(): Promise<void> {
    for (const item of this.collection) {
      await item.dispose();
    }
    this.collection.clear();
  }

  add(...items: Array<DisposableFunction | Disposable>): void {
    for (const dispose of items) {
      this.collection.add(typeof dispose === 'function' ? { dispose } : dispose);
    }
  }
}
