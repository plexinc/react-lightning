type PropSpec = unknown | { default: unknown; resolve?: (value: unknown, props: Record<string, unknown>) => unknown };

export type ShaderType = { props?: Record<string, PropSpec>; [key: string]: unknown };

const builtin = (props: Record<string, PropSpec>): ShaderType => ({ props, __compat: true });

/** Stand-ins for @lightningjs/renderer/webgl/shaders. Only the prop defaults matter here. */
export const Default = builtin({});
export const Rounded = builtin({ radius: 0 });
export const Border = builtin({
  w: 0,
  color: 0xffffffff,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  gap: 0,
  align: 0,
});
export const RoundedWithBorder = builtin({
  radius: 0,
  'border-w': 0,
  'border-color': 0xffffffff,
  'border-top': 0,
  'border-right': 0,
  'border-bottom': 0,
  'border-left': 0,
  'border-gap': 0,
  'border-align': 0,
});
export const LinearGradient = builtin({ colors: [0x000000ff, 0xffffffff], stops: [0, 1], angle: 0 });
export const RadialGradient = builtin({});
export const Shadow = builtin({});
export const HolePunch = builtin({});
export const RoundedWithShadow = builtin({});
export const RoundedWithBorderAndShadow = builtin({});

export const KIND_NONE = 0;
export const KIND_ROUNDED = 1;
export const KIND_BORDER = 2;
export const KIND_ROUNDED_BORDER = 3;
export const KIND_GRADIENT = 4;
export const KIND_UNSUPPORTED = 5;
export const KIND_ULTRABLUR = 6;
export const KIND_SPINNER = 7;
export const KIND_AVATAR = 8;

const KINDS: Record<string, number> = {
  Default: KIND_NONE,
  Rounded: KIND_ROUNDED,
  Border: KIND_BORDER,
  RoundedWithBorder: KIND_ROUNDED_BORDER,
  LinearGradient: KIND_GRADIENT,
  UltraBlur: KIND_ULTRABLUR,
  SpinnerArc: KIND_SPINNER,
  SocialProofAvatarMask: KIND_AVATAR,
};

export class CompatShader {
  public readonly shaderType: string;
  public readonly kind: number;
  public props: Record<string, unknown>;
  /** Corner radii for the last size asked, see `cornerRadii`. */
  public readonly radii = [0, 0, 0, 0];
  /** Bumped on every prop change, for callers that cache what they derive from the props. */
  public version = 0;
  private _rw = -1;
  private _rh = -1;
  private _radius = 0;

  public constructor(type: string, props: Record<string, unknown>, onChange: () => void) {
    this.shaderType = type;
    this.kind = KINDS[type] ?? KIND_UNSUPPORTED;

    const invalidate = () => {
      this._rw = -1;
      this.version++;
    };

    this.props = new Proxy(props, {
      set(target, key, raw) {
        const value = normalizeProp(key as string, raw);

        if (target[key as string] !== value) {
          target[key as string] = value;
          invalidate();
          onChange();
        }

        return true;
      },
    });
  }

  /** `cornerRadii` for a w x h node, recomputed only when the size or a prop changes. */
  public cornerRadii(w: number, h: number): number {
    if (w !== this._rw || h !== this._rh) {
      this._radius = cornerRadii(this.props, w, h, this.radii);
      this._rw = w;
      this._rh = h;
    }

    return this._radius;
  }
}

export function resolveShaderProps(
  type: ShaderType | undefined,
  input: Record<string, unknown> | undefined,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const specs = type?.props ?? {};

  for (const key in specs) {
    const spec = specs[key];

    if (spec !== null && typeof spec === 'object' && 'default' in (spec as object)) {
      out[key] = (spec as { default: unknown }).default;
    } else {
      out[key] = spec;
    }
  }

  if (input) {
    for (const key in input) {
      if (input[key] !== undefined) {
        out[key] = normalizeProp(key, input[key]);
      }
    }
  }

  for (const key in specs) {
    const spec = specs[key];

    if (spec !== null && typeof spec === 'object' && typeof (spec as { resolve?: unknown }).resolve === 'function') {
      try {
        out[key] = (spec as { resolve: (v: unknown, p: Record<string, unknown>) => unknown }).resolve(
          input?.[key],
          out,
        );
      } catch {
        // Keep the default when a custom resolver expects renderer internals.
      }
    }
  }

  return out;
}

/**
 * Lightning resolves `align` strings to numbers when the prop is set. Keeping
 * the string breaks shader prop animations, which tween every prop as a number.
 */
export function normalizeProp(key: string, value: unknown): unknown {
  if (typeof value === 'string' && (key === 'align' || key === 'border-align')) {
    return value === 'outside' ? 1 : value === 'center' ? 0.5 : 0;
  }

  return value;
}

const CORNER_KEYS = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];

/**
 * Lightning's corner radii for a w x h node: a number or a 1-4 entry array
 * (CSS-style fill), `top-left`... overrides, then scaled down together so
 * adjacent corners never overlap (calcFactoredRadiusArray). Fills `out` as
 * [tl, tr, br, bl] and returns the radius when all four are equal, else -1.
 */
export function cornerRadii(props: Record<string, unknown>, w: number, h: number, out: number[]): number {
  const v = props.radius;
  let r0 = 0;
  let r1 = 0;
  let r2 = 0;
  let r3 = 0;

  if (typeof v === 'number') {
    r0 = r1 = r2 = r3 = v;
  } else if (Array.isArray(v) && v.length > 0) {
    r0 = num(v[0]);
    r1 = v.length > 1 ? num(v[1]) : r0;
    r2 = v.length > 2 ? num(v[2]) : r0;
    r3 = v.length > 3 ? num(v[3]) : v.length === 3 ? r0 : r1;
  }

  for (let i = 0; i < 4; i++) {
    const c = props[CORNER_KEYS[i]];

    if (typeof c === 'number' && c > 0) {
      if (i === 0) r0 = c;
      else if (i === 1) r1 = c;
      else if (i === 2) r2 = c;
      else r3 = c;
    }
  }

  if (w > 0 && h > 0) {
    const f = Math.min(
      w / Math.max(w, r0 + r1),
      w / Math.max(w, r2 + r3),
      h / Math.max(h, r0 + r3),
      h / Math.max(h, r1 + r2),
      1,
    );

    r0 *= f;
    r1 *= f;
    r2 *= f;
    r3 *= f;
  }

  out[0] = r0;
  out[1] = r1;
  out[2] = r2;
  out[3] = r3;

  return r0 === r1 && r1 === r2 && r2 === r3 ? r0 : -1;
}

function num(x: unknown): number {
  return typeof x === 'number' && x > 0 ? x : 0;
}

/** Highest of a number or [tl, tr, br, bl]; the batcher has one radius per quad. */
export function maxRadius(v: unknown): number {
  if (typeof v === 'number') {
    return v;
  }

  if (Array.isArray(v)) {
    let m = 0;

    for (let i = 0; i < v.length; i++) {
      if (typeof v[i] === 'number' && v[i] > m) {
        m = v[i];
      }
    }

    return m;
  }

  return 0;
}
