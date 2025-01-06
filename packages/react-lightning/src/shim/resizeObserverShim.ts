import { LightningViewElement } from '../element/LightningViewElement';
import type { Rect } from '../types';

class LightningResizeObserver extends window.ResizeObserver {
  private _callback: ResizeObserverCallback;
  private _targets: Set<LightningViewElement> = new Set();

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

  private _fireCallbacks = (dimensions: Rect): void => {
    const entries = Array.from(this._targets).map<ResizeObserverEntry>(
      (target) => {
        return {
          borderBoxSize: [
            {
              blockSize: dimensions.height,
              inlineSize: dimensions.width,
            },
          ],
          contentBoxSize: [
            {
              blockSize: dimensions.height,
              inlineSize: dimensions.width,
            },
          ],
          devicePixelContentBoxSize: [
            {
              blockSize: dimensions.height,
              inlineSize: dimensions.width,
            },
          ],
          contentRect: new DOMRectReadOnly(
            dimensions.x,
            dimensions.y,
            dimensions.width,
            dimensions.height,
          ),
          target: target as unknown as Element,
        };
      },
    );

    this._callback(entries, this);
  };
}

window.ResizeObserver = LightningResizeObserver;
