export interface ScrollToIndexTargetParams {
  itemOffset: number;
  itemSize: number;
  viewportSize: number;
  viewPosition: number;
  viewOffset: number;
}

export function resolveScrollToIndexTarget({
  itemOffset,
  itemSize,
  viewportSize,
  viewPosition,
  viewOffset,
}: ScrollToIndexTargetParams): number | undefined {
  if (viewportSize <= 0) {
    return undefined;
  }

  return itemOffset - viewPosition * (viewportSize - itemSize) + viewOffset;
}
