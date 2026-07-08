export interface FocusScrollTargetParams {
  /** Focused child's main-axis offset within the content container. */
  childOffset: number;
  /** Focused child's main-axis size. */
  childSize: number;
  viewportSize: number;
  snapToAlignment: 'start' | 'center' | 'end';
  /** Main-axis start padding (scroll margin). */
  paddingStart: number;
  /** Main-axis end padding (scroll margin). */
  paddingEnd: number;
  /** Header main-axis size, excluding padding. */
  headerSize: number;
  /** Footer main-axis size, excluding padding. */
  footerSize: number;
  maxScroll: number;
}

// Scroll offset that brings the focused child into the requested alignment.
//
// The edge snap keeps a real header/footer fully visible when the target lands
// inside it. It keys off the header/footer size, NOT the leading/trailing
// padding: a large centering padding (the switch-user row pads by ~half the
// viewport on each side) would otherwise pull every near-start target to 0 and
// every near-end target to maxScroll, so centering only worked in the middle.
export function resolveFocusScrollTarget({
  childOffset,
  childSize,
  viewportSize,
  snapToAlignment,
  paddingStart,
  paddingEnd,
  headerSize,
  footerSize,
  maxScroll,
}: FocusScrollTargetParams): number {
  let target: number;

  switch (snapToAlignment) {
    case 'center':
      target = childOffset + childSize / 2 - viewportSize / 2;
      break;
    case 'end':
      target = childOffset + childSize - viewportSize + paddingEnd;
      break;
    default:
      target = childOffset - paddingStart;
      break;
  }

  if (target > 0 && target <= headerSize) {
    return 0;
  }

  if (target < maxScroll && target >= maxScroll - footerSize) {
    return maxScroll;
  }

  return target;
}
