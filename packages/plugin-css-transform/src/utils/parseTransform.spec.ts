import { describe, expect, it } from 'vitest';

import { parseTransform } from './parseTransform';

describe('parseTransform', () => {
  it('merges an RN transform array into one object, later parts winning', () => {
    expect(
      parseTransform([{ scale: 1.1 }, { translateX: 12 }, { translateY: '50%' }, { scaleX: 2 }]),
    ).toEqual({ scaleX: 2, scaleY: 1.1, translateX: 12, translateY: '50%' });
  });

  it('skips null parts and values', () => {
    expect(parseTransform([null as unknown as object, { rotate: null, scale: 2 }])).toEqual({
      scaleX: 2,
      scaleY: 2,
    });
  });

  it('parses a CSS transform string', () => {
    expect(parseTransform('translate(10, 20) scale(1.5) rotate(90deg)')).toEqual({
      translateX: 10,
      translateY: 20,
      scaleX: 1.5,
      scaleY: 1.5,
      rotation: Math.PI / 2,
    });
  });

  it('returns a fresh object each call', () => {
    const input = [{ scale: 1 }];

    expect(parseTransform(input)).not.toBe(parseTransform(input));
  });
});
