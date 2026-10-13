import { describe, expect, it } from 'vitest';

import { getExitTimeout, takeExitTranslate } from './detachedExit';

const box = { x: 1248, y: 32, w: 640, h: 1016 };

describe('takeExitTranslate', () => {
  it('turns a translate into an x target relative to the current position', () => {
    const style = { transform: { translateX: 768 } };

    expect(takeExitTranslate(style, box, { translateX: 0 })).toEqual({ x: 2016 });
    expect(style).toEqual({});
  });

  it('subtracts the translate already applied to the node', () => {
    const style = { transform: { translateY: 100 } };

    expect(takeExitTranslate(style, box, { translateY: 40 })).toEqual({ y: 92 });
  });

  it('resolves percentages against the node size', () => {
    const style = { transform: { translateX: '-50%', translateY: '10%' } };

    const targets = takeExitTranslate(style, box, undefined);

    expect(targets?.x).toBe(928);
    expect(targets?.y).toBeCloseTo(133.6);
  });

  it('leaves a style without a transform alone', () => {
    const style = { alpha: 0 } as { alpha: number; transform?: undefined };

    expect(takeExitTranslate(style, box, undefined)).toBeNull();
    expect(style).toEqual({ alpha: 0 });
  });
});

describe('getExitTimeout', () => {
  it('waits for the longest transition plus a grace period', () => {
    expect(getExitTimeout({ x: { duration: 400 }, alpha: { duration: 200, delay: 300 } })).toBe(
      600,
    );
  });

  it('falls back to the grace period with nothing to animate', () => {
    expect(getExitTimeout({})).toBe(100);
  });
});
