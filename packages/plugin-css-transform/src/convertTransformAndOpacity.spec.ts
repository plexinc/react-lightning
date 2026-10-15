import { describe, expect, it } from 'vitest';

import { PARTIAL_STYLE } from '@plextv/react-lightning';

import {
  convertCSSStyleToLightning,
  convertTransformAndOpacity,
} from './convertCSSStyleToLightning';
import type { AllStyleProps } from './types/ReactStyle';

const transforms: unknown[] = [
  [{ translateX: 10 }],
  [{ translateY: -24.5 }],
  [{ translateX: '50%' }],
  [{ translateY: ' -100% ' }],
  [{ translate: [4, 8] }],
  [{ translate: 6 }],
  [{ scale: 1.08 }],
  [{ scale: '1.5' }],
  [{ scaleX: 2 }],
  [{ scaleY: 0.5 }],
  [{ rotate: '45deg' }],
  [{ rotate: '0.5turn' }],
  [{ rotate: '100grad' }],
  [{ rotate: '1rad' }],
  [{ rotation: 0.25 }],
  [{ matrix: [1, 0, 0, 1, 0, 0] }],
  [{ translateX: 10 }, { scale: 1.1 }, { rotate: '90deg' }],
  [{ scale: 1.1 }, { translateX: 10 }],
  [{ scale: 2 }, { scaleX: 3 }],
  [{ scaleX: 3 }, { scale: 2 }],
  [{ translateX: 5 }, { translateX: 7 }],
  [],
  { translateX: 12, scaleY: 1.2 },
  'translateX(10px) scale(1.2) rotate(30deg)',
  'translate(3, 4)',
];

const extras: Record<string, unknown>[] = [
  {},
  { opacity: 0.5 },
  { opacity: 0 },
  { opacity: '0.5' },
  { opacity: undefined },
  { alpha: 0.3 },
  { alpha: 0.3, opacity: 0.6 },
  { scaleX: 4 },
  { x: 10, y: 20 },
  { pivot: 0.5 },
  { pivotX: 0, pivotY: 1 },
  { zIndex: 2, undefinedKey: undefined },
];

function cases(): Record<PropertyKey, unknown>[] {
  const out: Record<PropertyKey, unknown>[] = [];

  for (const extra of extras) {
    out.push({ ...extra });
    out.push({ ...extra, [PARTIAL_STYLE]: true });

    for (const transform of transforms) {
      out.push({ ...extra, transform });
      out.push({ transform, ...extra, [PARTIAL_STYLE]: true });
    }
  }

  return out;
}

function snapshot(style: object | null | undefined) {
  return style
    ? { ...style, partial: (style as Record<PropertyKey, unknown>)[PARTIAL_STYLE] }
    : style;
}

describe('convertTransformAndOpacity', () => {
  it.each(cases())('matches convertCSSStyleToLightning for %o', (style) => {
    const fast = convertTransformAndOpacity(style as Record<string, unknown>);

    expect(fast).not.toBeNull();
    expect(snapshot(fast)).toStrictEqual(
      snapshot(convertCSSStyleToLightning(style as AllStyleProps)),
    );
  });

  it.each([
    { opacity: 1, display: 'none' },
    { opacity: 1, display: 'flex' },
    { transform: [{ scale: 1 }], left: 10 },
    { transform: [{ scale: 1 }], top: '5' },
    { opacity: 1, backgroundColor: '#fff' },
    { opacity: 1, width: 10 },
    { opacity: 1, borderRadius: 4 },
    { opacity: 1, borderTopLeftRadius: 4 },
    { opacity: 1, overflow: 'hidden' },
    { opacity: 1, textAlign: 'center' },
    { opacity: 1, fontWeight: '600' },
    { opacity: 1, borderColor: 'red' },
  ])('leaves %o to the full conversion', (style) => {
    expect(convertTransformAndOpacity(style)).toBeNull();
  });
});
