export type Listener = (target: any, data: any) => void;

/** Same calling convention as @lightningjs/renderer: listeners get (emitter, data). */
export class EventEmitter {
  public eventListeners: Record<string, Listener[]> = {};

  public on(event: string, listener: Listener): void {
    (this.eventListeners[event] ??= []).push(listener);
  }

  public off(event: string, listener?: Listener): void {
    const list = this.eventListeners[event];

    if (!list) {
      return;
    }

    if (!listener) {
      delete this.eventListeners[event];

      return;
    }

    let idx = list.indexOf(listener);

    if (idx < 0) {
      idx = list.findIndex((l) => (l as { orig?: Listener }).orig === listener);
    }

    if (idx >= 0) {
      list.splice(idx, 1);
    }

    if (list.length === 0) {
      delete this.eventListeners[event];
    }
  }

  public once(event: string, listener: Listener): void {
    const wrapper: Listener = (target, data) => {
      this.off(event, wrapper);
      listener(target, data);
    };

    (wrapper as { orig?: Listener }).orig = listener;
    this.on(event, wrapper);
  }

  public emit(event: string, data?: unknown): void {
    const list = this.eventListeners[event];

    if (!list || list.length === 0) {
      return;
    }

    const copy = list.length === 1 ? list : list.slice();

    for (let i = 0; i < copy.length; i++) {
      copy[i](this, data);
    }
  }

  public hasListeners(event: string): boolean {
    return (this.eventListeners[event]?.length ?? 0) > 0;
  }

  public removeAllListeners(): void {
    this.eventListeners = {};
  }
}
