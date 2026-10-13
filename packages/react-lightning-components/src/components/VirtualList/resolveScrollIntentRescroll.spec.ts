import { describe, expect, it } from 'vitest';

import { resolveScrollIntentRescroll } from './resolveScrollIntentRescroll';

describe('resolveScrollIntentRescroll', () => {
  it('does nothing without an intent', () => {
    expect(resolveScrollIntentRescroll(null, 0, 3000)).toBeUndefined();
  });

  it('does nothing when the list already sits at the clamped intent', () => {
    expect(resolveScrollIntentRescroll(4352, 2912, 2912)).toBeUndefined();
  });

  it('scrolls on once the range grew past the earlier clamp', () => {
    expect(resolveScrollIntentRescroll(4352, 2912, 3168)).toBe(3168);
  });

  it('never goes below zero', () => {
    expect(resolveScrollIntentRescroll(-50, 10, 3000)).toBe(0);
  });
});
