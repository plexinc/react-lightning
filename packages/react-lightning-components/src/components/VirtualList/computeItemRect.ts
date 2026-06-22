import type { ComputedLayout } from './LayoutManager';
import type { ItemLayout } from './VirtualListTypes';

/**
 * Translates a `LayoutManager` item-space layout into a scroll-space rect in
 * the content container's coordinate system — the same mapping the rendered
 * cells use (main axis shifted past the leading padding + header via
 * `itemAreaOffset`, cross axis past the cross padding). Backs the
 * `VirtualListRef.getLayout` imperative API.
 */
export function computeItemRect(
  layout: ComputedLayout,
  itemAreaOffset: number,
  paddingCross: number,
  horizontal: boolean | null | undefined,
): ItemLayout {
  const main = itemAreaOffset + layout.offset;
  const cross = paddingCross + layout.crossOffset;

  return horizontal
    ? { x: main, y: cross, width: layout.size, height: layout.crossSize }
    : { x: cross, y: main, width: layout.crossSize, height: layout.size };
}
