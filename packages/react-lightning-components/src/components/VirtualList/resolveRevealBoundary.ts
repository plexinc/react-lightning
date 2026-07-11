export interface RevealBoundary {
  /**
   * Highest visible index allowed to paint; cells after it stay withheld.
   * `-1` means nothing can paint yet (the first visible cell hasn't settled).
   */
  revealThrough: number;
  /**
   * Smallest positive wait (ms) among cells blocking the boundary, for
   * scheduling a re-check. `Infinity` when nothing is pending on a timer
   * (either everything is revealed, or a blocker hasn't measured yet and will
   * wake the list via its first size report).
   */
  nextCheckMs: number;
}

/**
 * Walks the visible cells in order and finds how far the list may paint. A cell
 * reveals once it and every earlier visible cell have settled; the first
 * unsettled cell (and everything after it) stays withheld so it never grows on
 * screen or shifts its neighbours. Fixed-size cells (`isExempt`) never block.
 */
export function resolveRevealBoundary(
  order: readonly number[],
  isExempt: (index: number) => boolean,
  timeUntilSettled: (index: number) => number,
): RevealBoundary {
  let revealThrough = -1;

  for (const index of order) {
    if (isExempt(index)) {
      revealThrough = index;
      continue;
    }

    const remaining = timeUntilSettled(index);

    if (remaining === 0) {
      revealThrough = index;
      continue;
    }

    return {
      revealThrough,
      nextCheckMs: Number.isFinite(remaining) ? remaining : Infinity,
    };
  }

  return { revealThrough, nextCheckMs: Infinity };
}
