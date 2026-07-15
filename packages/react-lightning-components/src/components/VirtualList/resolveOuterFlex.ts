import type { LightningViewElementStyle } from '@plextv/react-lightning';

/**
 * Main-axis flex for the list's outer element. flexBasis 0 keeps the content plane's height
 * from becoming ancestor flex bases (a grow-only ancestor locks the chain at content height).
 */
export function resolveOuterFlex(
  horizontal: boolean | null | undefined,
): LightningViewElementStyle {
  if (horizontal) {
    return {};
  }

  return {
    flexBasis: 0,
    flexGrow: 1,
    flexShrink: 1,
  };
}
