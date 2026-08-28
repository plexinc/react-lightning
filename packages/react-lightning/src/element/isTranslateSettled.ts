/**
 * How many unsettled layout passes a withheld node waits through before being
 * revealed anyway. {@link isTranslateSettled} only detects the base + delta
 * case, so a translate resolved some other way never settles — the bound stops
 * that from stranding the node invisible.
 */
export const MAX_UNSETTLED_LAYOUTS = 3;

type TranslatableStyle = {
  x?: number;
  y?: number;
  transform?: {
    translateX?: number | string;
    translateY?: number | string;
  };
};

/**
 * A withheld node reveals on its first layout, but a pixel translate transform
 * is resolved off the node's base position and so lands a layout pass later —
 * the first layout still holds the pre-transform origin. Returns false while
 * such a translate hasn't been folded into the position yet, so the reveal can
 * wait for the pass that has (avoids painting the node at its untransformed
 * origin for a frame).
 *
 * Only left/top-anchored pixel translates are detectable here (final position =
 * base + delta). Percentage translates and right/bottom anchoring aren't, and
 * fall through to the normal first-layout reveal.
 */
export function isTranslateSettled(
  style: TranslatableStyle | null | undefined,
  nodeX: number,
  nodeY: number,
): boolean {
  const transform = style?.transform;

  if (!transform) {
    return true;
  }

  const { translateX, translateY } = transform;

  if (
    typeof translateX === 'number' &&
    translateX !== 0 &&
    typeof style?.x === 'number' &&
    nodeX !== style.x + translateX
  ) {
    return false;
  }

  if (
    typeof translateY === 'number' &&
    translateY !== 0 &&
    typeof style?.y === 'number' &&
    nodeY !== style.y + translateY
  ) {
    return false;
  }

  return true;
}
