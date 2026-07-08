// Main-axis distance from the list's start edge to the far stage edge. Caps a
// self-measured viewport to what's on screen (horizontal reads width/x,
// vertical height/y); negative list starts (full-bleed overflow) grow it.
export function resolveVisibleMainSpan(
  horizontal: boolean | null | undefined,
  rootWidth: number,
  rootHeight: number,
  listX: number,
  listY: number,
): number {
  return horizontal ? rootWidth - listX : rootHeight - listY;
}
