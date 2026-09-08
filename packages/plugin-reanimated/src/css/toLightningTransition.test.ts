import { describe, expect, it } from 'vitest';

import { createCSSStyleParts } from './filterCSSStyle';
import { toLightningTransition } from './toLightningTransition';
import type { CSSStyleParts, PropertyTransitions } from './types';

const settings = { duration: 200, delay: 0, easing: 'ease' as const };

function parts(overrides: Partial<CSSStyleParts>): CSSStyleParts {
  return { ...createCSSStyleParts(), ...overrides };
}

describe('toLightningTransition', () => {
  it('renames react-native props to their lightning equivalent', () => {
    const transitions: PropertyTransitions = new Map([
      ['opacity', settings],
      ['backgroundColor', settings],
    ]);

    expect(toLightningTransition(transitions, parts({}))).toEqual({
      alpha: settings,
      color: settings,
    });
  });

  it('expands a transform onto the axes the style uses', () => {
    const transitions: PropertyTransitions = new Map([['transform', settings]]);
    const styleParts = parts({
      base: { transform: [{ translateY: 0 }, { scale: 1 }] },
    });

    expect(toLightningTransition(transitions, styleParts)).toEqual({
      y: settings,
      scaleX: settings,
      scaleY: settings,
    });
  });

  it('picks up an axis that only a pseudo state uses', () => {
    const transitions: PropertyTransitions = new Map([['transform', settings]]);
    const styleParts = parts({
      base: { transform: [{ translateY: 0 }] },
      pseudoStyles: { ':focus': { transform: [{ translateY: 10 }, { translateX: 5 }] } },
    });

    expect(Object.keys(toLightningTransition(transitions, styleParts) ?? {}).sort()).toEqual([
      'x',
      'y',
    ]);
  });

  it('expands "all" over the props the style sets, not the whole element', () => {
    const transitions: PropertyTransitions = new Map([['all', settings]]);
    const styleParts = parts({
      style: { padding: 10 },
      base: { opacity: 1 },
      pseudoStyles: { ':focus': { opacity: 0.5 } },
    });

    expect(toLightningTransition(transitions, styleParts)).toEqual({
      padding: settings,
      alpha: settings,
    });
  });

  it('lets an explicit property beat "all"', () => {
    const transitions: PropertyTransitions = new Map<string, typeof settings>([
      ['all', settings],
      ['opacity', { ...settings, duration: 50 }],
    ]);
    const styleParts = parts({ base: { opacity: 1 } });

    expect(toLightningTransition(transitions, styleParts)?.alpha?.duration).toBe(50);
  });

  it('returns null when nothing maps', () => {
    expect(toLightningTransition(new Map(), parts({}))).toBeNull();
  });
});
