import { DEFAULT_ITEM_SIZE } from './LayoutManager';

export interface ResolveCrossSizeInput {
  horizontal: boolean | null | undefined;
  /** Cross-axis size from the VL's own style (`h` for horizontal, `w` for vertical). */
  explicitCross: number | undefined;
  /** Cross-axis size of the parent VirtualList cell, when nested. */
  parentCross: number | undefined;
  /** Self-measured cross-axis size of the VL's outer element. */
  measuredOuterCross: number;
  /** Largest cross-axis content measurement reported by cells so far. */
  maxContentCross: number;
  crossPadding: number;
}

export interface ResolvedCrossSize {
  viewportCrossSize: number;
  /**
   * True when the size came from an external source (explicit style, parent
   * cell bounds, or the flex-allocated outer size) rather than from content
   * measurement or the estimate. Cells may safely pin their cross axis to a
   * definite size; pinning a content-derived one would freeze it before the
   * content gets a chance to report its real size.
   */
  isDefinite: boolean;
}

/**
 * Resolves the viewport cross-axis size for a VirtualList.
 *
 * Cross-axis priority differs by orientation. Vertical: parent/measured
 * cross is reliable (parent flex allocates column width; content sits
 * behind a FlexBoundary and can't feed back into it). Horizontal:
 * parent/measured cross is the OUTER cell's full height (title + this VL
 * + siblings) which is bigger than the cards themselves — prefer
 * content-driven `maxContentCross` and only fall back when no content
 * has measured yet. Without the asymmetry the cells oscillate as the
 * outer cell's measured height churns during scroll/focus animations.
 */
export function resolveCrossSize({
  horizontal,
  explicitCross,
  parentCross,
  measuredOuterCross,
  maxContentCross,
  crossPadding,
}: ResolveCrossSizeInput): ResolvedCrossSize {
  if (explicitCross != null && explicitCross > 0) {
    return { viewportCrossSize: explicitCross, isDefinite: true };
  }

  if (!horizontal && parentCross != null && parentCross > 0) {
    return { viewportCrossSize: parentCross, isDefinite: true };
  }

  if (!horizontal && measuredOuterCross > 0) {
    return { viewportCrossSize: measuredOuterCross, isDefinite: true };
  }

  if (maxContentCross > 0) {
    return { viewportCrossSize: maxContentCross + crossPadding, isDefinite: false };
  }

  // Horizontal cross must not come from parent/self measurement: both equal the
  // outer VL cell height (header + this list), so it ratchets unbounded.
  if (!horizontal && parentCross != null && parentCross > 0) {
    return { viewportCrossSize: parentCross, isDefinite: false };
  }

  if (!horizontal && measuredOuterCross > 0) {
    return { viewportCrossSize: measuredOuterCross, isDefinite: false };
  }

  return { viewportCrossSize: DEFAULT_ITEM_SIZE, isDefinite: false };
}
