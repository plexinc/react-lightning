import {
  type DefaultEffectProps,
  ShaderEffect,
  type ShaderEffectUniforms,
} from '@lightningjs/renderer';

declare module '@lightningjs/renderer' {
  interface EffectMap {
    StaticAlpha: typeof StaticAlphaEffect;
  }
}

export interface StaticAlphaProps extends DefaultEffectProps {
  alphaValue: number;
}

export class StaticAlphaEffect extends ShaderEffect {
  static z$__type__Props: StaticAlphaProps;
  override readonly name = 'StaticAlpha';

  static override getEffectKey(): string {
    return 'StaticAlpha';
  }

  static override resolveDefaults(props: StaticAlphaProps): StaticAlphaProps {
    return {
      alphaValue: props.alphaValue ?? 1,
    };
  }

  static override uniforms: ShaderEffectUniforms = {
    alphaValue: {
      value: 1,
      method: 'uniform1f',
      type: 'float',
    },
  };

  static override onColorize = `
    return vec4(maskColor.rgb, 1.0);
  `;
}
