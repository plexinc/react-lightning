import { DIRTY_ALPHA, DIRTY_TRANSFORM, type SceneNode, type Transition } from './SceneNode';

type Tween = {
  node: SceneNode;
  prop: string;
  from: number;
  to: number;
  start: number;
  duration: number;
  ease: (t: number) => number;
  isColor: boolean;
};

const EASINGS: Record<string, (t: number) => number> = {
  linear: (t) => t,
  'ease-in': (t) => t * t,
  'ease-out': (t) => t * (2 - t),
  'ease-in-out': (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
};

/** Numeric tweens on node fields, advanced by the stage before each frame. */
export class Animator {
  public active: Tween[] = [];

  public animate(node: SceneNode, prop: string, to: number, t: Transition, now: number): void {
    const target = node as unknown as Record<string, number>;
    const isColor = prop === 'color' || prop === 'borderColor';

    for (let i = 0; i < this.active.length; i++) {
      const tw = this.active[i];

      if (tw.node === node && tw.prop === prop) {
        if (tw.to === to) {
          return;
        }

        tw.from = target[prop];
        tw.to = to;
        tw.start = now + (t.delay ?? 0);
        tw.duration = t.duration;

        return;
      }
    }

    if (target[prop] === to) {
      return;
    }

    this.active.push({
      node,
      prop,
      from: target[prop],
      to,
      start: now + (t.delay ?? 0),
      duration: Math.max(1, t.duration),
      ease: EASINGS[t.easing ?? 'ease-out'] ?? EASINGS['ease-out'],
      isColor,
    });
  }

  public cancelAll(node: SceneNode): void {
    if (this.active.length === 0) {
      return;
    }

    this.active = this.active.filter((tw) => tw.node !== node);
  }

  /** Returns true while anything is still running. */
  public tick(now: number): boolean {
    const list = this.active;

    if (list.length === 0) {
      return false;
    }

    let write = 0;

    for (let i = 0; i < list.length; i++) {
      const tw = list[i];
      const p = now <= tw.start ? 0 : Math.min(1, (now - tw.start) / tw.duration);
      const e = tw.ease(p);
      const target = tw.node as unknown as Record<string, number>;

      target[tw.prop] = tw.isColor ? lerpColor(tw.from, tw.to, e) : tw.from + (tw.to - tw.from) * e;
      tw.node.flags |= tw.prop === 'alpha' ? DIRTY_ALPHA : DIRTY_TRANSFORM;

      if (p < 1) {
        list[write++] = tw;
      }
    }

    list.length = write;

    return true;
  }
}

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >>> 24) & 255;
  const ag = (a >>> 16) & 255;
  const ab = (a >>> 8) & 255;
  const aa = a & 255;
  const r = Math.round(ar + (((b >>> 24) & 255) - ar) * t);
  const g = Math.round(ag + (((b >>> 16) & 255) - ag) * t);
  const bl = Math.round(ab + (((b >>> 8) & 255) - ab) * t);
  const al = Math.round(aa + ((b & 255) - aa) * t);

  return ((r << 24) | (g << 16) | (bl << 8) | al) >>> 0;
}
