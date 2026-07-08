import { describe, expect, it } from 'vitest';

import { convertCSSStyleToLightning } from './convertCSSStyleToLightning';

describe('convertCSSStyleToLightning border radius', () => {
  it('passes a uniform borderRadius through unchanged', () => {
    expect(convertCSSStyleToLightning({ borderRadius: 8 })?.borderRadius).toBe(
      8,
    );
  });

  it('expands a single corner longhand into a [tl, tr, br, bl] array', () => {
    expect(
      convertCSSStyleToLightning({ borderTopRightRadius: 8 })?.borderRadius,
    ).toEqual([0, 8, 0, 0]);
  });

  it('maps logical start/end corners onto physical corners (LTR)', () => {
    expect(
      convertCSSStyleToLightning({
        borderTopEndRadius: 8,
        borderBottomStartRadius: 8,
      })?.borderRadius,
    ).toEqual([0, 8, 0, 8]);
  });

  it('uses the uniform borderRadius as the base for unspecified corners', () => {
    expect(
      convertCSSStyleToLightning({ borderRadius: 4, borderTopEndRadius: 8 })
        ?.borderRadius,
    ).toEqual([4, 8, 4, 4]);
  });

  it('drops the per-corner longhands from the output', () => {
    const result = convertCSSStyleToLightning({
      borderTopEndRadius: 8,
    }) as Record<string, unknown>;
    expect(result.borderTopEndRadius).toBeUndefined();
  });
});
