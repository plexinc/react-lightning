import type { AnimatedValue } from '../animation/AnimatedValue';
import type { AnimationType } from '../types/AnimationType';

export function withRepeat(
  animation: AnimatedValue,
  repeatCount = 2,
  reverse = false,
): {
  isHigherOrder: boolean;
  onFrame: () => void;
  onStart: () => void;
  reps: number;
  current: AnimatedValue<AnimationType>;
  callback: () => void;
  startValue: number;
  reduceMotion: boolean;
} {
  animation.lngAnimation.repeat = repeatCount;
  animation.lngAnimation.stopMethod = reverse ? 'reverse' : false;

  return {
    isHigherOrder: true,
    onFrame: (): void => {},
    onStart: (): void => {},
    reps: 0,
    current: animation,
    callback: (): void => {},
    startValue: 0,
    reduceMotion: false,
  };
}
