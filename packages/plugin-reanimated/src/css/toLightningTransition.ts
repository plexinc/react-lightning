import type { DefaultStyle } from 'react-native-reanimated/lib/typescript/hook/commonTypes';

import type { LightningElementStyle } from '@plextv/react-lightning';
import { parseTransform } from '@plextv/react-lightning-plugin-css-transform';

import { getTransitionProperty } from '../utils/getTransitionProperty';
import type { CSSStyleParts, LightningTransition, PropertyTransitions } from './types';

const TRANSFORM_KEYS = {
  translateX: 'x',
  translateY: 'y',
  scaleX: 'scaleX',
  scaleY: 'scaleY',
  rotation: 'rotation',
} as const satisfies Record<string, keyof LightningElementStyle>;

/** Every style object the CSS style drives, resting values and pseudo overrides. */
function eachStyle(parts: CSSStyleParts): Record<string, unknown>[] {
  const styles: Record<string, unknown>[] = [
    parts.style as Record<string, unknown>,
    parts.base as Record<string, unknown>,
  ];

  for (const selector in parts.pseudoStyles) {
    styles.push(
      parts.pseudoStyles[selector as keyof CSSStyleParts['pseudoStyles']] as Record<
        string,
        unknown
      >,
    );
  }

  return styles;
}

/**
 * A transform lands on the node as x / y / scale / rotation, so the transition
 * has to be set on the axes the style actually uses.
 */
function transformKeys(parts: CSSStyleParts): (keyof LightningElementStyle)[] {
  const keys = new Set<keyof LightningElementStyle>();

  for (const style of eachStyle(parts)) {
    const transform = parseTransform(style.transform as Parameters<typeof parseTransform>[0]);

    for (const key in transform) {
      const lightningKey = TRANSFORM_KEYS[key as keyof typeof TRANSFORM_KEYS];

      if (lightningKey) {
        keys.add(lightningKey);
      }
    }
  }

  return [...keys];
}

function drivenProps(parts: CSSStyleParts): string[] {
  const props = new Set<string>();

  for (const style of eachStyle(parts)) {
    for (const prop in style) {
      props.add(prop);
    }
  }

  return [...props];
}

/**
 * Maps the normalized per-property settings onto Lightning node props. A prop
 * change then animates on its own, which is what makes a CSS transition work.
 *
 * `all` only covers the props this style object sets, not every prop on the
 * element: a transition on width or height would animate layout.
 */
export function toLightningTransition(
  transitions: PropertyTransitions,
  parts: CSSStyleParts,
): LightningTransition | null {
  const result: LightningTransition = {};
  const settingsByProp = new Map(transitions);
  const all = settingsByProp.get('all');

  settingsByProp.delete('all');

  if (all) {
    for (const prop of drivenProps(parts)) {
      if (!settingsByProp.has(prop)) {
        settingsByProp.set(prop, all);
      }
    }
  }

  for (const [prop, settings] of settingsByProp) {
    if (prop === 'transform') {
      for (const key of transformKeys(parts)) {
        result[key] = settings;
      }

      continue;
    }

    result[getTransitionProperty(prop as keyof DefaultStyle)] = settings;
  }

  return Object.keys(result).length ? result : null;
}
