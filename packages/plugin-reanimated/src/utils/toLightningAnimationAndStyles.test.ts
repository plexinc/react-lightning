import { describe, expect, it, vi } from 'vitest';
import { AnimatedValue } from '../animation/AnimatedValue';
import { leafProgram, sequenceProgram } from '../animation/animationProgram';
import { AnimationType } from '../types/AnimationType';
import { toLightningAnimationAndStyles } from './toLightningAnimationAndStyles';

// The real module is a vite-plugin alias with no node resolution; only its
// ReduceMotion enum is read at runtime (by spring), the rest is type-only.
vi.mock('react-native-reanimated-original', () => ({
  ReduceMotion: { System: 'system', Always: 'always', Never: 'never' },
}));

const timing = (toValue: number) =>
  new AnimatedValue(AnimationType.Timing, toValue, { duration: 200 });

const settings = () => ({
  duration: 200,
  easing: 'linear' as const,
  delay: 0,
  loop: false,
  repeat: 0,
  stopMethod: false as const,
});

describe('toLightningAnimationAndStyles', () => {
  // Switch's thumb: a plain withTiming rides the node's one-shot transition.
  it('maps a plain animated translateX to the x transition, not a schedule', () => {
    const { transition, schedules } = toLightningAnimationAndStyles({
      transform: [{ translateX: timing(20) }],
    } as never);

    expect(transition.x).toBeDefined();
    expect(schedules).toHaveLength(0);
  });

  it('maps animated opacity to the alpha transition', () => {
    const { transition, style, schedules } = toLightningAnimationAndStyles({
      opacity: timing(0.3),
    } as never);

    expect(style.alpha).toBe(0.3);
    expect(transition.alpha).toBeDefined();
    expect(schedules).toHaveLength(0);
  });

  // ScrollingText's marquee: a composed program plays step-by-step on x.
  it('maps a composed translateX program to an x schedule', () => {
    const program = sequenceProgram([
      leafProgram({ toValue: -840, lngAnimation: settings() }),
      leafProgram({ toValue: 0, lngAnimation: settings() }),
    ]);

    const { transition, schedules } = toLightningAnimationAndStyles({
      transform: [{ translateX: AnimatedValue.fromProgram(program) }],
    } as never);

    expect(schedules).toHaveLength(1);
    expect(schedules[0]?.prop).toBe('x');
    // A program is driven step-by-step, so it must not also take the one-shot x transition.
    expect(transition.x).toBeUndefined();
  });

  it('passes plain (non-animated) values straight through', () => {
    const { style, transition, schedules } = toLightningAnimationAndStyles({
      opacity: 1,
    } as never);

    expect(style.opacity).toBe(1);
    expect(transition.alpha).toBeUndefined();
    expect(schedules).toHaveLength(0);
  });
});
