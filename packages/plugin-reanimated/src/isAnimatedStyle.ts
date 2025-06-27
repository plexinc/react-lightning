import type { AnimatedStyle } from './types/AnimatedStyle';

// biome-ignore lint/suspicious/noExplicitAny: Valid use of any here
export function isAnimatedStyle(style: any): style is AnimatedStyle {
  return style != null && typeof style === 'object' && 'viewsRef' in style;
}
