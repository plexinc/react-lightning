import { describe, expect, it } from 'vitest';

import { isTranslateSettled } from './isTranslateSettled';

describe('isTranslateSettled', () => {
  it('settles when there is no transform', () => {
    expect(isTranslateSettled(undefined, 0, 0)).toBe(true);
    expect(isTranslateSettled({ x: 0 }, 0, 0)).toBe(true);
  });

  it('is unsettled while a pixel translateX is not yet folded into the position', () => {
    // Drawer: left 0, translateX -452 → final x -452. First layout is still 0.
    const style = { x: 0, transform: { translateX: -452 } };
    expect(isTranslateSettled(style, 0, 0)).toBe(false);
  });

  it('settles once the position reflects the pixel translateX', () => {
    const style = { x: 0, transform: { translateX: -452 } };
    expect(isTranslateSettled(style, -452, 0)).toBe(true);
  });

  it('settles for a zero translate', () => {
    expect(
      isTranslateSettled({ x: 10, transform: { translateX: 0 } }, 10, 0),
    ).toBe(true);
  });

  it('does not gate percentage translates (not resolvable from base)', () => {
    const style = { x: 0, transform: { translateX: '-100%' as const } };
    expect(isTranslateSettled(style, 0, 0)).toBe(true);
  });

  it('does not gate when the base edge is unknown (e.g. right-anchored)', () => {
    const style = { transform: { translateX: -452 } };
    expect(isTranslateSettled(style, 0, 0)).toBe(true);
  });

  it('handles translateY the same way', () => {
    const style = { y: 0, transform: { translateY: -100 } };
    expect(isTranslateSettled(style, 0, 0)).toBe(false);
    expect(isTranslateSettled(style, 0, -100)).toBe(true);
  });
});
