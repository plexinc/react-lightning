import type { AnimatedValue } from '../animation/AnimatedValue';

export type WithDelayFn = (
  delayMs: number,
  animation: AnimatedValue,
  reduceMotion?: string,
) => AnimatedValue;

export const withDelay: WithDelayFn = (delayMs, animation) => {
  animation.lngAnimation.delay = delayMs;

  return animation;
};
