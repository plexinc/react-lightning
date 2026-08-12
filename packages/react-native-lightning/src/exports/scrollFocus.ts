/**
 * Whether a focus scroll should honor snapToAlignment as a deliberate placement
 * rather than just revealing the item. Only 'center'/'end' qualify: 'start' and
 * 'item' (paging) aren't real focus targets — and 'item' isn't even implemented
 * by the alignment math — so they should fall through to ensure-visible.
 */
export function usesExplicitAlignment(
  snapToAlignment: string | null | undefined,
): snapToAlignment is 'center' | 'end' {
  return snapToAlignment === 'center' || snapToAlignment === 'end';
}

/**
 * Minimal ("nearest") scroll offset that brings a child fully into view, the
 * native TV auto-scroll behavior a plain ScrollView lacks. Offsets are
 * non-positive: the content container is translated by the returned value, so
 * scrolling toward the end grows more negative. A child already in view keeps
 * the current offset instead of snapping to an edge. `margin` keeps that much
 * breathing room past the child before it counts as revealed, so the focused
 * item doesn't sit flush against the viewport edge (naturally collapses at the
 * list ends via the clamp).
 */
export function getEnsureVisibleOffset(
  viewportSize: number,
  containerSize: number,
  currentOffset: number,
  childOffset: number,
  childSize: number,
  margin = 0,
): number {
  const minOffset = Math.min(0, viewportSize - containerSize);

  const childTop = childOffset + currentOffset;
  const childBottom = childOffset + childSize + currentOffset;

  let offset = currentOffset;
  if (childTop < margin) {
    offset = margin - childOffset;
  } else if (childBottom > viewportSize - margin) {
    offset = viewportSize - margin - (childOffset + childSize);
  }

  // `|| 0` also normalizes -0 to 0.
  return Math.max(minOffset, Math.min(0, offset)) || 0;
}
