import { beforeAll, describe, expect, it, vi } from 'vitest';

import type { Rect } from '../types';

vi.mock('../element/LightningViewElement', () => {
  class LightningViewElement {
    private _handlers = new Set<(rect: Rect) => void>();

    public on(_event: string, handler: (rect: Rect) => void): void {
      this._handlers.add(handler);
    }

    public off(_event: string, handler: (rect: Rect) => void): void {
      this._handlers.delete(handler);
    }

    public emit(rect: Rect): void {
      this._handlers.forEach((handler) => handler(rect));
    }
  }

  return { LightningViewElement };
});

type LayoutTarget = { emit(rect: Rect): void };

let LightningViewElementMock: new () => LayoutTarget;

beforeAll(async () => {
  vi.stubGlobal('window', {});
  vi.stubGlobal('ResizeObserver', undefined);
  vi.stubGlobal('DOMRectReadOnly', undefined);

  ({ LightningViewElement: LightningViewElementMock } =
    (await import('../element/LightningViewElement')) as unknown as {
      LightningViewElement: new () => LayoutTarget;
    });
});

describe('LightningResizeObserver without a native ResizeObserver', () => {
  it('imports without throwing and installs itself', async () => {
    await expect(import('./resizeObserverShim')).resolves.toBeDefined();
    expect(typeof window.ResizeObserver).toBe('function');
  });

  it('still reports Lightning targets and ignores DOM targets', () => {
    const callback = vi.fn<ResizeObserverCallback>();
    const observer = new window.ResizeObserver(callback);
    const target = new LightningViewElementMock();

    observer.observe(target as unknown as Element);
    expect(() => observer.observe({} as Element)).not.toThrow();

    target.emit({ x: 1, y: 2, w: 3, h: 4 });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback.mock.calls[0]?.[0][0]?.contentRect).toMatchObject({
      x: 1,
      y: 2,
      width: 3,
      height: 4,
      right: 4,
      bottom: 6,
    });

    expect(() => observer.disconnect()).not.toThrow();
  });
});
