import type { DefaultStyle } from 'react-native-reanimated/lib/typescript/hook/commonTypes';

import {
  type CSSStyleParts,
  PSEUDO_SELECTORS,
  type SupportedPseudoSelector,
  SUPPORTED_PSEUDO_SELECTORS,
} from './types';
import { warnOnce } from './warnOnce';

const TRANSITION_PROPS: ReadonlySet<string> = new Set([
  'transition',
  'transitionProperty',
  'transitionDuration',
  'transitionTimingFunction',
  'transitionDelay',
  'transitionBehavior',
]);

const ANIMATION_PROPS: ReadonlySet<string> = new Set([
  'animation',
  'animationName',
  'animationDuration',
  'animationTimingFunction',
  'animationDelay',
  'animationIterationCount',
  'animationDirection',
  'animationFillMode',
  'animationPlayState',
]);

const SUPPORTED: ReadonlySet<string> = new Set(SUPPORTED_PSEUDO_SELECTORS);
const KNOWN: ReadonlySet<string> = new Set(PSEUDO_SELECTORS);

function isPseudoSelectorValue(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const keys = Object.keys(value);

  return keys.length > 0 && keys.every((key) => key === 'default' || key.startsWith(':'));
}

export function createCSSStyleParts(style: DefaultStyle = {}): CSSStyleParts {
  return { style, base: {}, pseudoStyles: {}, transitionProps: null };
}

/**
 * Moves the resting value of every pseudo-selector prop out of the rendered
 * style. Runs once the whole style array is folded, since a later style object
 * can turn a plain prop into a pseudo one.
 */
export function finalizeCSSStyleParts(parts: CSSStyleParts): CSSStyleParts {
  const style = parts.style as Record<string, unknown>;
  const base = parts.base as Record<string, unknown>;

  for (const selector in parts.pseudoStyles) {
    const selectorStyle = parts.pseudoStyles[selector as SupportedPseudoSelector] as Record<
      string,
      unknown
    >;

    for (const prop in selectorStyle) {
      if (prop in style) {
        base[prop] = style[prop];
        delete style[prop];
      }
    }
  }

  return parts;
}

/**
 * Splits one style object into resting values, pseudo-selector overrides and
 * transition settings, accumulating into `parts` so a style array folds into a
 * single result. Mirrors reanimated's filterCSSAndStyleProperties.
 */
export function filterCSSStyle(style: Record<string, unknown>, parts: CSSStyleParts): void {
  for (const prop in style) {
    const value = style[prop];

    // An explicit undefined reads as "not set", same as reanimated.
    if (value === undefined) {
      continue;
    }

    if (TRANSITION_PROPS.has(prop)) {
      // The `transition` shorthand drops everything set before it.
      if (prop === 'transition') {
        parts.transitionProps = { transition: value };
      } else {
        (parts.transitionProps ??= {})[prop] = value;
      }

      continue;
    }

    if (ANIMATION_PROPS.has(prop)) {
      warnOnce(`CSS animations are not supported on Lightning yet, ignoring "${prop}".`);

      continue;
    }

    if (isPseudoSelectorValue(value)) {
      if (value.default !== undefined) {
        (parts.style as Record<string, unknown>)[prop] = value.default;
      }

      for (const selector in value) {
        if (selector === 'default') {
          continue;
        }

        if (!SUPPORTED.has(selector)) {
          warnOnce(
            KNOWN.has(selector)
              ? `Pseudo selector "${selector}" needs pointer or press state, which Lightning doesn't have. Ignoring it.`
              : `Pseudo selector "${selector}" is not supported on Lightning, ignoring it.`,
          );

          continue;
        }

        const pseudoStyle = (parts.pseudoStyles[selector as SupportedPseudoSelector] ??= {});

        (pseudoStyle as Record<string, unknown>)[prop] = value[selector];
      }

      continue;
    }

    (parts.style as Record<string, unknown>)[prop] = value;
  }
}
