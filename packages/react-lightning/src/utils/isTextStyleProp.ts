import type { LightningTextElementStyle } from '../types';

const textProps = {
  color: true,

  shadow: true,
  shadowColor: true,
  shadowOffsetX: true,
  shadowOffsetY: true,
  shadowBlur: true,

  text: true,
  textAlign: true,
  contain: true,
  scrollable: true,
  scrollY: true,
  offsetY: true,
  letterSpacing: true,
  lineHeight: true,
  fontFamily: true,
  fontWeight: true,
  fontStyle: true,
  fontStretch: true,
  fontSize: true,
} as const satisfies Partial<Record<keyof LightningTextElementStyle, boolean>>;

export type TextProps = keyof typeof textProps;

export function isTextStyleProp(
  prop: number | string | symbol,
): prop is TextProps {
  return prop in textProps;
}
