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

  public constructor(type: string, props: Record<string, unknown>, onChange: () => void) {
    this.shaderType = type;
    this.kind = KINDS[type] ?? KIND_UNSUPPORTED;
    this.props = new Proxy(props, {
      set(target, key, raw) {
        const value = normalizeProp(key as string, raw);

        if (target[key as string] !== value) {
          target[key as string] = value;
          onChange();
        }

        return true;
      },
    });
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
