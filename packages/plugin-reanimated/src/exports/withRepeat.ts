import type { AnimatedValue } from '../animation/AnimatedValue';
import { repeatProgram } from '../animation/animationProgram';

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
  if (animation.program) {
    animation.program = repeatProgram(animation.program, repeatCount, reverse);

    return animation;
  }

  // Single step: let the renderer loop it directly (cheap, GPU-driven).
  animation.lngAnimation.loop = repeatCount === -1;
  animation.lngAnimation.repeat = repeatCount;
  animation.lngAnimation.stopMethod = reverse ? 'reverse' : false;

  return animation;
};
