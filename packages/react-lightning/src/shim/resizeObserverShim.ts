import { LightningViewElement } from '../element/LightningViewElement';
import type { Rect } from '../types';

class LightningResizeObserver extends window.ResizeObserver {
  private _callback: ResizeObserverCallback;
  private _targets: Set<Element> = new Set();

  public constructor(callback: ResizeObserverCallback) {
    super(callback);

    this._callback = callback;
  }

  public override observe(
    target: Element,
    options?: ResizeObserverOptions | undefined,
  ): void {
    if (target instanceof LightningViewElement) {
      this._targets.add(target);
      target.on('layout', this._fireCallbacks);
      return;
    }
    super.observe(target, options);
  }

  public override unobserve(target: Element): void {
    if (target instanceof LightningViewElement) {
      this._targets.delete(target);
      target.off('layout', this._fireCallbacks);
      return;
    }
    super.unobserve(target);
  }

  public override disconnect(): void {
    this._targets.forEach(this.unobserve.bind(this));

    super.disconnect();
  }

  private _fireCallbacks = (dimensions: Rect): void => {
    const entries = Array.from(this._targets).map<ResizeObserverEntry>(
      (target) => {
        return {
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
      },
    );

    this._callback(entries, this);
  };
}

window.ResizeObserver = LightningResizeObserver;
