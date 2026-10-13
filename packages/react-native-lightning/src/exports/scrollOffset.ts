export function isAxisMeasured(viewportSize: number, contentSize: number): boolean {
  return viewportSize > 0 && contentSize > 0;
}

export function clampScrollOffset(
  offset: number,
  viewportSize: number,
  contentSize: number,
): number {
  if (!isAxisMeasured(viewportSize, contentSize)) {
    return offset;
  }

  // `|| 0` also normalizes -0 to 0.
  return Math.max(Math.min(0, viewportSize - contentSize), Math.min(0, offset)) || 0;
}

export function getAxisOffset(
  viewportSize: number,
  containerSize: number,
  childOffset: number,
  childSize: number,
  snapToAlignment: 'center' | 'end' | 'start',
): number {
  if (!isAxisMeasured(viewportSize, containerSize)) {
    return -childOffset || 0;
  }

  const scrollableSize = containerSize - viewportSize;
  let offset = 0;

  switch (snapToAlignment) {
    case 'start':
      offset = Math.min(childOffset, scrollableSize);
      break;
    case 'center': {
      const itemMidPoint = childOffset + childSize / 2;
      const halfViewportSize = viewportSize / 2;

      offset = Math.min(Math.max(itemMidPoint - halfViewportSize, 0), scrollableSize);
      break;
    }

    case 'end':
      offset = Math.max(Math.min(childOffset + childSize - viewportSize, scrollableSize), 0);
      break;
  }

  return Math.max(0, Math.min(offset, containerSize)) * -1;
}
