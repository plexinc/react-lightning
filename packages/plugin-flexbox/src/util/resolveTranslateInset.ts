export type HorizontalInset = { edge: 'left' | 'right'; value: number };
export type VerticalInset = { edge: 'top' | 'bottom'; value: number };

// translateX/Y shift a node's laid-out position by writing a yoga inset. A node
// anchored via `right`/`bottom` must translate that same edge: writing the
// opposite edge over-constrains yoga (left+width wins over right) and snaps the
// node across the container.
export function resolveHorizontalTranslate(
  isRightAnchored: boolean,
  baseLeft: number,
  baseRight: number,
  translateX: number,
): HorizontalInset {
  return isRightAnchored
    ? { edge: 'right', value: baseRight - translateX }
    : { edge: 'left', value: baseLeft + translateX };
}

export function resolveVerticalTranslate(
  isBottomAnchored: boolean,
  baseTop: number,
  baseBottom: number,
  translateY: number,
): VerticalInset {
  return isBottomAnchored
    ? { edge: 'bottom', value: baseBottom - translateY }
    : { edge: 'top', value: baseTop + translateY };
}
