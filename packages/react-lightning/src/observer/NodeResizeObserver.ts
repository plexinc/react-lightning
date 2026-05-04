import type { RendererMain } from '@lightningjs/renderer';

import type { LightningElement } from '../types';

interface ObservedEntry {
  element: LightningElement;
  prevW: number;
  prevH: number;
}

/**
 * Fires a `resized` event on observed elements whenever their rendered
 * width or height changes.
 *
 * Hooks into the renderer's `frameTick` event to sample once per frame.
 * This catches every size-change path — React prop updates, direct node
 * writes, animations, Autosizer (children/texture), and text auto-measure.
 *
 * The observer is lazy: it only subscribes to `frameTick` while at least one
 * element is being watched. With no observers, there is zero per-frame cost.
 */
export class NodeResizeObserver {
  private _renderer: RendererMain;
  private _observed = new Map<LightningElement, ObservedEntry>();
  private _frameHandler: (() => void) | null = null;

  constructor(renderer: RendererMain) {
    this._renderer = renderer;
  }

  observe(element: LightningElement): void {
    if (this._observed.has(element)) {
      return;
    }

    this._observed.set(element, {
      element,
      prevW: -1,
      prevH: -1,
    });

    if (this._frameHandler === null) {
      this._frameHandler = this._tick;
      this._renderer.on('frameTick', this._frameHandler);
    }
  }

  unobserve(element: LightningElement): void {
    if (!this._observed.delete(element)) {
      return;
    }

    if (this._observed.size === 0 && this._frameHandler !== null) {
      this._renderer.off('frameTick', this._frameHandler);
      this._frameHandler = null;
    }
  }

  isObserving(element: LightningElement): boolean {
    return this._observed.has(element);
  }

  private _tick = (): void => {
    for (const entry of this._observed.values()) {
      const node = entry.element.node;
      const w = node.w;
      const h = node.h;

      if (entry.prevW !== w || entry.prevH !== h) {
        entry.prevW = w;
        entry.prevH = h;
        entry.element._emitResize({ w, h });
      }
    }
  };
}

const _observerByRenderer = new WeakMap<RendererMain, NodeResizeObserver>();

export function getNodeResizeObserver(renderer: RendererMain): NodeResizeObserver {
  let observer = _observerByRenderer.get(renderer);

  if (observer === undefined) {
    observer = new NodeResizeObserver(renderer);
    _observerByRenderer.set(renderer, observer);
  }

  return observer;
}
