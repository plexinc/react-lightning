import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AllStyleProps } from './types/ReactStyle';
import { convertCSSStyleToLightning } from './convertCSSStyleToLightning';

// The return type is the view/image/text union; the text-only keys these specs
// assert on aren't on the base, so read results through a loose record.
const convert = (style: AllStyleProps): Record<string, unknown> =>
  convertCSSStyleToLightning(style) as Record<string, unknown>;

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

describe('convertCSSStyleToLightning fontWeight', () => {
  it('passes a numeric weight through unchanged', () => {
    expect(convert({ fontWeight: 300 }).fontWeight).toBe(300);
  });

  it('parses a numeric string weight into a number', () => {
    expect(convert({ fontWeight: '600' }).fontWeight).toBe(600);
  });

  it('preserves keyword weights', () => {
    expect(convert({ fontWeight: 'bold' }).fontWeight).toBe('bold');
    expect(convert({ fontWeight: 'normal' }).fontWeight).toBe('normal');
    expect(convert({ fontWeight: 'lighter' }).fontWeight).toBe('lighter');
  });
});

describe('convertCSSStyleToLightning textAlign', () => {
  afterEach(() => vi.restoreAllMocks());

  it('passes renderer-supported alignments through', () => {
    for (const value of ['left', 'center', 'right'] as const) {
      expect(convert({ textAlign: value }).textAlign).toBe(value);
    }
  });

  it("maps 'auto' to left", () => {
    expect(convert({ textAlign: 'auto' }).textAlign).toBe('left');
  });

  it("warns and falls back to left for 'justify'", () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(convert({ textAlign: 'justify' }).textAlign).toBe('left');
    expect(warn).toHaveBeenCalled();
  });
});

describe('convertCSSStyleToLightning text shadows', () => {
  afterEach(() => vi.restoreAllMocks());

  it('drops the RN text-shadow props and warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = convertCSSStyleToLightning({
      textShadowColor: 'red',
      textShadowOffset: { width: 1, height: 1 },
      textShadowRadius: 4,
    }) as Record<string, unknown>;

    expect(result.textShadowColor).toBeUndefined();
    expect(result.textShadowOffset).toBeUndefined();
    expect(result.textShadowRadius).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });

  it('no longer converts shadowColor into a renderer shadow', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = convertCSSStyleToLightning({
      shadowColor: 'red',
    }) as Record<string, unknown>;

    expect(result.shadowColor).toBeUndefined();
    expect(warn).toHaveBeenCalled();
  });
});
