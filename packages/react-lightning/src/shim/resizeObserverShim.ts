import { LightningViewElement } from '../element/LightningViewElement';
import type { Rect } from '../types';

// Chrome < 64 (Tizen 5.0) has no ResizeObserver: Lightning targets still
// report, DOM targets are ignored.
class NoopResizeObserver {
  public constructor(_callback: ResizeObserverCallback) {}
  public observe(_target: Element, _options?: ResizeObserverOptions): void {}
  public unobserve(_target: Element): void {}
  public disconnect(): void {}
}

const BaseResizeObserver: typeof ResizeObserver =
  (window.ResizeObserver as typeof ResizeObserver | undefined) ?? NoopResizeObserver;

function toRect(dimensions: Rect): DOMRectReadOnly {
  if (typeof DOMRectReadOnly !== 'undefined') {
    return new DOMRectReadOnly(dimensions.x, dimensions.y, dimensions.w, dimensions.h);
  }

  const { x, y, w, h } = dimensions;

  return {
    x,
    y,
    width: w,
    height: h,
    top: y,
    left: x,
    right: x + w,
    bottom: y + h,
    toJSON: () => ({ x, y, width: w, height: h }),
  };
}

class LightningResizeObserver extends BaseResizeObserver {
  private _callback: ResizeObserverCallback;
  // Per-target layout handler so each entry reports its own target's rect and
  // the handler ref stays removable on unobserve/disconnect.
  private _handlers =
    new Map<LightningViewElement, (dimensions: Rect) => void>();

  public constructor(callback: ResizeObserverCallback) {
    super(callback);

    this._callback = callback;
  }

  public override observe(
    target: Element,
    options?: ResizeObserverOptions | undefined,
  ): void {
    if (target instanceof LightningViewElement) {
      if (this._handlers.has(target)) {
        return;
      }

      const handler = (dimensions: Rect): void =>
        this._fire(target, dimensions);
      this._handlers.set(target, handler);
      target.on('layout', handler);

      return;
    }

    super.observe(target, options);
  }

  public override unobserve(target: Element): void {
    if (target instanceof LightningViewElement) {
      const handler = this._handlers.get(target);
      if (handler) {
        target.off('layout', handler);
        this._handlers.delete(target);
      }

      return;
    }

    super.unobserve(target);
  }

  public override disconnect(): void {
    for (const [target, handler] of this._handlers) {
      target.off('layout', handler);
    }

    this._handlers.clear();

    super.disconnect();
  }

  // Deliver only the target that actually changed, with its own rect — the shim
  // has no frame boundary to coalesce multiple targets into one batch.
  private _fire(target: LightningViewElement, dimensions: Rect): void {
    const entry: ResizeObserverEntry = {
      borderBoxSize: [
        {
          blockSize: dimensions.h,
          inlineSize: dimensions.w,
        },
      ],
      contentBoxSize: [
        {
          blockSize: dimensions.h,
          inlineSize: dimensions.w,
        },
      ],
      devicePixelContentBoxSize: [
        {
          blockSize: dimensions.h,
          inlineSize: dimensions.w,
        },
      ],
      contentRect: toRect(dimensions),
      target: target as unknown as Element,
    };

    this._callback([entry], this);
  }
}

window.ResizeObserver = LightningResizeObserver;
