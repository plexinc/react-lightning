import { describe, expect, it } from 'vitest';

import { type AtlasData, FontMetrics } from './FontMetricsStore';
import { layoutText, type TextMeasureProps } from './layoutText';

// Synthetic atlas with round numbers so expectations are exact:
//   designFontSize 10, unitsPerEm 1000, ascender 800, descender -200.
//   'a'/'b' advance 10 design units, space advance 5.
const atlas: AtlasData = {
  info: { size: 10, face: 'Test' },
  common: { lineHeight: 12, base: 8 },
  lightningMetrics: {
    ascender: 800,
    descender: -200,
    lineGap: 0,
    unitsPerEm: 1000,
  },
  chars: [
    { id: 97, xadvance: 10, xoffset: 0, yoffset: 0, width: 8, height: 8 }, // a
    { id: 98, xadvance: 10, xoffset: 0, yoffset: 0, width: 8, height: 8 }, // b
    { id: 32, xadvance: 5, xoffset: 0, yoffset: 0, width: 0, height: 0 }, //  (space)
    { id: 46, xadvance: 3, xoffset: 0, yoffset: 0, width: 2, height: 2 }, // .
  ],
  kernings: [],
};

const font = new FontMetrics(atlas);

const props = (over: Partial<TextMeasureProps> = {}): TextMeasureProps => ({
  text: 'aa',
  fontSize: 20, // → fontScale 2
  letterSpacing: 0,
  lineHeight: 1,
  maxLines: 0,
  maxHeight: 0,
  wordBreak: 'break-word',
  overflowSuffix: '...',
  ...over,
});

// At fontSize 20, em scale 20/1000 = 0.02 → bareLineHeight = (800−(−200))·0.02 = 20.
const LINE_PX = 20;

describe('FontMetrics.measureText', () => {
  it('sums glyph advances in design units', () => {
    expect(font.measureText('aa', 0)).toBe(20);
    expect(font.measureText('aa aa', 0)).toBe(45); // 10+10+5+10+10
  });

  it('applies letter spacing per glyph (design units)', () => {
    expect(font.measureText('aa', 2)).toBe(24); // (10+2)+(10+2)
  });
});

describe('layoutText', () => {
  it('measures a single unconstrained line, scaling design→px', () => {
    const { width, height } = layoutText(font, props({ text: 'aa aa' }), Infinity);
    expect(width).toBe(90); // 45 design × fontScale 2
    expect(height).toBe(LINE_PX);
  });

  it('wraps to the available width and reports the tallest stack', () => {
    // maxWidth 60px → 30 design. "aa"(20) fits; +space(5)+"aa"(20)=45 > 30 → wrap.
    const { width, height } = layoutText(font, props({ text: 'aa aa' }), 60);
    expect(width).toBe(40); // widest line "aa" = 20 design × 2
    expect(height).toBe(2 * LINE_PX);
  });

  it('honours explicit newlines when unconstrained', () => {
    const { height } = layoutText(font, props({ text: 'aa\nbb\naa' }), Infinity);
    expect(height).toBe(3 * LINE_PX);
  });

  it('caps line count via maxLines', () => {
    const { height } = layoutText(font, props({ text: 'aa aa aa', maxLines: 2 }), 60);
    expect(height).toBe(2 * LINE_PX);
  });

  it('caps line count via maxHeight', () => {
    const { height } = layoutText(font, props({ text: 'aa aa aa', maxHeight: 25 }), 60);
    // floor(25 / 20) = 1 line
    expect(height).toBe(LINE_PX);
  });

  it('treats a pixel lineHeight (>3) as absolute', () => {
    const { height } = layoutText(font, props({ text: 'aa', lineHeight: 40 }), Infinity);
    expect(height).toBe(40);
  });
});
