import { describe, expect, it } from 'vitest';
import type { FontEntry, FontRegistry } from './Fonts';
import { type TextProps, layoutText, textKey } from './TextLayout';

// Every glyph is 10 px at fontSize 10, so widths are easy to reason about.
const sdfEntry: FontEntry = {
  family: 'Mono',
  type: 'sdf',
  metrics: { ascender: 800, descender: -200, lineGap: 0, unitsPerEm: 1000 },
  sdf: { size: 42, base: 38, advances: new Map(), kernings: new Map(), fallback: 42, distanceRange: 4 },
  loaded: true,
  cssFamily: 'compat-Mono',
};
const iconEntry: FontEntry = { ...sdfEntry, family: 'icons', type: 'canvas', sdf: null };

function registry(entry: FontEntry): FontRegistry {
  return {
    get: () => entry,
    cssFont: (family: string, size: number) => `${size}px ${family}`,
    measure: (_e: unknown, s: string, fontSize: number, letterSpacing: number) =>
      [...s].length * (fontSize + letterSpacing),
  } as unknown as FontRegistry;
}

const props = (over: Partial<TextProps>): TextProps => ({
  text: '',
  fontFamily: 'Mono',
  fontSize: 10,
  fontStyle: 'normal',
  textAlign: 'left',
  verticalAlign: 'top',
  letterSpacing: 0,
  lineHeight: 1.2,
  maxLines: 0,
  maxWidth: 0,
  maxHeight: 0,
  overflowSuffix: '...',
  wordBreak: 'break-word',
  contain: 'none',
  offsetY: 0,
  ...over,
});

describe('layoutText', () => {
  it('wraps on spaces at maxWidth', () => {
    const l = layoutText(registry(sdfEntry), props({ text: 'aaa bbb ccc', maxWidth: 75 }));

    expect(l.lines.map((x) => x.text)).toEqual(['aaa bbb', 'ccc']);
    expect(l.width).toBe(70);
    expect(l.height).toBeCloseTo(24, 5);
  });

  it('truncates the last allowed line with the suffix', () => {
    const l = layoutText(registry(sdfEntry), props({ text: 'aaa bbb ccc ddd', maxWidth: 75, maxLines: 1 }));

    expect(l.lines).toHaveLength(1);
    expect(l.lines[0].text.endsWith('...')).toBe(true);
    expect(l.lines[0].width).toBeLessThanOrEqual(75);
  });

  it('centres lines inside the widest one', () => {
    const l = layoutText(registry(sdfEntry), props({ text: 'aaaa\nbb', textAlign: 'center' }));

    expect(l.lines[1].x).toBe(10);
  });

  it('puts the SDF baseline half the distance range above BMFont base', () => {
    const l = layoutText(registry(sdfEntry), props({ text: 'x', fontSize: 42, lineHeight: 1 }));

    expect(l.hanging).toBe(false);
    expect(l.baseline).toBeCloseTo(36, 5);
    expect(l.lines[0].y).toBe(0);
  });

  it('draws canvas fonts on a hanging baseline at whole pixels', () => {
    const l = layoutText(registry(iconEntry), props({ text: 'x', fontFamily: 'icons', fontSize: 24, lineHeight: 25 }));

    expect(l.hanging).toBe(true);
    expect(l.baseline).toBe(0);
    expect(l.lines[0].y).toBe(1);
  });
});

describe('textKey', () => {
  it('changes with wordBreak', () => {
    expect(textKey(props({ text: 'a' }))).not.toBe(textKey(props({ text: 'a', wordBreak: 'break-all' })));
  });
});
