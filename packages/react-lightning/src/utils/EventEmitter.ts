export class EventEmitter<
  // biome-ignore lint/suspicious/noExplicitAny: TODO
  T extends Record<keyof T, (...args: any) => any>,
> {
  private _eventListeners: Partial<Record<keyof T, Set<T[keyof T]>>> = {};
  private _debug = false;

  public constructor(debug = false) {
    this._debug = debug;
  }

  public on<K extends keyof T>(name: K, listener: T[K]): () => void {
    if (!listener) {
      console.warn('[EventEmitter] Invalid argument specified as a listener');
      return () => {
        /* no-op */
      };
    }

    let currentListeners = this._eventListeners[name];

    if (!currentListeners) {
      currentListeners = new Set();

      this._eventListeners[name] = currentListeners;
    }

    currentListeners.add(listener);

    return () => this.off(name, listener);
  }

  public off<K extends keyof T>(name: K, listener: T[K]): void {
    const current = this._eventListeners[name];

    if (current) {
      current.delete(listener);
    }
  }

  public has<K extends keyof T>(name: K, listener: T[K]): boolean {
    return this._eventListeners[name]?.has(listener) ?? false;
  }

  public removeListeners<K extends keyof T>(name: K): void {
    delete this._eventListeners[name];
  }

  public removeAllListeners<K extends keyof T>(): void {
    for (const name of Object.keys(this._eventListeners)) {
      this.removeListeners(name as K);
    }

    this._eventListeners = {};
  }

  public emit<K extends keyof T>(name: K, ...args: Parameters<T[K]>): void {
    if (this._debug) {
      console.groupCollapsed(`[Event] ${String(name)}`);
      console.log('%c ARGS:', 'font-weight: bold', args);
      console.groupCollapsed('Trace:');
      console.trace();
      console.groupEnd();
      console.groupEnd();
    }

    const listeners = this._eventListeners[name];

    if (listeners) {
      for (const listener of listeners) {
        listener.apply(this, args);
      }
    }
  }

  public async asyncEmit<K extends keyof T>(
    name: K,
    ...args: Parameters<T[K]>
  ): Promise<void> {
    const listeners = this._eventListeners[name];
    const promises: Promise<void>[] = [];

    if (listeners) {
      for (const listener of listeners) {
        promises.push(listener.apply(this, args));
      }

      await Promise.all(promises);
    }
  }
}
