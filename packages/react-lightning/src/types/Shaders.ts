import type {
  BorderProps,
  HolePunchProps,
  LinearGradientProps,
  RadialGradientProps,
  RoundedProps,
  ShadowProps,
} from '@lightningjs/renderer';

// Extracted and massaged from the lightning types that aren't exported directly
// See: https://github.com/lightning-js/renderer/pull/503/files#diff-e12a8b25f458462169c90ca3c012b9a1a7a7149c3647fad9ff1ec007f7db2d9f
export type PrefixedType<T, P extends string | undefined = undefined> = {
  [Key in keyof T as P extends string ? `${P}-${string & Key}` : Key]: T[Key];
};

export type ShadersMap = {
  Border: BorderProps;
  Rounded: RoundedProps;
  Shadow: ShadowProps;
  HolePunch: HolePunchProps;
  LinearGradient: LinearGradientProps;
  RadialGradient: RadialGradientProps;
  RoundedWithBorder: RoundedProps & PrefixedType<BorderProps, 'border'>;
  RoundedWithShadow: RoundedProps & PrefixedType<ShadowProps, 'shadow'>;
  RoundedWithBorderAndShadow: RoundedProps &
    PrefixedType<BorderProps, 'border'> &
    PrefixedType<ShadowProps, 'shadow'>;
};
