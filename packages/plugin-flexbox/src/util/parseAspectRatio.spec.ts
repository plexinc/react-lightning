import { describe, expect, it } from 'vitest';

import { parseAspectRatio } from './parseAspectRatio';

describe('parseAspectRatio', () => {
  it('passes through a positive finite number', () => {
    expect(parseAspectRatio(1.5)).toBe(1.5);
  });

  it('parses a ratio string into a number', () => {
    expect(parseAspectRatio('3/2')).toBe(1.5);
    expect(parseAspectRatio('16/9')).toBeCloseTo(16 / 9);
  });

  it('parses a plain numeric string', () => {
    expect(parseAspectRatio('1.5')).toBe(1.5);
  });

  it('returns undefined for non-positive or non-finite values', () => {
    expect(parseAspectRatio(0)).toBeUndefined();
    expect(parseAspectRatio(-2)).toBeUndefined();
    expect(parseAspectRatio(Number.NaN)).toBeUndefined();
  });

  it('returns undefined for malformed strings', () => {
    expect(parseAspectRatio('abc')).toBeUndefined();
    expect(parseAspectRatio('3/0')).toBeUndefined();
    expect(parseAspectRatio('/2')).toBeUndefined();
  });
});
