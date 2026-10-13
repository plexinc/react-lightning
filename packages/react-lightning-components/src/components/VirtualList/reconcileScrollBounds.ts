export interface ScrollBoundsParams {
  /** Current scroll offset to reconcile against the latest content size. */
  scrollOffset: number;
  maxScroll: number;
  totalContentSize: number;
  viewportSize: number;
  onEndReachedThreshold: number | null;
  endReachedForCount: number;
  itemCount: number;
  isScroll: boolean;
  /** Whether an onEndReached callback is wired. */
  hasEndReachedListener: boolean;
}

export interface ScrollBoundsResult {
  clampedOffset: number;
  /** True when clampedOffset differs from the input offset. */
  didClamp: boolean;
  /** Distance from the end, measured from the clamped offset. */
  distanceFromEnd: number;
  fireEndReached: boolean;
  endReachedForCount: number;
}

// The clamp + onEndReached-threshold decision native ScrollView/FlashList make on
export function reconcileScrollBounds({
  scrollOffset,
  maxScroll,
  totalContentSize,
  viewportSize,
  onEndReachedThreshold,
  endReachedForCount,
  itemCount,
  isScroll,
  hasEndReachedListener,
}: ScrollBoundsParams): ScrollBoundsResult {
  const clampedOffset = Math.max(0, Math.min(scrollOffset, maxScroll));
  const distanceFromEnd = totalContentSize - clampedOffset - viewportSize;

  let fireEndReached = false;
  let nextCount = endReachedForCount;

  if (hasEndReachedListener) {
    if (distanceFromEnd <= viewportSize * (onEndReachedThreshold ?? 0.5)) {
      if (itemCount > 0 && itemCount !== endReachedForCount) {
        fireEndReached = true;
        nextCount = itemCount;
      }
    } else if (isScroll) {
      nextCount = 0;
    }
  }

  return {
    clampedOffset,
    didClamp: clampedOffset !== scrollOffset,
    distanceFromEnd,
    fireEndReached,
    endReachedForCount: nextCount,
  };
}
