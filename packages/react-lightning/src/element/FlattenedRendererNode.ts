import type { RendererNode } from '../types';
import type { LightningElement } from '../types/Element';

// Ids count down so a flattened placeholder is never mistaken for a renderer
// node (renderer ids start at 1).
let flattenedIdCounter = 0;

const noopAnimationController = {
  start() {
    return noopAnimationController;
  },
  stop() {
    return noopAnimationController;
  },
  pause() {
    return noopAnimationController;
  },
  restore() {
    return noopAnimationController;
  },
  once() {
    return noopAnimationController;
  },
  on() {
    return noopAnimationController;
  },
  off() {
    return noopAnimationController;
  },
  waitUntilStopped() {
    return Promise.resolve();
  },
  state: 'stopped',
};

/** Element hook a placeholder calls when its position is written directly. */
export interface FlattenedNodeOwner {
  onFlattenedAxisWrite(axis: 'x' | 'y', value: number): void;
}

/**
 * Placeholder standing in for a renderer node on a flattened (layout-only)
 * element. Stores the handful of props the element layer reads back (position,
 * size, alpha) and no-ops the renderer surface. Descendant elements with real
 * nodes attach to the nearest non-flattened ancestor instead.
 */
export class FlattenedRendererNode {
  public readonly isFlattenedNode = true;
  public id: number = --flattenedIdCounter;
  private _x = 0;
  private _y = 0;
  public w = 0;
  public h = 0;
  public alpha = 1;
  public parent: unknown = null;
  public shader: unknown = null;
  public clipRadius = 0;
  // Assigned by the element constructor, mirrored on materialize.
  public __reactFiber: unknown = null;
  public __reactNode: unknown = null;
  // The owning element. A direct node.x/node.y write (a scroll handler moving
  // the content node straight through node.x, bypassing setProps) has to fold
  // through to the hoisted children, which only the element can do.
  public owner: FlattenedNodeOwner | null = null;

  public get x(): number {
    return this._x;
  }

  public set x(value: number) {
    if (this._x === value) {
      return;
    }

    this._x = value;
    this.owner?.onFlattenedAxisWrite('x', value);
  }

  public get y(): number {
    return this._y;
  }

  public set y(value: number) {
    if (this._y === value) {
      return;
    }

    this._y = value;
    this.owner?.onFlattenedAxisWrite('y', value);
  }

  public constructor(props: Record<string, unknown>) {
    for (const key in props) {
      if (key === 'data' || key === 'parent') {
        continue;
      }

      (this as Record<string, unknown>)[key] = props[key];
    }
  }

  public on(): void {}
  public off(): void {}
  public once(): void {}
  public emit(): void {}
  public animate(): typeof noopAnimationController {
    return noopAnimationController;
  }
  public destroy(): void {}
}

export function createFlattenedNode<T extends LightningElement>(
  props: Record<string, unknown>,
): RendererNode<T> {
  return new FlattenedRendererNode(props) as unknown as RendererNode<T>;
}
