import type { AnimatedValue } from '../animation/AnimatedValue';

export type WithRepeatFn = (
  animation: AnimatedValue,
  repeatCount?: number,
  reverse?: boolean,
) => AnimatedValue;

export const withRepeat: WithRepeatFn = (
  animation: AnimatedValue,
  repeatCount = 2,
  reverse = false,
) => {
  animation.lngAnimation.loop = repeatCount === -1;
  animation.lngAnimation.repeat = repeatCount;
  animation.lngAnimation.stopMethod = reverse ? 'reverse' : false;

  return animation;
};
