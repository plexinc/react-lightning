import { describe, expect, it } from 'vitest';

import { resolveRevealBoundary } from './resolveRevealBoundary';

const never = () => Infinity;
const settled = () => 0;
const noneExempt = () => false;
const allExempt = () => true;

describe('resolveRevealBoundary', () => {
  it('reveals everything when every cell is exempt (fixed-size list)', () => {
    const result = resolveRevealBoundary([0, 1, 2], allExempt, never);

    expect(result).toEqual({ revealThrough: 2, nextCheckMs: Infinity });
  });

  it('reveals nothing while the first cell is unsettled', () => {
    const result = resolveRevealBoundary([0, 1, 2], noneExempt, (i) =>
      i === 0 ? 50 : 0,
    );

    expect(result).toEqual({ revealThrough: -1, nextCheckMs: 50 });
  });

  it('reveals the settled prefix and stops at the first unsettled cell', () => {
    // 0,1 settled; 2 still growing; 3 would be settled but sits behind 2.
    const result = resolveRevealBoundary([0, 1, 2, 3], noneExempt, (i) =>
      i === 2 ? 40 : 0,
    );

    expect(result).toEqual({ revealThrough: 1, nextCheckMs: 40 });
  });

  it('withholds the unsettled cell itself so it never grows on screen', () => {
    const result = resolveRevealBoundary([0, 1], noneExempt, (i) =>
      i === 1 ? 30 : 0,
    );

    expect(result.revealThrough).toBe(0);
  });

  it('reveals past exempt cells that sit before the block point', () => {
    // index 1 exempt (fixed), 2 unsettled.
    const result = resolveRevealBoundary(
      [0, 1, 2, 3],
      (i) => i === 1,
      (i) => (i === 2 ? 25 : 0),
    );

    expect(result).toEqual({ revealThrough: 1, nextCheckMs: 25 });
  });

  it('does not schedule a timer for a never-measured blocker', () => {
    const result = resolveRevealBoundary([0, 1], noneExempt, never);

    expect(result).toEqual({ revealThrough: -1, nextCheckMs: Infinity });
  });

  it('reveals all when the whole visible range has settled', () => {
    const result = resolveRevealBoundary([4, 5, 6], noneExempt, settled);

    expect(result).toEqual({ revealThrough: 6, nextCheckMs: Infinity });
  });
});
