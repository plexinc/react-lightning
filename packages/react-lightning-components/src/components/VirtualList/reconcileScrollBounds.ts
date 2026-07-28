export interface ScrollBoundsParams {
  /** Current scroll offset to reconcile against the latest content size. */
  scrollOffset: number;
  maxScroll: number;
  totalContentSize: number;
  viewportSize: number;
  onEndReachedThreshold: number | null;
  /** Current onEndReached latch (whether it has already fired at the end). */
  endReached: boolean;
  /** Whether an onEndReached callback is wired. */
  hasEndReachedListener: boolean;
}

export interface ScrollBoundsResult {
  clampedOffset: number;
  /** True when clampedOffset differs from the input offset. */
  didClamp: boolean;
  /** Distance from the end, measured from the clamped offset. */
  distanceFromEnd: number;
  /** True when onEndReached should fire this pass (within threshold, not yet latched). */
  fireEndReached: boolean;
  /** Next value for the onEndReached latch. */
  endReached: boolean;
}

// The clamp + onEndReached-threshold decision native ScrollView/FlashList make on
// every layout pass. Shared by the scroll handler and the content-size effect so
// a shrink reclamps the offset and a short list still primes onEndReached on mount.
export function reconcileScrollBounds({
  scrollOffset,
  maxScroll,
  totalContentSize,
  viewportSize,
  onEndReachedThreshold,
  endReached,
  hasEndReachedListener,
}: ScrollBoundsParams): ScrollBoundsResult {
  const clampedOffset = Math.max(0, Math.min(scrollOffset, maxScroll));
  const distanceFromEnd = totalContentSize - clampedOffset - viewportSize;

  let fireEndReached = false;
  let nextEndReached = endReached;

  if (hasEndReachedListener) {
    if (distanceFromEnd <= viewportSize * (onEndReachedThreshold ?? 0.5)) {
      if (!endReached) {
        fireEndReached = true;
        nextEndReached = true;
      }
    } else {
      nextEndReached = false;
    }
  }

  return {
    clampedOffset,
    didClamp: clampedOffset !== scrollOffset,
    distanceFromEnd,
    fireEndReached,
    endReached: nextEndReached,
  };
}
