import type { AnimatedValue } from '../animation/AnimatedValue';

export function withRepeat(
  animation: AnimatedValue,
  repeatCount = 2,
  reverse = false,
) {
  animation.lngAnimation.repeat = repeatCount;
  animation.lngAnimation.stopMethod = reverse ? 'reverse' : false;

  return {
    isHigherOrder: true,
    onFrame: () => {},
    onStart: () => {},
    reps: 0,
    current: animation,
    callback: () => {},
    startValue: 0,
    reduceMotion: false,
  };
}
