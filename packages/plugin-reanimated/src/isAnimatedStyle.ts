import type { AnimatedStyle } from './types/AnimatedStyle';

// oxlint-disable-next-line typescript/no-explicit-any -- Valid use of any here
export function isAnimatedStyle(style: any): style is AnimatedStyle {
  return style != null && typeof style === 'object' && 'viewsRef' in style;
}
