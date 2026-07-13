import type { AnimationSettings } from '@lightningjs/renderer';
import { describe, expect, it } from 'vitest';

import { sampleAnimation } from './sampleAnimation';

const settings = (
  overrides: Partial<AnimationSettings>,
): AnimationSettings => ({
  duration: 100,
  easing: 'linear',
  delay: 0,
  loop: false,
  repeat: 0,
  stopMethod: false,
  ...overrides,
});

describe('sampleAnimation', () => {
  it('holds the start value before the delay elapses', () => {
    const r = sampleAnimation(10, 100, 40, settings({ delay: 50 }));

    expect(r).toEqual({ value: 10, done: false });
  });

  it('settles on the target and reports done once the duration passes', () => {
    expect(sampleAnimation(0, 100, 100, settings({}))).toEqual({
      value: 100,
      done: true,
    });
    expect(sampleAnimation(0, 100, 250, settings({}))).toEqual({
      value: 100,
      done: true,
    });
  });

  it('interpolates linearly across the duration', () => {
    expect(sampleAnimation(0, 100, 50, settings({})).value).toBe(50);
  });

  it('offsets progress by the delay', () => {
    // (150 - 100 delay) / 100 duration = 0.5
    expect(sampleAnimation(0, 100, 150, settings({ delay: 100 })).value).toBe(
      50,
    );
  });

  it('uses a baked progress function (springs and custom timings)', () => {
    const easing = (progress: number) => progress * progress;
    // 0.5^2 = 0.25 -> 25
    expect(
      sampleAnimation(0, 100, 50, settings({ easing })).value,
    ).toBeCloseTo(25, 5);
  });

  it('maps the ease-out string the renderer emits for instant springs', () => {
    // 1 - (1 - 0.5)^2 = 0.75 -> 75
    expect(
      sampleAnimation(0, 100, 50, settings({ easing: 'ease-out' })).value,
    ).toBeCloseTo(75, 5);
  });

  it('falls back to linear for an unknown easing string', () => {
    expect(
      sampleAnimation(0, 100, 50, settings({ easing: 'wobble' as never })).value,
    ).toBe(50);
  });

  it('animates downward targets too', () => {
    expect(sampleAnimation(100, 0, 50, settings({})).value).toBe(50);
  });
});
