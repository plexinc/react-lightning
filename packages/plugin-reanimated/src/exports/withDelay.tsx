import type { AnimatedValue } from '../animation/AnimatedValue';
import { delayProgram } from '../animation/animationProgram';

export type WithDelayFn = (
  delayMs: number,
  animation: AnimatedValue,
  reduceMotion?: string,
) => AnimatedValue;

export const withDelay: WithDelayFn = (delayMs, animation) => {
  if (animation.program) {
    animation.program = delayProgram(animation.program, delayMs);

    return animation;
  }

  animation.lngAnimation.delay = delayMs;

  return animation;
};
