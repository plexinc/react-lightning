/**
 * Caps a self-measured main-axis viewport at the list's visible span (stage
 * edge minus the list's stage position).
 *
 * A list with no explicit main size and no parent cell bounds is flex-sized,
 * and when nothing bounds it (the layout overflows the canvas) flex gives it
 * its full content size. Using that as the viewport makes maxScroll 0, so the
 * list renders everything and never scrolls to follow focus. Only the
 * self-measured fallback is capped — explicit and parent-derived sizes are
 * definite and stay trusted.
 *
 * A non-positive span means it is unknown (unmounted, or the list starts past
 * the stage edge); the measurement passes through uncapped rather than
 * collapsing the list.
 */
export function capSelfMeasuredViewport(measuredMain: number, visibleMainSpan: number): number {
  if (measuredMain <= 0) {
    return 0;
  }

  if (visibleMainSpan <= 0) {
    return measuredMain;
  }

  return Math.min(measuredMain, visibleMainSpan);
}
