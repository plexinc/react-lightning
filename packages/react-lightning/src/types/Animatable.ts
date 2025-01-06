import type { AnimationSettings } from '@lightningjs/renderer';

export interface Animatable<T> {
  transition?: Partial<Record<keyof T, Partial<AnimationSettings>>>;
}
