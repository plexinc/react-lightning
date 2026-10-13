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
