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

  // Single step: let the renderer loop it directly (cheap, GPU-driven). Native
  // repeats forever for any count <= 0. The renderer honors `loop` (infinite);
  // finite repeats live on the composed path, so pass 0 when looping.
  const infinite = repeatCount <= 0;

  animation.lngAnimation.loop = infinite;
  animation.lngAnimation.repeat = infinite ? 0 : repeatCount;
  animation.lngAnimation.stopMethod = reverse ? 'reverse' : false;

  return animation;
};
