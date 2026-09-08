import type { DefaultStyle } from 'react-native-reanimated/lib/typescript/hook/commonTypes';

import {
  type PseudoStyles,
  type SupportedPseudoSelector,
  SUPPORTED_PSEUDO_SELECTORS,
} from './types';
import { warnOnce } from './warnOnce';

/**
 * Resolves the pseudo-selector props for the currently active states: the
 * highest-priority active selector that sets a prop wins, anything else falls
 * back to the resting value. Only props some selector mentions are returned, so
 * the caller can push (and revert) a partial style.
 */
export function resolvePseudoStyle(
  base: DefaultStyle,
  pseudoStyles: PseudoStyles,
  active: ReadonlySet<SupportedPseudoSelector>,
): DefaultStyle {
  const resolved: Record<string, unknown> = {};
  const baseStyle = base as Record<string, unknown>;

  for (const selector of SUPPORTED_PSEUDO_SELECTORS) {
    const selectorStyle = pseudoStyles[selector] as Record<string, unknown> | undefined;

    if (!selectorStyle) {
      continue;
    }

    for (const prop in selectorStyle) {
      if (active.has(selector)) {
        resolved[prop] = selectorStyle[prop];
      } else if (!(prop in resolved)) {
        resolved[prop] = baseStyle[prop];
      }
    }
  }

  for (const prop in resolved) {
    if (resolved[prop] === undefined) {
      // Lightning merges style updates, so a prop that reverts to undefined is
      // never repainted and the state would stick.
      warnOnce(
        `"${prop}" has a pseudo-selector value but no default, so it can't be reverted. Add a "default".`,
      );

      delete resolved[prop];
    }
  }

  return resolved as DefaultStyle;
}
