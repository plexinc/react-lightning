import type { AnimatedStyle } from './types/AnimatedStyle';

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export function isAnimatedStyle(style: any): style is AnimatedStyle {
  return style != null && typeof style === 'object' && 'viewsRef' in style;
}
