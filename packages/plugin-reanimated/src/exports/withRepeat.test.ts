import type { AnimationSettings } from '@lightningjs/renderer';
import { describe, expect, it } from 'vitest';

import type { AnimatedValue } from '../animation/AnimatedValue';
import { withRepeat } from './withRepeat';

// A plain withTiming value: no composed program, so it takes the single-step
// renderer-loop path. Built as a bare shape to keep the reanimated-original
// alias (pulled in by AnimatedValue's spring import) out of the test env.
const single = () =>
  ({ program: undefined, lngAnimation: {} as AnimationSettings }) as unknown as AnimatedValue;

describe('withRepeat (single-step renderer loop)', () => {
  it('loops forever for count -1', () => {
    expect(withRepeat(single(), -1).lngAnimation.loop).toBe(true);
  });

  it('loops forever for count 0 (native: any count <= 0 is infinite)', () => {
    expect(withRepeat(single(), 0).lngAnimation.loop).toBe(true);
  });

  it('loops forever for any negative count', () => {
    expect(withRepeat(single(), -5).lngAnimation.loop).toBe(true);
  });

  it('plays a finite positive count without looping', () => {
    const a = withRepeat(single(), 3);

    expect(a.lngAnimation.loop).toBe(false);
    expect(a.lngAnimation.repeat).toBe(3);
  });

  it('reverse selects the reverse stop method', () => {
    expect(withRepeat(single(), -1, true).lngAnimation.stopMethod).toBe('reverse');
    expect(withRepeat(single(), 2, false).lngAnimation.stopMethod).toBe(false);
  });
});
