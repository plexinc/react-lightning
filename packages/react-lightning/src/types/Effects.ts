import type { SpecificShaderRef } from '@lightningjs/renderer';

export type EffectsList = Exclude<
  SpecificShaderRef<'DynamicShader'>['props']['effects'],
  undefined
>;

export type EffectsTypes = {
  [K in EffectsList[number]['type']]?: Extract<
    EffectsList[number],
    { type: K }
  >['props'];
};

export type EffectsMap = {
  [name: string]: EffectsList[number];
};
