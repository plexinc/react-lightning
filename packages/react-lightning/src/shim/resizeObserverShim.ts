import { LightningViewElement } from '../element/LightningViewElement';
import type { Rect } from '../types';

class LightningResizeObserver extends window.ResizeObserver {
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
      contentRect: new DOMRectReadOnly(
        dimensions.x,
        dimensions.y,
        dimensions.w,
        dimensions.h,
      ),
      target: target as unknown as Element,
    };

    this._callback([entry], this);
  }
}

window.ResizeObserver = LightningResizeObserver;
