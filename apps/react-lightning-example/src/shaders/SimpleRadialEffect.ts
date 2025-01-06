/*
 * If not stated otherwise in this file or this component's LICENSE file the
 * following copyright and licenses apply:
 *
 * Copyright 2023 Comcast Cable Communications Management, LLC.
 *
 * Licensed under the Apache License, Version 2.0 (the License);
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {
  type DefaultEffectProps,
  ShaderEffect,
  type ShaderEffectUniforms,
  type ShaderEffectValueMap,
} from '@lightningjs/renderer';

export const updateFloat32ArrayLength2 = (values: ShaderEffectValueMap) => {
  const validatedValue = (values.validatedValue || values.value) as number[];
  if (values.programValue instanceof Float32Array) {
    const floatArray = values.programValue;

    // biome-ignore lint: Should be safe to assume that the array is of length 2
    floatArray[0] = validatedValue[0]!;
    // biome-ignore lint: Same here
    floatArray[1] = validatedValue[1]!;
  } else {
    values.programValue = new Float32Array(validatedValue);
  }
};

export const updateShaderEffectColor = (values: ShaderEffectValueMap) => {
  if (values.programValue === undefined) {
    values.programValue = new Float32Array(4);
  }
  const rgba = values.value as number;
  const floatArray = values.programValue as Float32Array;
  floatArray[0] = (rgba >>> 24) / 255;
  floatArray[1] = ((rgba >>> 16) & 0xff) / 255;
  floatArray[2] = ((rgba >>> 8) & 0xff) / 255;
  floatArray[3] = (rgba & 0xff) / 255;
};

declare module '@lightningjs/renderer' {
  interface EffectMap {
    SimpleRadial: typeof SimpleRadialEffect;
  }
}

/**
 * Properties of the {@link SimpleRadialEffect} effect
 */
export interface SimpleRadialEffectProps extends DefaultEffectProps {
  /**
   * Array of colors to be used in the SimpleRadialEffect
   *
   * @default 0xffffffff
   */
  color: number;
  /**
   * Width of the SimpleRadialEffect
   */
  width?: number;
  /**
   * height of the SimpleRadialEffect
   *
   * @remarks if not defined uses the width value
   */
  height?: number;
  /**
   * center point of where the SimpleRadialEffect is drawn
   */
  pivot?: number[];
}

export class SimpleRadialEffect extends ShaderEffect {
  static z$__type__Props: SimpleRadialEffectProps;
  override readonly name = 'SimpleRadial';

  static override getEffectKey(): string {
    return 'SimpleRadial';
  }

  static override resolveDefaults(
    props: SimpleRadialEffectProps,
  ): Required<SimpleRadialEffectProps> {
    const color = props.color ?? 0xffffffff;

    return {
      color,
      width: props.width ?? 0,
      height: props.height ?? props.width ?? 0,
      pivot: props.pivot ?? [0.5, 0.5],
    };
  }

  static override uniforms: ShaderEffectUniforms = {
    width: {
      value: 0,
      method: 'uniform1f',
      type: 'float',
    },
    height: {
      value: 0,
      method: 'uniform1f',
      type: 'float',
    },
    pivot: {
      value: [0.5, 0.5],
      updateProgramValue: updateFloat32ArrayLength2,
      method: 'uniform2fv',
      type: 'vec2',
    },
    color: {
      value: 0xffffffff,
      updateProgramValue: updateShaderEffectColor,
      method: 'uniform4fv',
      type: 'vec4',
    },
  };

  static override onColorize = () => {
    return `
      vec2 point = v_textureCoordinate.xy * u_dimensions;
      vec2 projection = vec2(pivot.x * u_dimensions.x, pivot.y * u_dimensions.y);

      float dist = length((point - projection) / vec2(width, height));

      vec4 colorOut = mix(color, vec4(color.rgb, 0), dist);
      return mix(maskColor, colorOut, clamp(colorOut.a, 0.0, 1.0));
    `;
  };
}
