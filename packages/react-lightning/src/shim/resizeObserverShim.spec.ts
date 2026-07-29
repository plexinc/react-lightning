import { beforeAll, beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

import type { Rect } from '../types';

// Minimal EventEmitter-backed stand-in so the shim's `instanceof
// LightningViewElement` guard and `on/off/emit('layout')` wiring resolve.
vi.mock('../element/LightningViewElement', () => {
  class LightningViewElement {
    private _handlers = new Map<string, Set<(rect: Rect) => void>>();

    public on(event: string, handler: (rect: Rect) => void): () => void {
      let set = this._handlers.get(event);
      if (!set) {
        this._handlers.set(event, (set = new Set()));
      }
      set.add(handler);
      return () => this.off(event, handler);
    }

    public off(event: string, handler: (rect: Rect) => void): void {
      this._handlers.get(event)?.delete(handler);
    }

    public emit(event: string, rect: Rect): void {
      this._handlers.get(event)?.forEach((handler) => handler(rect));
    }

    public handlerCount(event: string): number {
      return this._handlers.get(event)?.size ?? 0;
    }
  }

  return { LightningViewElement };
});

type LayoutTarget = {
  emit(event: string, rect: Rect): void;
  handlerCount(event: string): number;
};

let LightningViewElementMock: new () => LayoutTarget;
let ResizeObserverShim: typeof window.ResizeObserver;

beforeAll(async () => {
  class ResizeObserverBase {
    public constructor(_callback: ResizeObserverCallback) {}
    public observe(): void {}
    public unobserve(): void {}
    public disconnect(): void {}
  }

  class DOMRectReadOnlyStub {
    public constructor(
      public x: number,
      public y: number,
      public width: number,
      public height: number,
    ) {}
  }

  vi.stubGlobal('window', { ResizeObserver: ResizeObserverBase });
  vi.stubGlobal('ResizeObserver', ResizeObserverBase);
  vi.stubGlobal('DOMRectReadOnly', DOMRectReadOnlyStub);

  await import('./resizeObserverShim');
  ResizeObserverShim = window.ResizeObserver;

  ({ LightningViewElement: LightningViewElementMock } = (await import(
    '../element/LightningViewElement'
  )) as unknown as { LightningViewElement: new () => LayoutTarget });
});

function makeTarget(): LayoutTarget {
  return new LightningViewElementMock();
}

describe('LightningResizeObserver', () => {
  let callback: Mock<ResizeObserverCallback>;
  let observer: ResizeObserver;

  beforeEach(() => {
    callback = vi.fn<ResizeObserverCallback>();
    observer = new ResizeObserverShim(callback);
  });

  function entriesFor(call: number): ResizeObserverEntry[] {
    const args = callback.mock.calls[call];
    if (!args) {
      throw new Error(`callback was not invoked ${call + 1} time(s)`);
    }
    return args[0];
  }

  function soleEntry(entries: ResizeObserverEntry[]): ResizeObserverEntry {
    const [entry] = entries;
    if (!entry) {
      throw new Error('expected at least one entry');
    }
    return entry;
  }

  it('delivers only the changed target, with its own rect', () => {
    const a = makeTarget();
    const b = makeTarget();
    const c = makeTarget();

    observer.observe(a as unknown as Element);
    observer.observe(b as unknown as Element);
    observer.observe(c as unknown as Element);

    b.emit('layout', { x: 1, y: 2, w: 3, h: 4 });

    expect(callback).toHaveBeenCalledTimes(1);
    const entries = entriesFor(0);
    expect(entries).toHaveLength(1);
    expect(entries.some((e) => e.target === (a as unknown as Element))).toBe(false);
    const entry = soleEntry(entries);
    expect(entry.target).toBe(b);
    expect(entry.contentRect).toMatchObject({ x: 1, y: 2, width: 3, height: 4 });
    expect(entry.borderBoxSize[0]).toMatchObject({ inlineSize: 3, blockSize: 4 });
    expect(entry.contentBoxSize[0]).toMatchObject({ inlineSize: 3, blockSize: 4 });
  });

  it('reports each target with its own rect, not a stale firing target rect', () => {
    const a = makeTarget();
    const b = makeTarget();

    observer.observe(a as unknown as Element);
    observer.observe(b as unknown as Element);

    a.emit('layout', { x: 10, y: 20, w: 100, h: 200 });
    b.emit('layout', { x: 5, y: 6, w: 7, h: 8 });

    const first = soleEntry(entriesFor(0));
    const second = soleEntry(entriesFor(1));

    expect(first.target).toBe(a);
    expect(first.contentRect).toMatchObject({ x: 10, y: 20, width: 100, height: 200 });
    expect(second.target).toBe(b);
    expect(second.contentRect).toMatchObject({ x: 5, y: 6, width: 7, height: 8 });
  });

  it('stops firing for an unobserved target and removes its layout handler', () => {
    const a = makeTarget();

    observer.observe(a as unknown as Element);
    expect(a.handlerCount('layout')).toBe(1);

    observer.unobserve(a as unknown as Element);
    expect(a.handlerCount('layout')).toBe(0);

    a.emit('layout', { x: 0, y: 0, w: 1, h: 1 });
    expect(callback).not.toHaveBeenCalled();
  });

  it('disconnect removes every target layout handler', () => {
    const a = makeTarget();
    const b = makeTarget();

    observer.observe(a as unknown as Element);
    observer.observe(b as unknown as Element);

    observer.disconnect();

    expect(a.handlerCount('layout')).toBe(0);
    expect(b.handlerCount('layout')).toBe(0);

    a.emit('layout', { x: 0, y: 0, w: 1, h: 1 });
    b.emit('layout', { x: 0, y: 0, w: 1, h: 1 });
    expect(callback).not.toHaveBeenCalled();
  });
});
