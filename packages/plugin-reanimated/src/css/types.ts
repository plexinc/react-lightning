import type { AnimationSettings } from '@lightningjs/renderer';
import type { DefaultStyle } from 'react-native-reanimated/lib/typescript/hook/commonTypes';

import type { Animatable, LightningElementStyle } from '@plextv/react-lightning';

/** Cascade order, later wins. Mirrors reanimated's NATIVE_PSEUDO_SELECTORS_PRIORITY. */
export const PSEUDO_SELECTORS = [
  ':focus-within',
  ':focus',
  ':hover',
  ':active',
  ':active-deepest',
] as const;

export type PseudoSelector = (typeof PSEUDO_SELECTORS)[number];

/**
 * A TV has no pointer and no press state on the element, so only the focus
 * selectors can be resolved here.
 */
export const SUPPORTED_PSEUDO_SELECTORS = [':focus-within', ':focus'] as const;

export type SupportedPseudoSelector = (typeof SUPPORTED_PSEUDO_SELECTORS)[number];

export type PseudoStyles = Partial<Record<SupportedPseudoSelector, DefaultStyle>>;

export type LightningTransition = NonNullable<Animatable<LightningElementStyle>['transition']>;

/** Raw `transition*` props, exactly as they came off the style object. */
export type CSSTransitionProps = Record<string, unknown>;

export type CSSStyleParts = {
  /** Plain values, rendered as the element's normal style. */
  style: DefaultStyle;
  /**
   * Resting values for the props a pseudo selector touches. Held back from the
   * rendered style: those props are pushed to the node by the binding, so a
   * re-render can't clobber an active state.
   */
  base: DefaultStyle;
  pseudoStyles: PseudoStyles;
  transitionProps: CSSTransitionProps | null;
};

/** Per-property transition settings, keyed by react-native style prop or `all`. */
export type PropertyTransitions = Map<string, Partial<AnimationSettings>>;

export function hasPseudoStyles(parts: CSSStyleParts): boolean {
  for (const _selector in parts.pseudoStyles) {
    return true;
  }

  return false;
}
