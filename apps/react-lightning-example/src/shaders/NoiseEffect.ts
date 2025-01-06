import {
  type DefaultEffectProps,
  ShaderEffect,
  type ShaderEffectUniforms,
} from '@lightningjs/renderer';

declare module '@lightningjs/renderer' {
  interface EffectMap {
    Noise: typeof NoiseEffect;
  }
}

export interface NoiseEffectProps extends DefaultEffectProps {
  frequency: number;
  amplitude: number;
}

export class NoiseEffect extends ShaderEffect {
  static z$__type__Props: NoiseEffectProps;
  override readonly name = 'Noise';

  static override getEffectKey(): string {
    return 'Noise';
  }

  static override resolveDefaults(props: NoiseEffectProps): NoiseEffectProps {
    return {
      frequency: props.frequency ?? 0.1,
      amplitude: props.amplitude ?? 0.1,
    };
  }

  static override uniforms: ShaderEffectUniforms = {
    frequency: {
      value: 0.1,
      method: 'uniform1f',
      type: 'float',
    },
    amplitude: {
      value: 0.1,
      method: 'uniform1f',
      type: 'float',
    },
  };

  static override methods: Record<string, string> = {
    rand: `
      float function (vec2 uv){
        return fract(sin(dot(uv.xy ,vec2(12.9898,78.233))) * 43758.5453);
      }
    `,
  };

  static override onColorize = `
    float noise = 1.0 - amplitude + amplitude * smoothstep(0.0, frequency / 2.0, rand(v_textureCoordinate));
    return vec4(vec3(noise), 1.0);
  `;
}
