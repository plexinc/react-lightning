export interface FocusAnchor {
  index: number;
  cellOffset: number;
  childOffset: number;
  childSize: number;
  align: 'center' | 'end' | 'start';
  snapOffset?: number;
}

export function resolveFocusResnap(
  anchor: FocusAnchor,
  cellOffset: number,
): FocusAnchor | undefined {
  const delta = cellOffset - anchor.cellOffset;

  if (Math.abs(delta) < 1) {
    return undefined;
  }

  return { ...anchor, cellOffset, childOffset: anchor.childOffset + delta };
}

export interface FocusResnapScroll {
  anchor: FocusAnchor;
  target: number;
}

export function resolveFocusResnapScroll(
  anchor: FocusAnchor,
  cellOffset: number,
  scrollOffset: number,
  targetFor: (anchor: FocusAnchor) => number,
): FocusResnapScroll | undefined {
  const moved = resolveFocusResnap(anchor, cellOffset);
  const next = moved ?? anchor;
  const target = targetFor(next);

  if (!moved && Math.abs(target - scrollOffset) < 1) {
    return undefined;
  }

  return { anchor: next, target };
}
