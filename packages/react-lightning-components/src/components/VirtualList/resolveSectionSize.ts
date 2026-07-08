// Header/footer main-axis size. Measured content wins over the caller's
// estimate (`listHeaderSize`/`listFooterSize`), which now only bridges the
// gap before the section has laid out. No component reserves no space.
export function resolveSectionSize(
  hasComponent: boolean,
  measuredSize: number,
  fallbackSize: number,
): number {
  if (!hasComponent) {
    return 0;
  }

  return measuredSize > 0 ? measuredSize : fallbackSize;
}
