import type { AnimatedValue } from '../animation/AnimatedValue';

export type AnimatedObject<T> = {
  [K in keyof T]: T[K] | AnimatedValue;
};
