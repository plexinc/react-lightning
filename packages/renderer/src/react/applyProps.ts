import {
  DIRTY_ALPHA,
  DIRTY_ORDER,
  DIRTY_SRC,
  DIRTY_TEXT,
  DIRTY_TRANSFORM,
  KIND_TEXT,
  type SceneNode,
  type Transition,
} from '../SceneNode';

type Style = Record<string, unknown>;
type Props = {
  style?: Style | null;
  src?: string | null;
  transition?: Record<string, Transition> | null;
  children?: unknown;
  onLoad?: unknown;
};

// What each style key writes to and which dirty bit it sets. A switch keeps
// this allocation-free and monomorphic on the node.
function writeStyle(node: SceneNode, key: string, value: unknown, now: number): number {
  // now < 0 marks the initial mount: values are set, never animated in.
  const t = now < 0 ? null : node.transition;

  switch (key) {
    case 'x':
    case 'y':
    case 'scaleX':
    case 'scaleY':
    case 'rotation':
    case 'alpha':
    case 'color':
    case 'borderColor': {
      const v =
        (value as number | undefined) ??
        (key === 'alpha' || key === 'scaleX' || key === 'scaleY' ? 1 : 0);
      const tr = t?.[key];

      if (tr && node.stage) {
        node.stage.animator.animate(node, key, v, tr, now);
        node.stage.requestRender();

        return 0;
      }

      (node as unknown as Record<string, number>)[key] = v;

      return key === 'alpha' ? DIRTY_ALPHA : DIRTY_TRANSFORM;
    }
    case 'scale': {
      const v = (value as number | undefined) ?? 1;
      const tr = t?.scale;

      if (tr && node.stage) {
        node.stage.animator.animate(node, 'scaleX', v, tr, now);
        node.stage.animator.animate(node, 'scaleY', v, tr, now);
        node.stage.requestRender();

        return 0;
      }

      node.scaleX = v;
      node.scaleY = v;

      return DIRTY_TRANSFORM;
    }
    case 'w':
    case 'width':
      node.w = (value as number) ?? 0;

      return DIRTY_TRANSFORM;
    case 'h':
    case 'height':
      node.h = (value as number) ?? 0;

      return DIRTY_TRANSFORM;
    case 'pivot':
      node.pivotX = node.pivotY = (value as number) ?? 0.5;

      return DIRTY_TRANSFORM;
    case 'pivotX':
      node.pivotX = (value as number) ?? 0.5;

      return DIRTY_TRANSFORM;
    case 'pivotY':
      node.pivotY = (value as number) ?? 0.5;

      return DIRTY_TRANSFORM;
    case 'zIndex':
      node.zIndex = (value as number) ?? 0;

      return DIRTY_ORDER;
    case 'clipping':
      node.clipping = value === true;

      return DIRTY_TRANSFORM;
    case 'borderRadius':
      node.radius = Array.isArray(value)
        ? Math.max(...(value as number[]))
        : ((value as number) ?? 0);

      return DIRTY_TRANSFORM;
    case 'border': {
      const b = value as { w?: number; color?: number } | number | null | undefined;

      if (b == null) {
        node.borderWidth = 0;
      } else if (typeof b === 'number') {
        node.borderWidth = b;
      } else {
        node.borderWidth = b.w ?? 0;
        node.borderColor = b.color ?? node.borderColor;
      }

      return DIRTY_TRANSFORM;
    }
    case 'fontSize':
      node.fontSize = (value as number) ?? 16;

      return DIRTY_TEXT;
    case 'lineHeight':
      node.lineHeight = (value as number) ?? 0;

      return DIRTY_TEXT;
    case 'maxWidth':
      node.maxWidth = (value as number) ?? 0;

      return DIRTY_TEXT;
    case 'maxLines':
      node.maxLines = (value as number) ?? 0;

      return DIRTY_TEXT;
    case 'fontFamily':
      node.fontFamily = (value as string) ?? 'sans-serif';

      return DIRTY_TEXT;
    case 'fontWeight':
      node.fontWeight = String(value ?? 'normal');

      return DIRTY_TEXT;
    case 'textAlign':
      node.textAlign = (value as SceneNode['textAlign']) ?? 'left';

      return DIRTY_TEXT;
    case 'display':
      node.visible = value !== 'none';

      return DIRTY_ALPHA;
    default:
      return 0;
  }
}

function textOf(children: unknown): string | null {
  if (typeof children === 'string') {
    return children;
  }

  if (typeof children === 'number') {
    return String(children);
  }

  if (Array.isArray(children)) {
    let s = '';

    for (let i = 0; i < children.length; i++) {
      const c = children[i];

      if (typeof c === 'string' || typeof c === 'number') {
        s += c;
      } else if (c != null && typeof c !== 'boolean') {
        return null;
      }
    }

    return s;
  }

  return null;
}

export function isTextContent(children: unknown): boolean {
  return textOf(children) !== null;
}

/** Writes only what changed between `prev` and `next`; `prev` is null at mount. */
export function applyProps(node: SceneNode, prev: Props | null, next: Props): void {
  let dirty = 0;
  const now = prev ? performance.now() : -1;

  if (next.transition !== prev?.transition) {
    node.transition = next.transition ?? null;
  }

  const ps = prev?.style ?? null;
  const ns = next.style ?? null;

  if (ns !== ps) {
    if (ns) {
      for (const key in ns) {
        const v = ns[key];

        if (!ps || ps[key] !== v) {
          dirty |= writeStyle(node, key, v, now);
        }
      }
    }

    if (ps) {
      for (const key in ps) {
        if (!ns || !(key in ns)) {
          dirty |= writeStyle(node, key, undefined, now);
        }
      }
    }
  }

  if (next.src !== (prev ? prev.src : undefined)) {
    node.src = next.src ?? null;
    dirty |= DIRTY_SRC;
  }

  if (node.kind === KIND_TEXT && next.children !== prev?.children) {
    const text = textOf(next.children);

    if (text !== null && text !== node.text) {
      node.text = text;
      dirty |= DIRTY_TEXT;
    }
  }

  if (dirty) {
    node.invalidate(dirty);
  }
}
